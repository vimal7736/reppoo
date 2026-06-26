"use client";
import { useState, useEffect } from "react";
import { Activity, UserPlus, Upload, TrendingUp, Zap, Flame, Clock, Calendar, Search } from "lucide-react";
import type { AdminActivity } from "@/types";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";

const EVENT_CONFIG: Record<string, { Icon: typeof UserPlus; color: string; bg: string; label: string }> = {
  signup: { Icon: UserPlus, color: "var(--brand-green)", bg: "rgba(34,197,94,0.10)", label: "New Signup" },
  bill_upload: { Icon: Upload, color: "var(--brand-orange)", bg: "rgba(249,115,22,0.10)", label: "Bill Upload" },
  tier_change: { Icon: TrendingUp, color: "#3b82f6", bg: "rgba(59,130,246,0.10)", label: "Tier Change" },
  factor_edit: { Icon: Zap, color: "#a855f7", bg: "rgba(168,85,247,0.10)", label: "Factor Edit" },
};

const FILTERS = [
  { key: "all", label: "All Events" },
  { key: "signup", label: "Signups" },
  { key: "bill_upload", label: "Bills" },
];

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ today: 0, signups: 0, bills: 0 });
  const PAGE_SIZE = 10;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        filter: filter,
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/activity?${params}`);
      if (res.ok) {
        const d = await res.json();
        setActivities(d.activities ?? []);
        setTotalPages(d.total_pages ?? 1);
        setTotalItems(d.total ?? 0);
        if (d.stats) setStats(d.stats);
      }
      setLoading(false);
    }
    load();
  }, [page, filter, debouncedSearch]);

  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);

  const columns: ColumnDef<any>[] = [
    {
      key: "event",
      header: "Event",
      render: (a) => {
        const cfg = EVENT_CONFIG[a.type] ?? { Icon: Flame, color: "var(--text-muted)", bg: "var(--bg-inset)", label: a.type };
        return (
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
              <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              <p className="text-xs font-bold truncate mt-1" style={{ color: "var(--text-primary)" }}>{a.description}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "user",
      header: "User",
      render: (a) => (
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>
          {a.user_name ?? "—"}
        </span>
      ),
    },
    {
      key: "organisation",
      header: "Organisation",
      render: (a) => (
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          {a.org_name ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      align: "right",
      render: (a) => {
        const date = new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        const time = new Date(a.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        return (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{date}</p>
            <p className="text-[9px] font-bold text-text-muted opacity-50">{time}</p>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 lg:space-y-6 animate-scale-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        {[
          { label: "Today's Events", value: stats.today, icon: <Clock className="w-4 h-4" />, accent: "orange" },
          { label: "Total Signups", value: stats.signups, icon: <UserPlus className="w-4 h-4" />, accent: "green" },
          { label: "Total Uploads", value: stats.bills, icon: <Upload className="w-4 h-4" />, accent: "orange" },
        ].map(({ label, value, icon, accent }) => (
          <div key={label} className="premium-card p-4 lg:p-5"
            style={{ borderTop: `3px solid ${accent === "green" ? "var(--brand-green)" : "var(--brand-orange)"}` }}>
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-50">{label}</span>
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--neu-base)", boxShadow: "var(--shadow-inset-sm)", color: accent === "green" ? "var(--brand-green-dark)" : "var(--brand-orange-dark)" }}>
                {icon}
              </div>
            </div>
            <span className="text-xl lg:text-2xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>{value}</span>
          </div>
        ))}
      </div>

      <DataTable tableId="admin_activity"
        columns={columns}
        data={activities}
        rowKey={(a) => a.id}
        loading={loading}
        loadingLabel="Loading activity..."
        emptyIcon={<Activity className="w-10 h-10" />}
        emptyTitle="No Activity Found"
        emptyMessage="Try adjusting your filters."
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        fullHeight
        toolbarLeft={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4 w-full">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search events, users, or organisations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!py-0 !h-10 !rounded-xl !shadow-none !bg-transparent !border !border-black/20 focus:!border-black/40"
              />
            </div>
            <div className="flex items-center gap-1 p-1 h-10 w-full sm:w-auto rounded-xl overflow-x-auto shrink-0"
              style={{ background: "var(--neu-base)", boxShadow: "var(--shadow-inset-xs)", border: "var(--card-border)", scrollbarWidth: "none" } as React.CSSProperties}>
              {FILTERS.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setFilter(key)}
                  className="px-3 lg:px-4 h-full rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  style={filter === key
                    ? { background: "var(--bg-surface)", color: "var(--brand-orange)", boxShadow: "var(--shadow-raised)" }
                    : { color: "var(--text-muted)" }}>
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
