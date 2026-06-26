import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * POST /api/bills/upload
 * Accepts a PDF file (FormData), uploads it to Supabase Storage.
 * Returns the storage path and a signed URL for Mindee to read.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Rate limiting
  const { success } = await checkRateLimit("upload", user.id);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again in a minute." }, { status: 429 });
  }

  // Get org_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organisations(bills_limit, ai_tips_used, usage_reset_at)")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  // Parse the uploaded file from FormData
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const billType = formData.get("bill_type") as string;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate: PDF or Images, max 10 MB
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPEG, PNG, and WebP files are accepted" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
  }

  // ── Bill limit enforcement ────────────────────────────────────────────────
  const orgData = (Array.isArray(profile.organisations) ? profile.organisations[0] : profile.organisations) as {
    bills_limit: number;
    usage_reset_at: string;
  } | null;

  const billsLimit = orgData?.bills_limit ?? 1;

  // Monthly reset: if usage_reset_at is older than 30 days, it will have been
  // reset by the webhook. Count bills uploaded since last reset.
  const resetAt = orgData?.usage_reset_at ? new Date(orgData.usage_reset_at) : new Date(0);

  const { count: billCount } = await supabase
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .gte("created_at", resetAt.toISOString());

  if ((billCount ?? 0) >= billsLimit) {
    return NextResponse.json(
      { error: `Bill limit reached (${billsLimit} bills on your current plan). Upgrade to upload more.` },
      { status: 403 }
    );
  }

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  // Store as: bills/{org_id}/{timestamp}_{filename}
  const fileName = `${profile.org_id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("bills")
    .upload(fileName, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Create a signed URL (valid for 1 hour) so Mindee can read the file
  const { data: signedUrl } = await supabase.storage
    .from("bills")
    .createSignedUrl(fileName, 3600);

  return NextResponse.json({
    storagePath: fileName,
    signedUrl: signedUrl?.signedUrl ?? null,
  });
}
