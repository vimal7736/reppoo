import { requireSuperadmin } from "@/lib/admin/auth";
import { sanitizeFilterSearchTerm } from "@/lib/utils/format";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/activity
 * Returns recent platform activity (signups + bill uploads).
 * Requires superadmin role.
 */
export async function GET(request: Request) {
  const result = await requireSuperadmin();
  if ("error" in result) return result.error;
  
  const admin = result.admin;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("page_size") ?? "10"));
  const filter = searchParams.get("filter") ?? "all";
  const search = sanitizeFilterSearchTerm(searchParams.get("search") ?? "");

  const fetchLimit = page * pageSize;

  let profilesQuery = admin.from("profiles").select("id, full_name, created_at, organisations(name)", { count: "exact" }).order("created_at", { ascending: false });
  let billsQuery = admin.from("bills").select("id, bill_type, co2_kg, created_at, org_id, organisations(name)", { count: "exact" }).order("created_at", { ascending: false });

  if (search) {
    const { data: orgs } = await admin.from("organisations").select("id").ilike("name", `%${search}%`);
    const orgIds = (orgs ?? []).map((o) => o.id);
    
    const profOrConditions = [`full_name.ilike.%${search}%`];
    if (orgIds.length > 0) profOrConditions.push(`org_id.in.(${orgIds.join(',')})`);
    profilesQuery = profilesQuery.or(profOrConditions.join(','));

    const billOrConditions = [`bill_type.ilike.%${search}%`];
    if (orgIds.length > 0) billOrConditions.push(`org_id.in.(${orgIds.join(',')})`);
    billsQuery = billsQuery.or(billOrConditions.join(','));
  }

  let profiles: any[] = [];
  let profilesCount = 0;
  if (filter === "all" || filter === "signup") {
    const { data, count } = await profilesQuery
      .limit(filter === "all" ? fetchLimit : pageSize)
      .range(filter === "all" ? 0 : (page - 1) * pageSize, filter === "all" ? fetchLimit - 1 : page * pageSize - 1);
    profiles = data ?? [];
    profilesCount = count ?? 0;
  }

  let bills: any[] = [];
  let billsCount = 0;
  if (filter === "all" || filter === "bill_upload") {
    const { data, count } = await billsQuery
      .limit(filter === "all" ? fetchLimit : pageSize)
      .range(filter === "all" ? 0 : (page - 1) * pageSize, filter === "all" ? fetchLimit - 1 : page * pageSize - 1);
    bills = data ?? [];
    billsCount = count ?? 0;
  }

  type ActivityItem = {
    id: string;
    type: "signup" | "bill_upload";
    description: string;
    user_name: string | null;
    org_name: string | null;
    created_at: string;
  };

  const activities: ActivityItem[] = [];

  for (const p of profiles) {
    const org = Array.isArray(p.organisations) ? p.organisations[0] : p.organisations;
    activities.push({
      id: `signup-${p.id}`,
      type: "signup",
      description: `${p.full_name ?? "New user"} joined the platform`,
      user_name: p.full_name,
      org_name: (org as { name: string } | null)?.name ?? null,
      created_at: p.created_at,
    });
  }

  for (const b of bills) {
    const org = Array.isArray(b.organisations) ? b.organisations[0] : b.organisations;
    const typeLabel = b.bill_type?.replace("_", " ") ?? "unknown";
    activities.push({
      id: `bill-${b.id}`,
      type: "bill_upload",
      description: `${typeLabel} bill uploaded — ${b.co2_kg?.toFixed(1) ?? "0"} kg CO₂e`,
      user_name: null,
      org_name: (org as { name: string } | null)?.name ?? null,
      created_at: b.created_at,
    });
  }

  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  let paginatedActivities = activities;
  let totalCount = 0;

  if (filter === "all") {
    totalCount = profilesCount + billsCount;
    paginatedActivities = activities.slice((page - 1) * pageSize, page * pageSize);
  } else {
    totalCount = filter === "signup" ? profilesCount : billsCount;
  }

  // Pre-calculate stats
  const { count: totalSignups } = await admin.from("profiles").select("*", { count: "exact", head: true });
  const { count: totalBills } = await admin.from("bills").select("*", { count: "exact", head: true });

  const todayStr = new Date().toISOString().slice(0, 10);
  const { count: todaySignups } = await admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStr);
  const { count: todayBills } = await admin.from("bills").select("*", { count: "exact", head: true }).gte("created_at", todayStr);

  return NextResponse.json({
    activities: paginatedActivities,
    total: totalCount,
    total_pages: Math.ceil(totalCount / pageSize),
    stats: {
      today: (todaySignups ?? 0) + (todayBills ?? 0),
      signups: totalSignups ?? 0,
      bills: totalBills ?? 0,
    }
  });
}
