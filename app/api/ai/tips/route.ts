import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";



export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // ── Check + enforce AI tips limit ────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organisations(ai_tips_limit, ai_tips_used, usage_reset_at)")
    .eq("id", user.id)
    .single();

  const orgId = profile?.org_id;
  const orgData = (Array.isArray(profile?.organisations) ? profile?.organisations[0] : profile?.organisations) as {
    ai_tips_limit: number;
    ai_tips_used: number;
    usage_reset_at: string;
  } | null;

  if (orgId && orgData) {
    const admin = createAdminClient();
    let used = orgData.ai_tips_used ?? 0;
    const limit = orgData.ai_tips_limit ?? 0;

    // Monthly reset: if usage_reset_at is more than 30 days ago, reset counter
    const resetAt = new Date(orgData.usage_reset_at);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (resetAt < thirtyDaysAgo) {
      await admin.from("organisations").update({ ai_tips_used: 0, usage_reset_at: new Date().toISOString() }).eq("id", orgId);
      used = 0;
    }

    if (used >= limit) {
      return NextResponse.json(
        { error: `AI tip limit reached (${limit}/month on your plan). Upgrade to get more AI insights.`, limitReached: true },
        { status: 403 }
      );
    }
  }

  let ytdCo2 = 0;
  let annualTarget = 5000;
  let reductionPct = 7;
  let billTypes: string[] = [];
  let sbtiPathway = "1.5c";

  try {
    const body = await request.json();
    ytdCo2 = body.ytdCo2 || 0;
    annualTarget = body.annualTarget || 5000;
    reductionPct = body.reductionPct || 7;
    billTypes = body.billTypes || [];
    sbtiPathway = body.sbtiPathway || "1.5c";
  } catch (e) {
    // Keep defaults
  }

  const token = process.env.GROK_API_KEY;
  
  // Safe check for unconfigured token -> immediate localized response
  if (!token || token === "xai-your_api_key_here") {
    console.log("[AI TIPS] Grok API key not configured.");
    return NextResponse.json({ 
      error: "AI is not configured. Please add GROK_API_KEY."
    }, { status: 500 });
  }

  try {
    const prompt = `You are a UK corporate carbon reduction strategist. An organisation has emitted ${ytdCo2}kg CO2 year-to-date against a target of ${annualTarget}kg (${reductionPct}% annual reduction, SBTi ${sbtiPathway} pathway). Their emission sources include: ${billTypes.join(", ") || "general operations"}. Give ONE specific, actionable carbon reduction tip under 200 characters. Be concrete with numbers. No preamble.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const grokResponse = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          { role: "system", content: "You are a concise UK corporate sustainability advisor. Respond with exactly one actionable tip. Keep responses under 200 characters." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.warn("[AI TIPS] Grok API returned error:", errorText);
      return NextResponse.json({ 
        error: "AI API error: " + errorText
      }, { status: 500 });
    }

    const result = await grokResponse.json();
    const tip = result.choices?.[0]?.message?.content || "No tip generated.";

    // Increment usage counter
    if (orgId) {
      const admin = createAdminClient();
      const { error: rpcError } = await admin.rpc("increment_ai_tips_used", { org_id: orgId });
      if (rpcError) {
        await admin.from("organisations").update({ ai_tips_used: (orgData?.ai_tips_used ?? 0) + 1 }).eq("id", orgId);
      }
    }

    return NextResponse.json({ 
      tip: tip.trim(),
      remaining: orgData ? (orgData.ai_tips_limit ?? 0) - ((orgData.ai_tips_used ?? 0) + 1) : null
    });

  } catch (err: any) {
    console.warn("[AI TIPS] Connection failed:", err);
    return NextResponse.json({ 
      error: "AI connection failed: " + err.message
    }, { status: 500 });
  }
}
