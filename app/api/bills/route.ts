import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeFilterSearchTerm } from "@/lib/utils/format";
import { NextResponse } from "next/server";

function applyBillFilters<T extends {
  eq: (column: string, value: unknown) => T;
  or: (filters: string) => T;
}>(query: T, orgId: string, typeFilter: string, search: string): T {
  let nextQuery = query.eq("org_id", orgId);

  if (typeFilter && typeFilter !== "all") {
    nextQuery = nextQuery.eq("bill_type", typeFilter);
  }

  if (search) {
    nextQuery = nextQuery.or(
      `bill_date.ilike.%${search}%,supplier.ilike.%${search}%,account_number.ilike.%${search}%`
    );
  }

  return nextQuery;
}

/**
 * GET /api/bills
 * Returns paginated bills for the authenticated user's org.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("page_size") ?? "10")));
  const typeFilter = searchParams.get("type") ?? "";
  const search = sanitizeFilterSearchTerm(searchParams.get("search") ?? "");

  let query = supabase
    .from("bills")
    .select(
      "id, bill_type, bill_date, usage_amount, usage_unit, co2_kg, cost_gbp, supplier, account_number, pdf_url, created_at",
      { count: "exact" }
    )
    .order("bill_date", { ascending: false });

  query = applyBillFilters(query, profile.org_id, typeFilter, search);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: bills, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Summary stats across ALL filtered bills
  let summaryQuery = supabase
    .from("bills")
    .select("co2_kg, cost_gbp");
  summaryQuery = applyBillFilters(summaryQuery, profile.org_id, typeFilter, search);

  const { data: summaryData, error: summaryError } = await summaryQuery;

  if (summaryError) {
    return NextResponse.json({ error: summaryError.message }, { status: 500 });
  }

  const totalCo2 = (summaryData ?? []).reduce((s, b) => s + (Number(b.co2_kg) || 0), 0);
  const totalCost = (summaryData ?? []).reduce((s, b) => s + (Number(b.cost_gbp) || 0), 0);

  return NextResponse.json({
    bills: bills ?? [],
    total: count ?? 0,
    page,
    page_size: pageSize,
    total_pages: Math.ceil((count ?? 0) / pageSize),
    summary: {
      total_co2_kg: Math.round(totalCo2 * 10) / 10,
      total_cost_gbp: Math.round(totalCost * 100) / 100,
    },
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const billId = searchParams.get("id");
  if (!billId) return NextResponse.json({ error: "Missing bill id" }, { status: 400 });

  // Verify the bill belongs to this org before deleting (manual auth check)
  const { data: bill } = await supabase
    .from("bills")
    .select("id")
    .eq("id", billId)
    .eq("org_id", profile.org_id)
    .single();

  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  // Use admin client to bypass any RLS silent-failure issues
  const { error } = await admin
    .from("bills")
    .delete()
    .eq("id", billId)
    .eq("org_id", profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
