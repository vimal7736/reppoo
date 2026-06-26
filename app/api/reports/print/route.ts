import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const SCOPE_LABELS: Record<string, string> = {
  electricity: "Scope 2",
  gas: "Scope 1",
  fuel_diesel: "Scope 1",
  fuel_petrol: "Scope 1",
  water: "Scope 3",
};

const TYPE_LABELS: Record<string, string> = {
  electricity: "UK Electricity",
  gas: "Natural Gas",
  fuel_diesel: "Diesel",
  fuel_petrol: "Petrol",
  water: "Water",
};

/**
 * GET /api/reports/print?year=2025
 * Returns a print-optimized HTML page for the SECR carbon report.
 * Opens in a new browser tab; user clicks "Print / Save as PDF".
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorised", { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ?? new Date().getFullYear().toString();
  let from = searchParams.get("from");
  let to = searchParams.get("to");
  
  if (!from || !to) {
    from = `${year}-01-01`;
    to   = `${year}-12-31`;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organisations(name, pdf_reports_limit, pdf_reports_used, usage_reset_at)")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return new NextResponse("No organisation found", { status: 404 });

  const orgId = profile.org_id;
  const org = (Array.isArray(profile.organisations) ? profile.organisations[0] : profile.organisations) as {
    name: string;
    pdf_reports_limit: number;
    pdf_reports_used: number;
    usage_reset_at: string;
  } | null;

  if (orgId && org) {
    const admin = createAdminClient();
    let used = org.pdf_reports_used ?? 0;
    const limit = org.pdf_reports_limit ?? 1;

    // Monthly reset
    const resetAt = new Date(org.usage_reset_at);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (resetAt < thirtyDaysAgo) {
      await admin.from("organisations").update({ pdf_reports_used: 0, usage_reset_at: new Date().toISOString() }).eq("id", orgId);
      used = 0;
    }

    if (used >= limit) {
      return new NextResponse(
        `PDF report limit reached (${limit}/month on your plan). Upgrade to download more reports.`,
        { status: 403, headers: { "Content-Type": "text/plain" } }
      );
    }

    // Increment usage counter
    try {
      const { error } = await admin.rpc("increment_pdf_reports_used", { org_id: orgId });
      if (error) throw error;
    } catch (e) {
      await admin.from("organisations").update({ pdf_reports_used: used + 1 }).eq("id", orgId);
    }
  }



  const { data: billsData } = await supabase
    .from("bills")
    .select("bill_type, bill_date, usage_amount, usage_unit, co2_kg")
    .eq("org_id", profile.org_id)
    .gte("bill_date", from)
    .lte("bill_date", to)
    .order("bill_date", { ascending: true });

  const bills = billsData ?? [];

  const totalCo2 = bills.reduce((s, b) => s + (b.co2_kg ?? 0), 0);
  const totalKwh = bills.filter((b) => b.usage_unit === "kWh").reduce((s, b) => s + (b.usage_amount ?? 0), 0);

  const byType: Record<string, number> = {};
  for (const b of bills) {
    byType[b.bill_type] = (byType[b.bill_type] ?? 0) + (b.co2_kg ?? 0);
  }

  const scope1Types = ["gas", "fuel_diesel", "fuel_petrol"];
  const scope2Types = ["electricity"];
  const scope1 = bills.filter((b) => scope1Types.includes(b.bill_type)).reduce((s, b) => s + (b.co2_kg ?? 0), 0);
  const scope2 = bills.filter((b) => scope2Types.includes(b.bill_type)).reduce((s, b) => s + (b.co2_kg ?? 0), 0);

  const orgName = org?.name ?? "Organisation";
  const generatedDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 0; box-sizing: border-box;">
      <div style="background: #14532d; color: white; padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-end; border-radius: 12px 12px 0 0; box-sizing: border-box;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #4ade80"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
            <span style="font-size: 16pt; font-weight: 900; letter-spacing: 0.5px; color: white;">GreenTrack AI</span>
          </div>
          <h1 style="margin: 0 0 6px; font-size: 24pt; font-weight: 900; letter-spacing: -0.5px;">${orgName}</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 10pt; font-weight: 500;">Carbon Emissions Report &middot; ${from} to ${to} &middot; SECR Compliant</p>
        </div>
        <div style="text-align: right; font-size: 9pt; opacity: 0.8; font-weight: 500;">
          <p style="margin: 0 0 4px;">Generated: ${generatedDate}</p>
          <p style="margin: 0;">2025 DEFRA Emission Factors</p>
        </div>
      </div>
      
      <div style="padding: 24px; background: white; border: 1px solid #e2e8e2; border-top: none; border-radius: 0 0 12px 12px; box-sizing: border-box;">
        <h2 style="font-size: 13pt; color: #14532d; border-bottom: 2px solid #d1fae5; padding-bottom: 8px; margin-top: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Executive Summary</h2>
        <div style="display: flex; gap: 16px; margin: 20px 0;">
          <div style="flex: 1; background: #f8faf8; border: 1px solid #e2e8e2; border-radius: 12px; padding: 16px; box-sizing: border-box;">
            <div style="font-size: 9pt; color: #666; margin-bottom: 8px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Total CO₂e Emissions</div>
            <div style="font-size: 22pt; font-weight: 900; color: #14532d; letter-spacing: -1px;">${(totalCo2 / 1000).toFixed(3)}</div>
            <div style="font-size: 9pt; color: #999; margin-top: 4px; font-weight: 600;">tonnes CO₂e (Scope 1+2)</div>
          </div>
          <div style="flex: 1; background: #f8faf8; border: 1px solid #e2e8e2; border-radius: 12px; padding: 16px; box-sizing: border-box;">
            <div style="font-size: 9pt; color: #666; margin-bottom: 8px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Total Energy Used</div>
            <div style="font-size: 22pt; font-weight: 900; color: #14532d; letter-spacing: -1px;">${Math.round(totalKwh).toLocaleString()}</div>
            <div style="font-size: 9pt; color: #999; margin-top: 4px; font-weight: 600;">kWh electricity + gas</div>
          </div>
          <div style="flex: 1; background: #f8faf8; border: 1px solid #e2e8e2; border-radius: 12px; padding: 16px; box-sizing: border-box;">
            <div style="font-size: 9pt; color: #666; margin-bottom: 8px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">Bills Analysed</div>
            <div style="font-size: 22pt; font-weight: 900; color: #14532d; letter-spacing: -1px;">${bills.length}</div>
            <div style="font-size: 9pt; color: #999; margin-top: 4px; font-weight: 600;">utility bills in ${year}</div>
          </div>
        </div>

        <h2 style="font-size: 13pt; color: #14532d; border-bottom: 2px solid #d1fae5; padding-bottom: 8px; margin-top: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Scope Breakdown (SECR)</h2>
        <div style="display: flex; gap: 16px; margin: 20px 0;">
          <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; text-align: center; box-sizing: border-box;">
            <div style="color: #d97706; font-weight: 900; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px;">Scope 1</div>
            <div style="color: #92400e; font-size: 18pt; font-weight: 900; margin: 8px 0; letter-spacing: -0.5px;">${Math.round(scope1)} <span style="font-size: 12pt;">kg</span></div>
            <div style="font-size: 8pt; color: #92400e; opacity: 0.8; font-weight: 600;">Gas + Fuel (direct)</div>
          </div>
          <div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; text-align: center; box-sizing: border-box;">
            <div style="color: #2563eb; font-weight: 900; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px;">Scope 2</div>
            <div style="color: #1e3a8a; font-size: 18pt; font-weight: 900; margin: 8px 0; letter-spacing: -0.5px;">${Math.round(scope2)} <span style="font-size: 12pt;">kg</span></div>
            <div style="font-size: 8pt; color: #1e3a8a; opacity: 0.8; font-weight: 600;">Electricity (indirect)</div>
          </div>
          <div style="flex: 1; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 12px; padding: 16px; text-align: center; box-sizing: border-box;">
            <div style="color: #0891b2; font-weight: 900; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px;">Scope 3</div>
            <div style="color: #164e63; font-size: 18pt; font-weight: 900; margin: 8px 0; letter-spacing: -0.5px;">${Math.round(totalCo2 - scope1 - scope2)} <span style="font-size: 12pt;">kg</span></div>
            <div style="font-size: 8pt; color: #164e63; opacity: 0.8; font-weight: 600;">Water (value chain)</div>
          </div>
        </div>

        <h2 style="font-size: 13pt; color: #14532d; border-bottom: 2px solid #d1fae5; padding-bottom: 8px; margin-top: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Emissions by Source</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 16px;">
          <thead>
            <tr>
              <th style="padding: 12px 16px; text-align: left; font-size: 9pt; color: #555; text-transform: uppercase; border-bottom: 2px solid #14532d; font-weight: 900;">Energy Source</th>
              <th style="padding: 12px 16px; text-align: left; font-size: 9pt; color: #555; text-transform: uppercase; border-bottom: 2px solid #14532d; font-weight: 900;">GHG Scope</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 9pt; color: #555; text-transform: uppercase; border-bottom: 2px solid #14532d; font-weight: 900;">kgCO₂e</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 9pt; color: #555; text-transform: uppercase; border-bottom: 2px solid #14532d; font-weight: 900;">% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(byType).map(([type, co2]) => `
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600;">${TYPE_LABELS[type] ?? type}</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 900; color: ${scope1Types.includes(type) ? "#d97706" : scope2Types.includes(type) ? "#2563eb" : "#0891b2"}">${SCOPE_LABELS[type] ?? "Scope 3"}</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 500;">${co2.toFixed(2)}</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; color: #666; font-weight: 500;">${totalCo2 > 0 ? ((co2 / totalCo2) * 100).toFixed(1) : "0"}%</td>
              </tr>
            `).join("")}
            <tr>
              <td style="padding: 16px 16px 0 16px; font-weight: 900; border-top: 2px solid #14532d; font-size: 11pt;">Total</td>
              <td style="padding: 16px 16px 0 16px; border-top: 2px solid #14532d;"></td>
              <td style="padding: 16px 16px 0 16px; text-align: right; font-weight: 900; border-top: 2px solid #14532d; font-size: 11pt;">${totalCo2.toFixed(2)}</td>
              <td style="padding: 16px 16px 0 16px; text-align: right; font-weight: 900; border-top: 2px solid #14532d; font-size: 11pt;">100%</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 8pt; color: #999; line-height: 1.6;">
          <p style="margin: 0;">Emission factors sourced from UK Government Greenhouse Gas Conversion Factors for Company Reporting (DESNZ, 2025).</p>
          <p style="margin: 4px 0 0 0;">Report generated by <strong style="color: #666;">GreenTrack AI</strong> for <strong style="color: #666;">${orgName}</strong>. This report covers the period ${from} to ${to}.</p>
        </div>
      </div>
    </div>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
