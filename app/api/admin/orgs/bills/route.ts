import { requireSuperadmin } from "@/lib/admin/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/orgs/bills?org_id=<id>&page=1&page_size=10
 * Returns paginated bills for a given organisation.
 */
export async function GET(request: NextRequest) {
  const result = await requireSuperadmin();
  if ("error" in result) return result.error;
  const admin = result.admin;

  const { searchParams } = new URL(request.url);
  const orgId    = searchParams.get("org_id");
  const page     = Math.max(1, Number(searchParams.get("page")      ?? "1"));
  const pageSize = Math.max(1, Math.min(100, Number(searchParams.get("page_size") ?? "10")));

  if (!orgId) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  const { data, error, count } = await admin
    .from("bills")
    .select("id, bill_type, bill_date, co2_kg, cost_gbp, usage_amount, usage_unit", { count: "exact" })
    .eq("org_id", orgId)
    .order("bill_date", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total      = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    bills:       data ?? [],
    total,
    page,
    page_size:   pageSize,
    total_pages: totalPages,
  });
}
