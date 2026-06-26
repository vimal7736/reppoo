import { requireSuperadmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/orgs?search=&tier=&detail=<id>
 * If `detail` param is provided, returns full org detail with members (NO bills — use /api/admin/orgs/bills for paginated bills).
 * Otherwise returns all organisations with user count and bill count.
 */
export async function GET(request: NextRequest) {
  const result = await requireSuperadmin();
  if ("error" in result) return result.error;
  const admin = result.admin;

  const { searchParams } = new URL(request.url);
  const detailId = searchParams.get("detail");

  // Column sets — with and without `status` for DB compatibility
  const detailCols = "id, name, tier, status, created_at, stripe_customer_id, seats_limit";
  const detailColsFallback = "id, name, tier, created_at, stripe_customer_id, seats_limit";
  const listCols = "id, name, tier, status, created_at";
  const listColsFallback = "id, name, tier, created_at";

  /* ── Detail mode ────────────────────────────────────────── */
  if (detailId) {
    let orgRes: any = await admin.from("organisations").select(detailCols).eq("id", detailId).single();
    if (orgRes.error && orgRes.error.message?.includes("status")) {
      orgRes = await admin.from("organisations").select(detailColsFallback).eq("id", detailId).single();
    }

    const org = orgRes.data;
    if (!org) return NextResponse.json({ org: null });

    const [profilesRes, billsMetaRes] = await Promise.all([
      admin.from("profiles").select("id, full_name, email, role, created_at").eq("org_id", detailId).order("created_at", { ascending: false }),
      admin.from("bills").select("co2_kg", { count: "exact" }).eq("org_id", detailId),
    ]);

    const memberProfiles = (profilesRes.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      role: string;
      created_at: string;
    }>;
    const missingEmailMembers = memberProfiles.filter((profile) => !profile.email);

    const fallbackEmails = new Map<string, string>();
    if (missingEmailMembers.length > 0) {
      const authResults = await Promise.all(
        missingEmailMembers.map(async (profile) => {
          const { data } = await admin.auth.admin.getUserById(profile.id);
          return { id: profile.id, email: data.user?.email ?? "" };
        })
      );

      for (const entry of authResults) {
        if (entry.email) fallbackEmails.set(entry.id, entry.email);
      }
    }

    const members  = memberProfiles.map((p) => ({
      ...p, full_name: p.full_name ?? "Unknown", email: p.email ?? fallbackEmails.get(p.id) ?? "",
    }));
    const totalCo2 = (billsMetaRes.data ?? []).reduce((s: number, b: { co2_kg: number | null }) => s + (b.co2_kg ?? 0), 0);

    return NextResponse.json({
      org: {
        ...org,
        status: (org as Record<string, unknown>).status ?? "active",
        user_count: members.length,
        bill_count: billsMetaRes.count ?? 0,
        total_co2_kg: totalCo2,
        members,
        // bills are NOT included here — fetch from GET /api/admin/orgs/bills?org_id=<id>
      },
    });
  }

  /* ── List mode ──────────────────────────────────────────── */
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("page_size") ?? "10"));
  const search = searchParams.get("search")?.trim() ?? "";
  const tier = searchParams.get("tier") ?? "";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin.from("organisations").select(listCols, { count: "exact" }).order("created_at", { ascending: false });
  if (search) query = query.ilike("name", `%${search}%`);
  if (tier && tier !== "all") query = query.eq("tier", tier);

  query = query.range(from, to);

  let orgsRes: any = await query;

  // Fallback if status column doesn't exist
  if (orgsRes.error && orgsRes.error.message?.includes("status")) {
    let fallbackQuery = admin.from("organisations").select(listColsFallback, { count: "exact" }).order("created_at", { ascending: false });
    if (search) fallbackQuery = fallbackQuery.ilike("name", `%${search}%`);
    if (tier && tier !== "all") fallbackQuery = fallbackQuery.eq("tier", tier);
    fallbackQuery = fallbackQuery.range(from, to);
    orgsRes = await fallbackQuery;
  }

  const orgs = orgsRes.data;
  if (!orgs) return NextResponse.json({ orgs: [] });

  const orgIds = orgs.map((o: { id: string }) => o.id);
  const [profilesRes, billsRes] = await Promise.all([
    admin.from("profiles").select("org_id").in("org_id", orgIds),
    admin.from("bills").select("org_id").in("org_id", orgIds),
  ]);

  const usersByOrg: Record<string, number> = {};
  const billsByOrg: Record<string, number> = {};
  for (const p of profilesRes.data ?? []) { if (p.org_id) usersByOrg[p.org_id] = (usersByOrg[p.org_id] ?? 0) + 1; }
  for (const b of billsRes.data ?? []) { if (b.org_id) billsByOrg[b.org_id] = (billsByOrg[b.org_id] ?? 0) + 1; }

  const [{ count: freeCount }, { count: starterCount }, { count: businessCount }, { count: totalOrgs }] = await Promise.all([
    admin.from("organisations").select("id", { count: "exact", head: true }).eq("tier", "free"),
    admin.from("organisations").select("id", { count: "exact", head: true }).eq("tier", "starter"),
    admin.from("organisations").select("id", { count: "exact", head: true }).eq("tier", "business"),
    admin.from("organisations").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    orgs: orgs.map((o: { id: string } & Record<string, unknown>) => ({
      ...o,
      status: o.status ?? "active",
      user_count: usersByOrg[o.id] ?? 0,
      bill_count: billsByOrg[o.id] ?? 0,
    })),
    total: orgsRes.count ?? 0,
    total_pages: Math.ceil((orgsRes.count ?? 0) / pageSize),
    stats: {
      total: totalOrgs ?? 0,
      free: freeCount ?? 0,
      starter: starterCount ?? 0,
      business: businessCount ?? 0
    }
  });
}

/**
 * PATCH /api/admin/orgs
 * Update an organisation's tier or status.
 * Body: { id: string, tier?: string, status?: string }
 */
export async function PATCH(request: Request) {
  const result = await requireSuperadmin();
  if ("error" in result) return result.error;
  const admin = result.admin;

  const body = await request.json();
  const { id, tier, status } = body;

  if (!id) return NextResponse.json({ error: "Organisation ID is required" }, { status: 400 });

  const updates: Record<string, string> = {};
  if (tier && ["free", "starter", "business"].includes(tier)) updates.tier = tier;
  if (status && ["active", "suspended"].includes(status)) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }

  const { error } = await admin.from("organisations").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin, {
    adminId: result.userId,
    action: tier ? "tier_change" : "status_change",
    targetType: "organisation",
    targetId: id,
    metadata: updates,
  });

  return NextResponse.json({ success: true });
}
