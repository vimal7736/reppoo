import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const meta = user.user_metadata ?? {};

  // Service role client — bypasses RLS for org insert + profile update
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /* ── Invited user — link to existing org ─────────────────── */
  if (meta.org_id) {
    await admin
      .from("profiles")
      .upsert({
        id:        user.id,
        org_id:    meta.org_id,
        full_name: meta.full_name ?? "",
        job_title: meta.job_title ?? null,
        phone:     meta.user_phone ?? null,
        email:     user.email,
      }, { onConflict: 'id' });

    return NextResponse.json({ success: true, redirect: "/dashboard" });
  }

  /* ── New signup — create org + link profile ──────────────── */
  const { data: existing } = await admin
    .from("profiles")
    .select("org_id, full_name, email")
    .eq("id", user.id)
    .single();

  if (existing?.org_id) {
    // If profile exists but is missing metadata, sync it now
    if (!existing.full_name || !existing.email) {
      await admin
        .from("profiles")
        .update({
          full_name: existing.full_name || meta.full_name || "",
          email:     existing.email     || user.email,
        })
        .eq("id", user.id);
    }
    return NextResponse.json({ success: true, redirect: "/dashboard" });
  }

  // ── Join requester — no org_name means they used domain discovery ──────────
  if (!meta.org_name) {
    await admin.from("profiles").upsert({
      id:        user.id,
      full_name: (meta.full_name as string) ?? "",
      email:     user.email,
    }, { onConflict: "id" });
    return NextResponse.json({ success: true, redirect: "/waiting-approval" });
  }

  const orgName = (meta.org_name as string) || "My Organisation";

  // Auto-derive discovery_domain from website
  let discoveryDomain: string | null = null;
  if (meta.org_discovery_domain) {
    discoveryDomain = (meta.org_discovery_domain as string).toLowerCase().replace(/^www\./, "");
  } else if (meta.org_website) {
    try {
      const url = (meta.org_website as string).startsWith("http")
        ? meta.org_website as string
        : `https://${meta.org_website}`;
      discoveryDomain = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch { discoveryDomain = null; }
  }

  let org: { id: string } | null = null;
  const { data: fullOrg, error: fullErr } = await admin
    .from("organisations")
    .insert({
      name:             orgName,
      slug:             generateSlug(orgName),
      org_email:        meta.org_email           ?? null,
      phone:            meta.org_phone           ?? null,
      website:          meta.org_website         ?? null,
      company_number:   meta.org_company_number  ?? null,
      vat_number:       meta.org_vat_number      ?? null,
      industry:         meta.org_industry        ?? null,
      address_line1:    meta.org_address_line1   ?? null,
      address_line2:    meta.org_address_line2   ?? null,
      city:             meta.org_city            ?? null,
      county:           meta.org_county          ?? null,
      postcode:         meta.org_postcode        ?? null,
      country:          meta.org_country         ?? "GB",
      tier:             "free",
      seats_limit:      1,
      bills_limit:      1,
      ai_tips_limit:    0,
      ai_tips_used:     0,
      pdf_reports_limit: 1,
      pdf_reports_used:  0,
      usage_reset_at:   new Date().toISOString(),
      discovery_domain: discoveryDomain,
      allow_discovery:  discoveryDomain ? true : false,
    })
    .select("id")
    .single();

  if (!fullErr && fullOrg) {
    org = fullOrg;
  } else {
    // Columns not yet added — fall back to minimal insert so signup never breaks
    const { data: minOrg } = await admin
      .from("organisations")
      .insert({
        name:        orgName,
        slug:        generateSlug(orgName),
        industry:    meta.org_industry ?? null,
        tier:        "free",
        seats_limit: 1,
      })
      .select("id")
      .single();
    org = minOrg;
  }

  if (!org) {
    console.error("Org creation failed entirely");
    return NextResponse.json({ error: "org_failed" }, { status: 500 });
  }

  await admin
    .from("profiles")
    .upsert({
      id:        user.id,
      org_id:    org.id,
      role:      "owner",
      full_name: meta.full_name  ?? "",
      email:     user.email,
    }, { onConflict: 'id' });

  // ── Send Welcome Email (Non-blocking) ──
  if (meta.org_email) {
    sendWelcomeEmail({
      to: meta.org_email,
      orgName: orgName,
      adminName: (meta.full_name as string) || "Admin",
    });
  }

  return NextResponse.json({ success: true, redirect: "/dashboard" });
}
