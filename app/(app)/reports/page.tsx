"use client";
import { useState } from "react";
import {
  FileText, Download, TrendingDown, TrendingUp,
  Zap, Leaf, CheckCircle, Calendar, ChevronDown,
  Target, Banknote, Activity, Shield,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { PageLayout }  from "@/components/ui/PageLayout";
import { ChartCard }   from "@/components/ui/ChartCard";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { useFetch }    from "@/hooks/useFetch";
import { useToast }    from "@/components/ui/Toast";
import {
  BILL_TYPE_LABELS,
  BILL_TYPE_COLORS,
  SCOPE_LABELS,
} from "@/lib/carbon/constants";
import {
  CHART_AXIS_TICK,
  CHART_TOOLTIP_STYLE,
  CHART_CURSOR,
} from "@/lib/chart/config";
import type { ReportSummary } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const SCOPE_CFG = {
  scope1: { label: "Scope 1", sub: "Direct — Gas & Fleet",      color: "#f97316" },
  scope2: { label: "Scope 2", sub: "Indirect — Electricity",    color: "#22c55e" },
  scope3: { label: "Scope 3", sub: "Associated — Water",        color: "#06b6d4" },
} as const;

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtGbp(n: number) {
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(`${CURRENT_YEAR}-01-01`);
  const [toDate, setToDate] = useState(`${CURRENT_YEAR}-12-31`);
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/reports/print?from=${fromDate}&to=${toDate}`);
      if (!res.ok) {
        const text = await res.text();
        toast.error(text || "Export failed. You may have reached your plan limits.");
        return;
      }
      
      const htmlString = await res.text();
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin:       10,
        filename:     `greentrack-report-${fromDate}-to-${toDate}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(htmlString).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const { data: summary, loading, error } = useFetch<ReportSummary>(
    `/api/reports/summary?from=${fromDate}&to=${toDate}`
  );

  const handleDateChange = (type: "from" | "to", val: string) => {
    const newFrom = type === "from" ? val : fromDate;
    const newTo = type === "to" ? val : toDate;
    
    if (newFrom && newTo) {
      const diff = new Date(newTo).getTime() - new Date(newFrom).getTime();
      if (diff > 365 * 24 * 60 * 60 * 1000) {
        toast.error("Period cannot be more than 365 days");
        return;
      }
      if (diff < 0) {
        toast.error("End date must be after start date");
        return;
      }
    }
    
    if (type === "from") setFromDate(val);
    else setToDate(val);
  };

  const isFreePlan = summary?.org.tier === "free";

  // Budget
  const cap           = summary?.target?.annual_carbon_cap_kg ?? 0;
  const actual        = summary?.total_co2_kg ?? 0;
  const budgetUsedPct = cap > 0 ? (actual / cap) * 100 : 0;
  const isOverBudget  = cap > 0 && actual > cap;
  const remaining     = cap - actual;

  // Year-over-year
  const prevCo2   = summary?.prev_year_co2  ?? 0;
  const prevCost  = summary?.prev_year_cost ?? 0;
  const currCost  = summary?.total_cost_gbp ?? 0;
  const yoyPct    = prevCo2 > 0 ? ((actual - prevCo2) / prevCo2) * 100 : null;
  const yoyCostPct= prevCost > 0 ? ((currCost - prevCost) / prevCost) * 100 : null;

  // Monthly target line
  const monthlyTarget = cap > 0 ? cap / 12 : null;

  // SECR month coverage — which of the 12 by_month slots have co2 > 0
  const monthsHaveData = (summary?.by_month ?? []).map((m) => m.co2 > 0);
  const monthsWithData = summary?.months_with_data ?? 0;

  const columns: ColumnDef<any>[] = [
    {
      key: "type",
      header: "Utility",
      sortable: true,
      render: (row) => {
        const color = BILL_TYPE_COLORS[row.type as keyof typeof BILL_TYPE_COLORS] ?? "var(--brand-green)";
        return (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-primary">
              {BILL_TYPE_LABELS[row.type as keyof typeof BILL_TYPE_LABELS] ?? row.type}
            </span>
          </div>
        );
      },
    },
    {
      key: "scope",
      header: "Scope",
      render: (row) => {
        const color = BILL_TYPE_COLORS[row.type as keyof typeof BILL_TYPE_COLORS] ?? "var(--brand-green)";
        return (
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: `${color}1a`, color }}
          >
            {SCOPE_LABELS[row.type as keyof typeof SCOPE_LABELS] ?? "—"}
          </span>
        );
      },
    },
    {
      key: "co2_kg",
      header: "CO₂e (kg)",
      align: "right",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-primary">
          {row.co2_kg.toLocaleString(undefined, { minimumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      key: "cost_gbp",
      header: "Spend",
      align: "right",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] font-bold text-text-muted">
          {row.cost_gbp > 0 ? fmtGbp(row.cost_gbp) : <span className="opacity-30">—</span>}
        </span>
      ),
    },
    {
      key: "weight",
      header: "Weight",
      align: "right",
      render: (row) => {
        const pct   = actual > 0 ? (row.co2_kg / actual) * 100 : 0;
        const color = BILL_TYPE_COLORS[row.type as keyof typeof BILL_TYPE_COLORS] ?? "var(--brand-green)";
        return (
          <div className="flex items-center justify-end gap-2">
            <div
              className="w-16 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--bg-inset)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="text-[9px] font-black text-text-muted w-8 text-right">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      },
    },
  ];

  /* ── Calendar filters + export button ── */
  const headerRight = (
    <div id="tour-reports-export" className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => handleDateChange("from", e.target.value)}
          className="neu-raised rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-primary bg-transparent outline-none focus:ring-2 ring-gt-green-500/50"
        />
        <span className="text-text-muted text-xs font-black uppercase">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => handleDateChange("to", e.target.value)}
          className="neu-raised rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-primary bg-transparent outline-none focus:ring-2 ring-gt-green-500/50"
        />
      </div>

      <button
        type="button"
        disabled={isFreePlan || loading || isExporting}
        onClick={handleExportPdf}
        className="neu-raised hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        style={{ color: "var(--brand-green-dark)" }}
      >
        <Download className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} />
        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
          {isExporting ? "Exporting..." : "Export PDF"}
        </span>
      </button>
    </div>
  );

  return (
    <PageLayout
      icon={<FileText className="w-5 h-5" />}
      title="Reports & Analytics"
      subtitle="SECR-ready compliance data, carbon budgets, and environmental impact summaries"
      headerRight={headerRight}
      error={error}
      className="!pb-0"
    >
      {/* No year dropdown wrapper needed now */}

      {/* ── FREE PLAN BANNER ─────────────────────────────────────────────────── */}
      {isFreePlan && (
        <div
          className="premium-card p-6 overflow-hidden relative group border-none"
          style={{ background: "linear-gradient(135deg, var(--color-gt-green-900), #0a0a0a)" }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.07] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
            <Zap className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight text-white">Unlock Full SECR Reporting</h3>
              <p className="text-xs font-bold text-white/50 max-w-md leading-relaxed">
                Your plan only supports on-screen analytics. Upgrade to export
                fully compliant PDF reports for your board and stakeholders.
              </p>
            </div>
            <a
              href="/billing"
              className="self-start sm:self-auto shrink-0 px-6 py-2.5 rounded-xl bg-gt-green-500 hover:bg-white hover:text-black text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Upgrade Now
            </a>
          </div>
        </div>
      )}

      {/* ── EXECUTIVE SUMMARY — 4 stat cards ─────────────────────────────────── */}
      <div id="tour-reports-summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Footprint */}
        <div className="premium-card p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Total Footprint</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)", color: "var(--brand-green)" }}>
              <Leaf className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-text-primary">
              {loading ? "—" : ((actual) / 1000).toFixed(3)}
              <span className="text-xs opacity-40 font-bold ml-1">tCO₂e</span>
            </p>
            <p className="text-[9px] font-bold text-text-muted mt-1.5 opacity-60">
              {summary?.bill_count ?? 0} bills audited
            </p>
          </div>
        </div>

        {/* Total Spend */}
        <div className="premium-card p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Total Spend</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-text-primary">
              {loading ? "—" : fmtGbp(currCost)}
            </p>
            <p className="text-[9px] font-bold text-text-muted mt-1.5 opacity-60">
              {(summary?.total_kwh ?? 0).toLocaleString("en-GB")} kWh consumed
            </p>
          </div>
        </div>

        {/* Year-over-Year */}
        <div className="premium-card p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">vs Last Year</p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: yoyPct !== null && yoyPct < 0 ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                color:      yoyPct !== null && yoyPct < 0 ? "var(--brand-green)"    : "#f97316",
              }}
            >
              {yoyPct !== null && yoyPct < 0
                ? <TrendingDown className="w-3.5 h-3.5" />
                : <TrendingUp   className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div>
            <p
              className="text-xl sm:text-2xl font-black tracking-tighter leading-none"
              style={{
                color: loading || yoyPct === null
                  ? "var(--text-primary)"
                  : yoyPct < 0 ? "var(--brand-green)" : "#f97316",
              }}
            >
              {loading ? "—" : yoyPct === null ? "—" : `${yoyPct >= 0 ? "+" : ""}${yoyPct.toFixed(1)}%`}
            </p>
            <p className="text-[9px] font-bold text-text-muted mt-1.5 opacity-60">
              {prevCo2 > 0
                ? `${(prevCo2 / 1000).toFixed(2)}t in previous period`
                : "No prior period data"}
            </p>
          </div>
        </div>

        {/* Budget Status */}
        <div className="premium-card p-4 sm:p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Budget Status</p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: cap === 0 ? "rgba(113,113,113,0.12)" : isOverBudget ? "rgba(249,115,22,0.12)" : "rgba(34,197,94,0.12)",
                color:      cap === 0 ? "var(--text-muted)"       : isOverBudget ? "#f97316"              : "var(--brand-green)",
              }}
            >
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p
              className="text-xl sm:text-2xl font-black tracking-tighter leading-none"
              style={{
                color: cap === 0 ? "var(--text-muted)" : isOverBudget ? "#f97316" : "var(--brand-green)",
              }}
            >
              {loading ? "—" : cap > 0 ? `${budgetUsedPct.toFixed(0)}%` : "—"}
              {cap > 0 && <span className="text-xs opacity-40 font-bold ml-1">of cap</span>}
            </p>
            <p className="text-[9px] font-bold text-text-muted mt-1.5 opacity-60">
              {cap > 0
                ? isOverBudget
                  ? `${Math.abs(remaining).toFixed(0)} kg over budget`
                  : `${remaining.toFixed(0)} kg remaining`
                : "No target set"}
            </p>
          </div>
        </div>
      </div>

      {/* ── CARBON BUDGET TRACKER ────────────────────────────────────────────── */}
      {summary?.target && (
        <div id="tour-reports-budget" className="premium-card p-5 sm:p-6 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
                Carbon Budget Tracker
              </h3>
              <p className="text-sm font-black text-text-primary mt-1">
                Annual cap: {(cap / 1000).toFixed(2)} tCO₂e
                <span className="text-[10px] font-bold text-text-muted ml-2 opacity-50">
                  · SBTi {summary.target.sbti_pathway.toUpperCase()} pathway
                  {summary.target.net_zero_target_year
                    ? ` · Net zero by ${summary.target.net_zero_target_year}`
                    : ""}
                </span>
              </p>
            </div>
            <div
              className={`self-start sm:self-auto px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                isOverBudget
                  ? "bg-orange-500/10 text-orange-600 border-orange-500/25"
                  : "bg-gt-green-500/10 text-gt-green-700 border-gt-green-500/20"
              }`}
            >
              {isOverBudget ? "Over Budget" : "On Track"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-text-muted">
              <span>0 kg</span>
              <span>{actual.toLocaleString("en-GB")} kg used</span>
              <span>{cap.toLocaleString("en-GB")} kg cap</span>
            </div>

            {/* Track */}
            <div
              className="h-4 rounded-full overflow-hidden"
              style={{ background: "var(--bg-inset)", boxShadow: "var(--shadow-inset-xs)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(budgetUsedPct, 100)}%`,
                  background: isOverBudget
                    ? "linear-gradient(90deg, #f97316, #ef4444)"
                    : "linear-gradient(90deg, var(--brand-green), var(--brand-green-dark))",
                  boxShadow: isOverBudget
                    ? "0 0 12px rgba(249,115,22,0.35)"
                    : "0 0 12px rgba(34,197,94,0.35)",
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-[9px] font-bold text-text-muted opacity-50">
                {budgetUsedPct.toFixed(1)}% consumed
              </p>
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: isOverBudget ? "#f97316" : "var(--brand-green)" }}
              >
                {isOverBudget
                  ? `${Math.abs(remaining).toFixed(0)} kg over`
                  : `${remaining.toFixed(0)} kg remaining`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MONTHLY TREND + SCOPE BREAKDOWN ──────────────────────────────────── */}
      <div id="tour-reports-charts" className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Monthly chart — takes 3 of 5 cols */}
        <div className="lg:col-span-3">
          <ChartCard
            title="Monthly Emissions"
            titleIcon={<Activity className="w-4 h-4 text-gt-green-500" />}
            subtitle={
              monthlyTarget
                ? `CO₂e by month · ${fromDate} to ${toDate} · dashed line = monthly target (${(monthlyTarget / 1000).toFixed(2)}t)`
                : `CO₂e by month · ${fromDate} to ${toDate}`
            }
            right={
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-inset)" }}>
                <Leaf className="w-4 h-4 text-text-muted" />
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={summary?.by_month ?? []}
                margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} dy={8} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_AXIS_TICK}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}`}
                  width={36}
                />
                <Tooltip
                  cursor={CHART_CURSOR}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v) => [`${Number(v).toLocaleString("en-GB")} kg`, "CO₂e"]}
                />
                {monthlyTarget && (
                  <ReferenceLine
                    y={monthlyTarget}
                    stroke="#f97316"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: "Monthly target",
                      position: "insideTopRight",
                      fontSize: 8,
                      fill: "#f97316",
                      fontWeight: 900,
                    }}
                  />
                )}
                <Bar dataKey="co2" radius={[5, 5, 0, 0]} name="CO₂e (kg)">
                  {(summary?.by_month ?? []).map((m, i) => (
                    <Cell
                      key={i}
                      fill={
                        monthlyTarget && m.co2 > monthlyTarget
                          ? "#f97316"
                          : "var(--brand-green-dark)"
                      }
                      opacity={m.co2 === 0 ? 0.25 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Scope breakdown — takes 2 of 5 cols */}
        <div className="lg:col-span-2 premium-card p-5 space-y-5 flex flex-col">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
              Scope Breakdown
            </h3>
            <p className="text-[9px] font-bold text-text-muted opacity-50 mt-0.5">GHG Protocol classification</p>
          </div>

          <div className="flex-1 space-y-5">
            {(["scope1", "scope2", "scope3"] as const).map((key) => {
              const cfg = SCOPE_CFG[key];
              const val = summary?.by_scope[key] ?? 0;
              const pct = actual > 0 ? (val / actual) * 100 : 0;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                        {cfg.label}
                      </p>
                      <p className="text-[8px] font-bold text-text-muted opacity-50 mt-0.5">{cfg.sub}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-text-primary leading-none">
                        {(val / 1000).toFixed(2)}
                        <span className="text-[8px] opacity-40 ml-0.5">t</span>
                      </p>
                      <p className="text-[8px] font-bold opacity-50 mt-0.5" style={{ color: cfg.color }}>
                        {pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-inset)", boxShadow: "var(--shadow-inset-xs)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cfg.color, opacity: 0.75 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total pill */}
          <div
            className="rounded-xl p-3.5 flex items-center justify-between mt-auto"
            style={{ background: "var(--bg-inset)", boxShadow: "var(--shadow-inset-xs)" }}
          >
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted opacity-50">
              Total Emissions
            </p>
            <p className="text-base font-black tracking-tighter text-text-primary">
              {(actual / 1000).toFixed(3)}
              <span className="text-xs opacity-40 ml-1">tCO₂e</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── RESOURCE BREAKDOWN TABLE ─────────────────────────────────────────── */}
      <div id="tour-reports-table">
      <DataTable
        toolbarLeft={
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
              Resource Breakdown
            </h3>
            <p className="text-[9px] font-bold text-text-muted opacity-50 mt-0.5">
              By utility type — emissions, cost, and contribution weight
            </p>
          </div>
        }
          tableId="resource_breakdown"
          columns={columns}
          data={summary?.by_type ?? []}
          rowKey={(row) => row.type}
          loading={loading}
          loadingLabel="Analysing resource streams…"
          emptyTitle={`No bills recorded for ${fromDate} to ${toDate}`}
          emptyMessage="Upload bills to see your resource breakdown."
          mobileRender={(row) => {
            const pct   = actual > 0 ? (row.co2_kg / actual) * 100 : 0;
            const color = BILL_TYPE_COLORS[row.type as keyof typeof BILL_TYPE_COLORS] ?? "var(--brand-green)";
            return (
              <div className="p-4 space-y-3" style={{ background: "var(--bg-inset)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <p className="text-[10px] font-black text-text-primary uppercase tracking-[0.1em]">{BILL_TYPE_LABELS[row.type as keyof typeof BILL_TYPE_LABELS] ?? row.type}</p>
                  </div>
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: `${color}1a`, color }}
                  >
                    {SCOPE_LABELS[row.type as keyof typeof SCOPE_LABELS] ?? "—"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="flex justify-between items-end pt-0.5">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-muted opacity-50">CO₂e</p>
                    <p className="text-[10px] font-black text-text-primary">
                      {row.co2_kg.toLocaleString(undefined, { minimumFractionDigits: 1 })} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-muted opacity-50">Spend</p>
                    <p className="text-[10px] font-bold text-text-muted">{row.cost_gbp > 0 ? fmtGbp(row.cost_gbp) : "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-muted opacity-50">Weight</p>
                    <p className="text-[10px] font-black" style={{ color }}>{pct.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            );
          }}
          footer={
            summary ? (
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-text-primary uppercase tracking-[0.1em]">Total</p>
                <div className="flex items-center gap-8 text-right">
                  <div className="text-[10px] font-black" style={{ color: "var(--brand-green-dark)" }}>
                    {actual.toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="opacity-50">kg CO₂e</span>
                  </div>
                  <div className="text-[10px] font-bold text-text-primary w-16">
                    {currCost > 0 ? fmtGbp(currCost) : "—"}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-40 w-8">
                    100%
                  </div>
                </div>
              </div>
            ) : null
          }
        />
      </div>

      {/* ── YEAR-OVER-YEAR + SECR COMPLIANCE ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Year-over-Year */}
        <div className="premium-card p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Year-over-Year</h3>
            <p className="text-[9px] font-bold text-text-muted opacity-50 mt-0.5">
              {fromDate} vs previous period
            </p>
          </div>

          {prevCo2 === 0 ? (
            <div
              className="rounded-2xl py-8 flex items-center justify-center"
              style={{ background: "var(--bg-inset)", boxShadow: "var(--shadow-inset-xs)" }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">
                No previous period data available
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  label:   "Carbon Footprint",
                  current: `${(actual / 1000).toFixed(3)} t`,
                  prev:    `${(prevCo2 / 1000).toFixed(3)} t`,
                  pct:     yoyPct,
                },
                {
                  label:   "Utility Spend",
                  current: fmtGbp(currCost),
                  prev:    fmtGbp(prevCost),
                  pct:     yoyCostPct,
                },
              ].map(({ label, current, prev, pct }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 flex items-center justify-between gap-4"
                  style={{ background: "var(--bg-inset)", boxShadow: "var(--shadow-inset-xs)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-60">
                      {label}
                    </p>
                    <p className="text-lg font-black text-text-primary tracking-tighter mt-0.5 leading-none">
                      {current}
                    </p>
                    <p className="text-[9px] font-bold text-text-muted opacity-40 mt-1">
                      was {prev} in previous period
                    </p>
                  </div>
                  {pct !== null && (
                    <div
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black"
                      style={{
                        background: pct < 0 ? "rgba(34,197,94,0.12)"  : "rgba(249,115,22,0.12)",
                        color:      pct < 0 ? "var(--brand-green)"     : "#f97316",
                      }}
                    >
                      {pct < 0
                        ? <TrendingDown className="w-3.5 h-3.5" />
                        : <TrendingUp   className="w-3.5 h-3.5" />}
                      {Math.abs(pct).toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECR Compliance */}
        <div className="premium-card p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
                SECR Compliance
              </h3>
              <p className="text-[9px] font-bold text-text-muted opacity-50 mt-0.5">
                Data coverage for {fromDate} to {toDate}
              </p>
            </div>
            <div
              className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                monthsWithData >= 10
                  ? "bg-gt-green-500/10 text-gt-green-700 border-gt-green-500/20"
                  : monthsWithData >= 6
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/25"
                  : "bg-orange-500/10 text-orange-600 border-orange-500/20"
              }`}
            >
              {monthsWithData >= 10 ? "Audit Ready" : monthsWithData >= 6 ? "Partial" : "Incomplete"}
            </div>
          </div>

          {/* 12-month dot grid */}
          <div className="grid grid-cols-6 gap-2">
            {MONTH_LABELS.map((m, i) => {
              const hasData = monthsHaveData[i] ?? false;
              return (
                <div key={m} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                    style={{
                      background: hasData ? "rgba(34,197,94,0.12)"       : "var(--bg-inset)",
                      boxShadow:  hasData ? "none"                        : "var(--shadow-inset-xs)",
                      border:     hasData ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border-subtle)",
                    }}
                  >
                    {hasData ? (
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--brand-green)" }} />
                    ) : (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--border-strong)" }}
                      />
                    )}
                  </div>
                  <p className="text-[7px] font-black uppercase tracking-wider text-text-muted opacity-50">{m}</p>
                </div>
              );
            })}
          </div>

          {/* Coverage summary */}
          <div
            className="rounded-xl p-4 flex items-center justify-between gap-4"
            style={{ background: "var(--bg-inset)", boxShadow: "var(--shadow-inset-xs)" }}
          >
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted opacity-50">
                Coverage
              </p>
              <p className="text-lg font-black text-text-primary tracking-tighter leading-none mt-0.5">
                {monthsWithData}
                <span className="text-xs opacity-40">/12 months</span>
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted opacity-50">
                Records
              </p>
              <p className="text-lg font-black text-text-primary tracking-tighter leading-none mt-0.5">
                {summary?.bill_count ?? 0}
              </p>
            </div>
            <div className="flex items-center gap-2 opacity-25 shrink-0">
              <Shield className="w-5 h-5 text-text-muted" />
              <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">DEFRA 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── DOCUMENT FOOTER ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ background: "var(--bg-inset)", boxShadow: "var(--shadow-inset-xs)" }}
      >
        <p className="text-[9px] font-bold text-text-muted opacity-40 max-w-lg leading-relaxed">
          Derived from HM Government DESNZ 2025 conversion factors. This report is generated
          against SECR / TCFD disclosure standards for UK reporting periods. Figures include
          Scope 1, 2, and 3 emissions as defined by the GHG Protocol.
        </p>
        <div className="flex items-center gap-2 opacity-20 shrink-0">
          <CheckCircle className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">Audit Trail Valid</span>
        </div>
      </div>
    </PageLayout>
  );
}
