"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, Search, Users, FileText,
  ExternalLink, Ban, CheckCircle2, Pause, Play,
} from "lucide-react";
import type { AdminOrg } from "@/types";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { AdminSelect } from "@/components/ui/AdminSelect";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

/* ── Style maps ────────────────────────────────────────────── */
const TIER_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  free: { bg: "rgba(120,120,120,0.10)", text: "var(--text-muted)", ring: "rgba(120,120,120,0.20)" },
  starter: { bg: "rgba(59,130,246,0.10)", text: "#3b82f6", ring: "rgba(59,130,246,0.25)" },
  business: { bg: "rgba(34,197,94,0.10)", text: "var(--brand-green-dark)", ring: "rgba(34,197,94,0.25)" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string; icon: typeof CheckCircle2 }> = {
  active: { bg: "rgba(34,197,94,0.10)", text: "var(--brand-green-dark)", ring: "rgba(34,197,94,0.25)", icon: CheckCircle2 },
  suspended: { bg: "rgba(239,68,68,0.10)", text: "#ef4444", ring: "rgba(239,68,68,0.25)", icon: Ban },
};

const TIER_FILTERS = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "starter", label: "Starter" },
  { key: "business", label: "Business" },
];

export default function AdminOrganisationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, free: 0, starter: 0, business: 0 });
  const PAGE_SIZE = 10;

  /* ── Suspend confirmation ─────────────────────────────────── */
  const [suspendTarget, setSuspendTarget] = useState<AdminOrg | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function fetchOrgs() {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        tier: tierFilter,
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/orgs?${params}`);
      if (res.ok) {
        const d = await res.json();
        setOrgs(d.orgs ?? []);
        setTotalPages(d.total_pages ?? 1);
        setTotalItems(d.total ?? 0);
        if (d.stats) setStats(d.stats);
      }
      setLoading(false);
    }
    fetchOrgs();
  }, [page, tierFilter, debouncedSearch]);

  useEffect(() => { setPage(1); }, [tierFilter, debouncedSearch]);

  async function handleSuspendToggle() {
    if (!suspendTarget) return;
    const newStatus = suspendTarget.status === "suspended" ? "active" : "suspended";
    setSuspendLoading(true);
    const res = await fetch("/api/admin/orgs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: suspendTarget.id, status: newStatus }),
    });
    if (res.ok) {
      setOrgs((prev) => prev.map((o) => o.id === suspendTarget.id ? { ...o, status: newStatus } : o));
      toast.success(`Organisation ${newStatus === "suspended" ? "suspended" : "reactivated"} successfully`);
    } else {
      toast.error("Failed to update organisation status");
    }
    setSuspendLoading(false);
    setSuspendTarget(null);
  }

  const totalOrgs = stats.total;
  const starterOrgs = stats.starter;
  const businessOrgs = stats.business;

  const columns: ColumnDef<AdminOrg>[] = [
    {
      key: "name", header: "Organisation",
      render: (org) => (
        <div className="flex items-center gap-2 lg:gap-3 group w-full">
          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center text-[10px] font-black uppercase shrink-0"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)", boxShadow: "var(--shadow-inset-xs)" }}>
            {org.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black tracking-tight flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
              {org.name}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </span>
            {org.status === "suspended" && (
              <span className="text-[8px] font-bold uppercase tracking-widest text-red-500">Suspended</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status", header: "Status", align: "center",
      render: (org) => {
        const status = org.status ?? "active";
        const s = STATUS_STYLES[status] ?? STATUS_STYLES.active;
        const Icon = s.icon;
        return (
          <span className="inline-flex items-center gap-1.5 px-2 lg:px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
            style={{ background: s.bg, color: s.text, border: `1px solid ${s.ring}` }}>
            <Icon className="w-3 h-3" />
            {status}
          </span>
        );
      },
    },
    {
      key: "tier", header: "Plan",
      render: (org) => {
        const s = TIER_STYLES[org.tier] ?? TIER_STYLES.free;
        return <span className="inline-flex items-center px-2 lg:px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
          style={{ background: s.bg, color: s.text, border: `1px solid ${s.ring}` }}>{org.tier}</span>;
      },
    },
    {
      key: "users", header: "Users", align: "center",
      render: (org) => (
        <div className="flex items-center justify-center gap-1.5">
          <Users className="w-3 h-3 text-text-muted opacity-40" />
          <span className="text-xs font-black" style={{ color: "var(--text-primary)" }}>{org.user_count}</span>
        </div>
      ),
    },
    {
      key: "bills", header: "Bills", align: "center",
      render: (org) => (
        <div className="flex items-center justify-center gap-1.5">
          <FileText className="w-3 h-3 text-text-muted opacity-40" />
          <span className="text-xs font-black" style={{ color: "var(--text-primary)" }}>{org.bill_count}</span>
        </div>
      ),
    },
    {
      key: "created", header: "Joined",
      render: (org) => <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{formatDate(org.created_at)}</span>,
    },
    {
      key: "actions", header: "Actions", align: "right",
      render: (org) => {
        const isSuspended = org.status === "suspended";
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSuspendTarget(org); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
            style={{
              background: isSuspended ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.08)",
              color: isSuspended ? "var(--brand-green-dark)" : "#ef4444",
              border: `1px solid ${isSuspended ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.15)"}`,
            }}
          >
            {isSuspended ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {isSuspended ? "Activate" : "Suspend"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 lg:space-y-6 animate-scale-in">
      {/* Stats — 1 col mobile → 3 cols sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        {[
          { label: "Total Organisations", value: totalOrgs, icon: <Building2 className="w-4 h-4" />, accent: "orange" },
          { label: "Starter Plans", value: starterOrgs, icon: <Users className="w-4 h-4" />, accent: "green" },
          { label: "Business Plans", value: businessOrgs, icon: <FileText className="w-4 h-4" />, accent: "green" },
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
            <span className="text-xl lg:text-2xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>{value.toLocaleString("en-GB")}</span>
          </div>
        ))}
      </div>

      <DataTable tableId="admin_organisations" columns={columns} data={orgs} rowKey={(o) => o.id} 
        onRowClick={(o) => router.push(`/admin/organisations/${o.id}`)}
        loading={loading}
        loadingLabel="Loading organisations..." emptyIcon={<Building2 className="w-10 h-10" />}
        emptyTitle="No Organisations Found" emptyMessage="Try adjusting your search or filters."
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
                placeholder="Search organisations..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="!py-0 !h-10 !rounded-xl !shadow-none !bg-transparent !border !border-black/20 focus:!border-black/40"
              />
            </div>
            <div className="flex items-center gap-1 p-1 h-10 rounded-xl overflow-x-auto shrink-0"
              style={{ background: "var(--neu-base)", boxShadow: "var(--shadow-inset-xs)", border: "var(--card-border)", scrollbarWidth: "none" } as React.CSSProperties}>
              {TIER_FILTERS.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setTierFilter(key)}
                  className="px-3 lg:px-4 h-full rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  style={tierFilter === key ? { background: "var(--bg-surface)", color: "var(--brand-orange)", boxShadow: "var(--shadow-raised)" } : { color: "var(--text-muted)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* ── Suspend / Reactivate Confirmation ──────────────────── */}
      <ConfirmDialog
        open={!!suspendTarget}
        title={suspendTarget?.status === "suspended" ? "Reactivate Organisation" : "Suspend Organisation"}
        description={
          suspendTarget?.status === "suspended"
            ? `Are you sure you want to reactivate "${suspendTarget?.name}"? All members will regain access immediately.`
            : `Are you sure you want to suspend "${suspendTarget?.name}"? All members will see a suspension notice when they log in.`
        }
        confirmLabel={suspendTarget?.status === "suspended" ? "Reactivate" : "Suspend"}
        variant={suspendTarget?.status === "suspended" ? "info" : "danger"}
        loading={suspendLoading}
        onConfirm={handleSuspendToggle}
        onCancel={() => setSuspendTarget(null)}
      />
    </div>
  );
}
