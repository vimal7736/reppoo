"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Building2, Search, ChevronDown, FileText,
  Users as UsersIcon, AlertCircle,
} from "lucide-react";
import type { SubscriberRow } from "@/types";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils/format";

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  active:       { bg: "rgba(34,197,94,0.12)",  text: "#22c55e", ring: "rgba(34,197,94,0.3)",  label: "Active" },
  trial:        { bg: "rgba(234,179,8,0.12)",   text: "#eab308", ring: "rgba(234,179,8,0.3)",  label: "Trial" },
  past_due:     { bg: "rgba(239,68,68,0.12)",   text: "#ef4444", ring: "rgba(239,68,68,0.3)",  label: "Past Due" },
  canceled:     { bg: "rgba(120,120,120,0.12)", text: "#6b7280", ring: "rgba(120,120,120,0.3)", label: "Canceled" },
  grace_period: { bg: "rgba(249,115,22,0.12)", text: "#f97316", ring: "rgba(249,115,22,0.3)", label: "Grace Period" },
};

const PLAN_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  free:     { bg: "rgba(120,120,120,0.10)", text: "var(--text-muted)",        ring: "rgba(120,120,120,0.20)" },
  starter:  { bg: "rgba(59,130,246,0.10)",  text: "#3b82f6",                 ring: "rgba(59,130,246,0.25)" },
  business: { bg: "rgba(34,197,94,0.10)",   text: "var(--brand-green-dark)", ring: "rgba(34,197,94,0.25)" },
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "past_due", label: "Past Due" },
  { key: "canceled", label: "Canceled" },
];

export default function SubscribersTab() {
  const [subs, setSubs] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function fetchSubs() {
      setLoading(true);
      const params = new URLSearchParams({
        view: "subscribers",
        page: String(page),
        page_size: String(PAGE_SIZE),
        status: statusFilter,
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const d = await res.json();
        setSubs(d.subscribers ?? []);
        setTotalPages(d.total_pages ?? 1);
        setTotalItems(d.total ?? 0);
      }
      setLoading(false);
    }
    fetchSubs();
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { setPage(1); }, [statusFilter, debouncedSearch]);


  const columns: ColumnDef<SubscriberRow>[] = [
    {
      key: "org", header: "Organisation",
      render: (s) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase shrink-0"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)", boxShadow: "var(--shadow-inset-xs)" }}>
            {s.org_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-tight truncate" style={{ color: "var(--text-primary)" }}>{s.org_name}</p>
            <p className="text-[9px] text-text-muted opacity-50">{s.user_count} users · {s.bill_count} bills</p>
          </div>
        </div>
      ),
    },
    {
      key: "plan", header: "Plan",
      render: (s) => {
        const ps = PLAN_STYLES[s.plan] ?? PLAN_STYLES.free;
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
          style={{ background: ps.bg, color: ps.text, border: `1px solid ${ps.ring}` }}>{s.plan}</span>;
      },
    },
    {
      key: "status", header: "Status",
      render: (s) => {
        const ss = STATUS_STYLES[s.status] ?? STATUS_STYLES.active;
        return (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
              style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.ring}` }}>
              {s.status === "past_due" && <AlertCircle className="w-3 h-3" />}
              {ss.label}
            </span>
            {s.status === "grace_period" && (
              <span className="relative flex h-2 w-2" title="Grace period — access still active">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions", header: "Invoice", align: "center",
      render: (s) => (
        s.stripe_customer_id ? (
          <a href={`https://dashboard.stripe.com/customers/${s.stripe_customer_id}`} target="_blank" rel="noopener noreferrer"
            title="View invoices in Stripe"
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 mx-auto"
            style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>
            <FileText className="w-3.5 h-3.5" />
          </a>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <DataTable tableId="admin_subscriptions" columns={columns} data={subs} rowKey={(s) => s.id} loading={loading}
        loadingLabel="Loading subscribers..." emptyIcon={<Building2 className="w-10 h-10" />}
        emptyTitle="No Subscribers Found" emptyMessage="Try adjusting your search or filters."
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        toolbarLeft={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4 w-full">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search subscribers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!py-0 !h-10 !rounded-xl !shadow-none !bg-transparent !border !border-black/20 focus:!border-black/40"
              />
            </div>
            <div className="flex items-center gap-1 p-1 h-10 rounded-xl overflow-x-auto shrink-0"
              style={{ background: "var(--neu-base)", boxShadow: "var(--shadow-inset-xs)", border: "var(--card-border)", scrollbarWidth: "none" } as React.CSSProperties}>
              {STATUS_FILTERS.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setStatusFilter(key)}
                  className="px-3 lg:px-4 h-full rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  style={statusFilter === key ? { background: "var(--bg-surface)", color: "var(--brand-orange)", boxShadow: "var(--shadow-raised)" } : { color: "var(--text-muted)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />

    </div>
  );
}
