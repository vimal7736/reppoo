import { requireSuperadmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { sanitizeFilterSearchTerm } from "@/lib/utils/format";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/users?detail=<id>
 * If `detail` param provided, returns full user detail with bills.
 * Otherwise returns all users across all organisations.
 */
export async function GET(request: NextRequest) {
  const result = await requireSuperadmin();
  if ("error" in result) return result.error;
  const admin = result.admin;

  const { searchParams } = new URL(request.url);
  const detailId = searchParams.get("detail");

  // Try selecting with is_disabled first; fall back without it
  const selectCols = "id, full_name, email, role, org_id, is_disabled, created_at, organisations(name)";
  const selectColsFallback = "id, full_name, email, role, org_id, created_at, organisations(name)";

  /* ── Detail mode ────────────────────────────────────────── */
  if (detailId) {
    const [profileRes, billsRes] = await Promise.all([
      admin.from("profiles").select(selectCols).eq("id", detailId).single(),
      admin.from("bills")
        .select("id, bill_type, bill_date, co2_kg")
        .eq("uploaded_by", detailId)
        .order("bill_date", { ascending: false })
        .limit(50),
    ]);

    let profileData = profileRes;
    // Fallback if is_disabled column doesn't exist
    if (profileRes.error && profileRes.error.message?.includes("is_disabled")) {
      profileData = await admin
        .from("profiles")
        .select(selectColsFallback)
        .eq("id", detailId)
        .single();
    }

    const profile = profileData.data;
    if (!profile) return NextResponse.json({ user: null });

    const org = Array.isArray(profile.organisations) ? profile.organisations[0] : profile.organisations;
    let email = (profile as Record<string, unknown>).email as string | undefined;
    if (!email) {
      const authUserRes = await admin.auth.admin.getUserById(detailId);
      email = authUserRes.data?.user?.email ?? "";
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        full_name: profile.full_name ?? "Unknown User",
        email,
        role: profile.role,
        org_id: profile.org_id ?? null,
        org_name: (org as { name: string } | null)?.name ?? "— Platform",
        created_at: profile.created_at,
        is_disabled: (profile as Record<string, unknown>).is_disabled ?? false,
        bills: billsRes.data ?? [],
      },
    });
  }

  /* ── List mode ──────────────────────────────────────────── */
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, Number(searchParams.get("page_size") ?? "10"));
  const roleFilter = searchParams.get("role") ?? "all";
  const search = sanitizeFilterSearchTerm(searchParams.get("search") ?? "");

  let query = admin.from("profiles").select(selectCols, { count: "exact" }).order("created_at", { ascending: false });

  if (roleFilter !== "all") {
    if (roleFilter === "admin") {
      query = query.in("role", ["admin", "superadmin", "super_admin"]);
    } else {
      query = query.eq("role", roleFilter);
    }
  }

  if (search) {
    const { data: orgs } = await admin.from("organisations").select("id").ilike("name", `%${search}%`);
    const orgIds = (orgs ?? []).map(o => o.id);

    const orConditions = [`full_name.ilike.%${search}%`, `email.ilike.%${search}%`];
    if (orgIds.length > 0) orConditions.push(`org_id.in.(${orgIds.join(',')})`);

    query = query.or(orConditions.join(','));
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  let profilesRes: any = await query;

  // Fallback if is_disabled column doesn't exist
  if (profilesRes.error && profilesRes.error.message?.includes("is_disabled")) {
    let fbQuery = admin.from("profiles").select(selectColsFallback, { count: "exact" }).order("created_at", { ascending: false });
    
    if (roleFilter !== "all") {
      if (roleFilter === "admin") {
        fbQuery = fbQuery.in("role", ["admin", "superadmin", "super_admin"]);
      } else {
        fbQuery = fbQuery.eq("role", roleFilter);
      }
    }
    
    if (search) {
      const { data: orgs } = await admin.from("organisations").select("id").ilike("name", `%${search}%`);
      const orgIds = (orgs ?? []).map(o => o.id);

      const orConditions = [`full_name.ilike.%${search}%`, `email.ilike.%${search}%`];
      if (orgIds.length > 0) orConditions.push(`org_id.in.(${orgIds.join(',')})`);

      fbQuery = fbQuery.or(orConditions.join(','));
    }

    fbQuery = fbQuery.range(from, to);
    profilesRes = await fbQuery;
  }

  const profiles = profilesRes.data;
  const count = profilesRes.count ?? 0;
  if (!profiles) return NextResponse.json({ users: [], total: 0, total_pages: 1 });

  const users = profiles.map((p: Record<string, any>) => {
    const org = Array.isArray(p.organisations) ? p.organisations[0] : p.organisations;
    return {
      id: p.id,
      full_name: p.full_name ?? "Unknown User",
      email: p.email ?? "",
      role: p.role,
      org_id: p.org_id ?? null,
      org_name: (org as { name: string } | null)?.name ?? "— Platform",
      created_at: p.created_at,
      is_disabled: (p as Record<string, unknown>).is_disabled ?? false,
    };
  });

  const [{ count: ownerCount }, { count: adminCount }, { count: memberCount }, { count: totalUsers }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
    admin.from("profiles").select("id", { count: "exact", head: true }).in("role", ["admin", "superadmin", "super_admin"]),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
    admin.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({ 
    users, 
    total: count, 
    total_pages: Math.ceil(count / pageSize),
    stats: {
      total: totalUsers ?? 0,
      owners: ownerCount ?? 0,
      admins: adminCount ?? 0,
      members: memberCount ?? 0
    }
  });
}

/**
 * PATCH /api/admin/users
 * Update a user's role or disable/enable status.
 * Body: { user_id: string, role?: string, action?: "disable" | "enable" }
 */
export async function PATCH(request: Request) {
  const result = await requireSuperadmin();
  if ("error" in result) return result.error;
  const admin = result.admin;

  const body = await request.json();
  const { user_id, role, action } = body;

  if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

  /* ── Role change ────────────────────────────────────────── */
  if (role && ["owner", "admin", "member"].includes(role)) {
    const { data: target } = await admin.from("profiles").select("role").eq("id", user_id).single();
    if (target?.role === "superadmin" || target?.role === "super_admin") {
      return NextResponse.json({ error: "Cannot change a superadmin's role" }, { status: 403 });
    }

    const { error } = await admin.from("profiles").update({ role }).eq("id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminAction(admin, {
      adminId: result.userId,
      action: "role_change",
      targetType: "user",
      targetId: user_id,
      metadata: { old_role: target?.role, new_role: role },
    });

    return NextResponse.json({ success: true });
  }

  /* ── Disable / Enable ───────────────────────────────────── */
  if (action === "disable" || action === "enable") {
    const is_disabled = action === "disable";
    const { error } = await admin.from("profiles").update({ is_disabled }).eq("id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminAction(admin, {
      adminId: result.userId,
      action: action === "disable" ? "user_disable" : "user_enable",
      targetType: "user",
      targetId: user_id,
      metadata: { is_disabled },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
}
