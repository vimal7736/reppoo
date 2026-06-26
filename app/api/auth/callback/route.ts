import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const user = data.user;
  const meta = user.user_metadata ?? {};

  // Service role client — bypasses RLS for org insert + profile update
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const inviteOrgId =
    (meta.org_id as string | undefined) ??
    (meta.pending_org_id as string | undefined);

  if (inviteOrgId) {
    const pendingInvite = Boolean(meta.pending_org_id);

    if (pendingInvite) {
      const { data: org } = await admin
        .from("organisations")
        .select("seats_limit")
        .eq("id", inviteOrgId)
        .single();

      const { count: memberCount } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", inviteOrgId);

      const seatsLimit = (org as { seats_limit?: number } | null)?.seats_limit ?? 1;
      if ((memberCount ?? 0) >= seatsLimit) {
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...(meta as Record<string, unknown>), pending_org_id: null, pending_full_name: null },
        });
        return NextResponse.redirect(`${origin}${next}?invite=seat_limit`);
      }
    }

    await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          org_id: inviteOrgId,
          full_name:
            (meta.full_name as string | undefined) ??
            (meta.pending_full_name as string | undefined) ??
            undefined,
          job_title: (meta.job_title as string | undefined) ?? null,
          phone: (meta.user_phone as string | undefined) ?? null,
          email: user.email,
        },
        { onConflict: "id" }
      );

    if (pendingInvite) {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(meta as Record<string, unknown>), pending_org_id: null, pending_full_name: null },
      });
    }

    const hasSeenTour = meta.has_seen_tour === true;
    const finalNext = (next === "/dashboard" && !hasSeenTour) ? "/upload" : next;
    return NextResponse.redirect(`${origin}${finalNext}`);
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
    const hasSeenTour = meta.has_seen_tour === true;
    const finalNext = (next === "/dashboard" && !hasSeenTour) ? "/upload" : next;
    return NextResponse.redirect(`${origin}${finalNext}`);
  }

  // ── Join requester — no org_name means they used domain discovery ──────────
  // They already have an access_request row; just ensure a minimal profile
  // exists (no org_id) and send them to the waiting-approval screen.
  if (!meta.org_name) {
    await admin.from("profiles").upsert({
      id:        user.id,
      full_name: (meta.full_name as string) ?? "",
      email:     user.email,
    }, { onConflict: "id" });
    return NextResponse.redirect(`${origin}/waiting-approval`);
  }

  const orgName = (meta.org_name as string) || "My Organisation";

  // Try full insert with all fields; fall back to minimal if extra columns don't exist yet
  let org: { id: string } | null = null;

  // Auto-derive discovery_domain from website so future signups can find this org
  // Prefer the directly typed domain from signup; fall back to deriving from website URL
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
    return NextResponse.redirect(`${origin}/login?error=org_failed`);
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

  const hasSeenTour = meta.has_seen_tour === true;
  const finalNext = (next === "/dashboard" && !hasSeenTour) ? "/upload" : next;
  return NextResponse.redirect(`${origin}${finalNext}`);
}
