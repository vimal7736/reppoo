"use client";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users, Search, Shield, UserCheck, User as UserIcon,
  ChevronDown, ExternalLink, Ban, CheckCircle2,
  Mail, Calendar, MapPin, Activity, X, FileText, Leaf, ShieldAlert,
} from "lucide-react";
import type { AdminUser } from "@/types";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { AdminSelect } from "@/components/ui/AdminSelect";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

/* ── Role badge styles ─────────────────────────────────────── */
const ROLE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  owner:       { bg: "rgba(249,115,22,0.10)", text: "var(--brand-orange-dark)", ring: "rgba(249,115,22,0.20)" },
  admin:       { bg: "rgba(239,68,68,0.10)",  text: "#ef4444",                 ring: "rgba(239,68,68,0.20)" },
  member:      { bg: "rgba(120,120,120,0.08)", text: "var(--text-muted)",       ring: "rgba(120,120,120,0.15)" },
  superadmin:  { bg: "rgba(239,68,68,0.10)",  text: "#ef4444",                 ring: "rgba(239,68,68,0.20)" },
  super_admin: { bg: "rgba(239,68,68,0.10)",  text: "#ef4444",                 ring: "rgba(239,68,68,0.20)" },
};

function isPlatformAdmin(role: string) {
  return role === "admin" || role === "superadmin" || role === "super_admin";
}

const ROLE_FILTERS = [
  { key: "all",    label: "All" },
  { key: "owner",  label: "Owners" },
  { key: "member", label: "Members" },
  { key: "admin",  label: "Admins" },
];

const ASSIGNABLE_ROLES = ["owner", "member"];

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, owners: 0, admins: 0, members: 0 });
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
        role: roleFilter,
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const d = await res.json();
        setUsers(d.users ?? []);
        setTotalPages(d.total_pages ?? 1);
        setTotalItems(d.total ?? 0);
        if (d.stats) setStats(d.stats);
      }
      setLoading(false);
    }
    load();
  }, [page, roleFilter, debouncedSearch]);

  useEffect(() => { setPage(1); }, [roleFilter, debouncedSearch]);

  /* ── Disable confirmation ────────────────────────────────── */
  const [disableTarget, setDisableTarget] = useState<AdminUser | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);

  /* ── Role change confirmation ────────────────────────────── */
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ user: AdminUser; newRole: string } | null>(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userModalLoading, setUserModalLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);



  /* ── Role change handler ──────────────────────────────────── */
  function initiateRoleChange(user: AdminUser, newRole: string) {
    if (user.role === "superadmin" || user.role === "super_admin") {
      toast.error("Cannot change a superadmin's role");
      return;
    }
    setRoleChangeTarget({ user, newRole });
  }

  async function confirmRoleChange() {
    if (!roleChangeTarget) return;
    const { user, newRole } = roleChangeTarget;
    setRoleChangeLoading(true);

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, role: newRole }),
    });

    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`${user.full_name}'s role updated to ${newRole}`);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to change role");
    }

    setRoleChangeLoading(false);
    setRoleChangeTarget(null);
  }

  /* ── Disable/Enable handler ──────────────────────────────── */
  async function handleDisableToggle() {
    if (!disableTarget) return;
    const isCurrentlyDisabled = (disableTarget as AdminUser & { is_disabled?: boolean }).is_disabled;
    const action = isCurrentlyDisabled ? "enable" : "disable";
    setDisableLoading(true);

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: disableTarget.id, action }),
    });

    if (res.ok) {
      setUsers((prev) => prev.map((u) =>
        u.id === disableTarget.id
          ? { ...u, is_disabled: !isCurrentlyDisabled } as AdminUser
          : u
      ));
      toast.success(`User ${action === "disable" ? "disabled" : "enabled"} successfully`);
    } else {
      toast.error(`Failed to ${action} user`);
    }

    setDisableLoading(false);
    setDisableTarget(null);
  }

  async function handleUserClick(userId: string) {
    // Open modal immediately with loading state so user gets instant feedback
    setSelectedUser(null);
    setUserModalOpen(true);
    setUserModalLoading(true);
    try {
      const res = await fetch(`/api/admin/users?detail=${userId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.user) {
          setSelectedUser(d.user);
        } else {
          toast.error("User details not found");
          setUserModalOpen(false);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || `Error ${res.status}: Failed to load user details`);
        setUserModalOpen(false);
      }
    } catch (e) {
      toast.error("Network error loading user details");
      setUserModalOpen(false);
    }
    setUserModalLoading(false);
  }

  /* ── Stats ──────────────────────────────────────────────── */
  const { total: totalUsers, owners: ownerCount, admins: adminCount, members: memberCount } = stats;

  /* ── Columns ────────────────────────────────────────────── */
  const columns: ColumnDef<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => {
        const initials = (u.full_name || "?")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const isDisabled = (u as AdminUser & { is_disabled?: boolean }).is_disabled;
        return (
          <div 
            className="flex items-center gap-2 lg:gap-3 group text-left focus:outline-none w-full"
          >
            <div
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 relative"
              style={{
                background: isDisabled
                  ? "linear-gradient(145deg, #6b7280, #9ca3af)"
                  : "linear-gradient(145deg, var(--brand-green-dark), var(--brand-green))",
                color: "#fff",
                boxShadow: "var(--shadow-raised)",
                opacity: isDisabled ? 0.6 : 1,
              }}
            >
              {initials}
              {isDisabled && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 flex items-center justify-center"
                  style={{ borderColor: "var(--neu-base)" }}>
                  <Ban className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-tight truncate flex items-center gap-1.5 group-hover:text-brand-orange transition-colors" style={{ color: "var(--text-primary)" }}>
                {u.full_name}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
              </p>
              <p className="text-[9px] font-bold text-text-muted opacity-50 truncate">
                {u.email}
              </p>
              {isDisabled && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest mt-0.5"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>
                  <Ban className="w-2 h-2" /> Disabled
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "org",
      header: "Organisation",
      render: (u) => {
        const platform = isPlatformAdmin(u.role);
        if (platform) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
              style={{ color: "#ef4444" }}>
              <ShieldAlert className="w-3 h-3" />
              GreenTrack Platform
            </span>
          );
        }
        return (
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {u.org_name}
          </span>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      align: "center",
      render: (u) => {
        const style = ROLE_STYLES[u.role] ?? ROLE_STYLES.member;
        const platform = isPlatformAdmin(u.role);
        return (
          <span
            className="inline-flex items-center gap-1 px-2 lg:px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
            style={{
              background: style.bg,
              color: style.text,
              border: `1px solid ${style.ring}`,
            }}
          >
            {platform && <ShieldAlert className="w-3 h-3" />}
            {platform ? "Platform Admin" : u.role.replace("_", " ")}
          </span>
        );
      },
    },
    {
      key: "joined",
      header: "Joined",
      render: (u) => (
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          {formatDate(u.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (u) => {
        const isSuperadmin = u.role === "superadmin" || u.role === "super_admin";
        if (isSuperadmin || isPlatformAdmin(u.role)) return <span className="text-[9px] font-bold text-text-muted opacity-30">Protected</span>;

        const isDisabled = (u as AdminUser & { is_disabled?: boolean }).is_disabled;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDisableTarget(u); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95"
            style={{
              background: isDisabled ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.08)",
              color: isDisabled ? "var(--brand-green-dark)" : "#ef4444",
              border: `1px solid ${isDisabled ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.15)"}`,
            }}
          >
            {isDisabled ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
            {isDisabled ? "Enable" : "Disable"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 lg:space-y-6 animate-scale-in">
      {/* ── Stats — 2 cols mobile → 4 desktop ───────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: "Total Users", value: totalUsers, icon: <Users className="w-4 h-4" />, accent: "orange" },
          { label: "Owners", value: ownerCount, icon: <Shield className="w-4 h-4" />, accent: "orange" },
          { label: "Admins", value: adminCount, icon: <UserCheck className="w-4 h-4" />, accent: "green" },
          { label: "Members", value: memberCount, icon: <UserIcon className="w-4 h-4" />, accent: "green" },
        ].map(({ label, value, icon, accent }) => (
          <div
            key={label}
            className="premium-card p-4 lg:p-5"
            style={{ borderTop: `3px solid ${accent === "green" ? "var(--brand-green)" : "var(--brand-orange)"}` }}
          >
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-50">{label}</span>
              <div
                className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--neu-base)",
                  boxShadow: "var(--shadow-inset-sm)",
                  color: accent === "green" ? "var(--brand-green-dark)" : "var(--brand-orange-dark)",
                }}
              >
                {icon}
              </div>
            </div>
            <span className="text-xl lg:text-2xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <DataTable tableId="admin_users"
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        onRowClick={(u) => handleUserClick(u.id)}
        loading={loading}
        loadingLabel="Loading users..."
        emptyIcon={<Users className="w-10 h-10" />}
        emptyTitle="No Users Found"
        emptyMessage="Try adjusting your search or filters."
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
                placeholder="Search by name, email, or organisation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!py-0 !h-10 !rounded-xl !shadow-none !bg-transparent !border !border-black/20 focus:!border-black/40"
              />
            </div>
    
            {/* Role filter — horizontally scrollable on mobile */}
            <div
              className="flex items-center gap-1 p-1 h-10 rounded-xl overflow-x-auto shrink-0"
              style={{
                background: "var(--neu-base)",
                boxShadow: "var(--shadow-inset-xs)",
                border: "var(--card-border)",
                scrollbarWidth: "none",
              } as React.CSSProperties}
            >
              {ROLE_FILTERS.map(({ key, label }) => (
                <div key={key} className="flex items-center h-full">
                  {key === "admin" && (
                    <div className="w-px h-5 mx-1 rounded-full" style={{ background: "var(--card-border-color, rgba(0,0,0,0.10))" }} />
                  )}
                  <button
                    type="button"
                    onClick={() => setRoleFilter(key)}
                    className="px-3 h-full rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                    style={
                      roleFilter === key
                        ? {
                          background: key === "admin" ? "rgba(239,68,68,0.10)" : "var(--bg-surface)",
                          color: key === "admin" ? "#ef4444" : "var(--brand-orange)",
                          boxShadow: "var(--shadow-raised)",
                        }
                        : {
                          color: key === "admin" ? "rgba(239,68,68,0.6)" : "var(--text-muted)",
                        }
                    }
                  >
                    {label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {/* ── Disable / Enable Confirmation ──────────────────── */}
      <ConfirmDialog
        open={!!disableTarget}
        title={
          (disableTarget as AdminUser & { is_disabled?: boolean })?.is_disabled
            ? "Enable User Account"
            : "Disable User Account"
        }
        description={
          (disableTarget as AdminUser & { is_disabled?: boolean })?.is_disabled
            ? `Are you sure you want to re-enable "${disableTarget?.full_name}"? They will regain full access.`
            : `Are you sure you want to disable "${disableTarget?.full_name}"? They will be blocked from logging in.`
        }
        confirmLabel={
          (disableTarget as AdminUser & { is_disabled?: boolean })?.is_disabled ? "Enable" : "Disable"
        }
        variant={
          (disableTarget as AdminUser & { is_disabled?: boolean })?.is_disabled ? "info" : "danger"
        }
        loading={disableLoading}
        onConfirm={handleDisableToggle}
        onCancel={() => setDisableTarget(null)}
      />

      {/* ── Role Change Confirmation ───────────────────────── */}
      <ConfirmDialog
        open={!!roleChangeTarget}
        title="Change User Role"
        description={`Change ${roleChangeTarget?.user.full_name}'s role from "${roleChangeTarget?.user.role}" to "${roleChangeTarget?.newRole}"?`}
        confirmLabel="Change Role"
        variant="warning"
        loading={roleChangeLoading}
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleChangeTarget(null)}
      />

      {/* User Detail Modal */}
      <UserDetailModal 
        user={selectedUser} 
        isOpen={userModalOpen}
        loading={userModalLoading}
        onClose={() => { setUserModalOpen(false); setSelectedUser(null); }} 
      />
    </div>
  );
}

/* ── Helper: User Detail Modal ──────────────────────────────── */
function UserDetailModal({ user, isOpen, loading, onClose }: { user: any; isOpen: boolean; loading?: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-hidden" style={{ zIndex: 99999 }}>
      {/* Full-screen backdrop — covers sidebar too */}
      <div
        className="absolute inset-0 backdrop-blur-xl animate-fade-in"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl flex flex-col animate-scale-in shadow-2xl"
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}>

        {/* Loading overlay — shown while fetching user details */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)" }}>
            <div className="w-10 h-10 rounded-full border-4 border-brand-green/20 border-t-brand-green animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-60">Loading user details…</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black uppercase text-white shrink-0"
            style={{ background: "linear-gradient(145deg, var(--brand-green), var(--brand-green-dark))", boxShadow: "var(--shadow-raised)" }}>
            {user ? (user.full_name ? user.full_name.charAt(0).toUpperCase() : "?") : "…"}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black tracking-tight text-text-primary truncate">{user ? user.full_name : "Loading…"}</h2>
            <span className="text-[9px] font-bold text-text-muted opacity-50 uppercase tracking-widest">User Profile Details</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-inset transition-colors text-text-muted shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {user && (
            <>
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2">
                <ModalDetailRow icon={<Mail className="w-3 h-3" />}    label="Email"        value={user.email} />
                <ModalDetailRow icon={<MapPin className="w-3 h-3" />}  label="Organisation" value={user.org_name ?? "—"} />
                <ModalDetailRow icon={<Shield className="w-3 h-3" />}  label="Role"         value={user.role} isBadge />
                <ModalDetailRow icon={<Activity className="w-3 h-3" />} label="Status"      value={user.is_disabled ? "Disabled" : "Active"} valueColor={user.is_disabled ? "#ef4444" : "var(--brand-green-dark)"} />
                <ModalDetailRow icon={<Calendar className="w-3 h-3" />} label="Joined"      value={formatDate(user.created_at)} />
                <ModalDetailRow icon={<Leaf className="w-3 h-3" />}    label="ID"           value={user.id} isCode />
              </div>

              {/* Recent Billing */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-3 rounded-full bg-brand-orange" />
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">Recent Billing Activity</p>
                </div>
                <div className="space-y-1.5">
                  {(!user.bills || user.bills.length === 0) ? (
                    <div className="p-5 text-center rounded-xl border border-dashed border-border-subtle/40">
                      <p className="text-[10px] font-bold text-text-muted opacity-40 uppercase tracking-widest">No activity recorded</p>
                    </div>
                  ) : (
                    user.bills.slice(0, 5).map((bill: any) => (
                      <BillActivityRow key={bill.id} bill={bill} />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border-subtle/50 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-bg-inset text-text-muted hover:bg-bg-surface transition-all active:scale-95">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ModalDetailRow({ icon, label, value, isBadge, isCode, valueColor }: { icon: React.ReactNode; label: string; value: string; isBadge?: boolean; isCode?: boolean; valueColor?: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(0,0,0,0.07)", color: "#6b7280" }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>{label}</p>
        {isBadge ? (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
            {value}
          </span>
        ) : (
          <p
            className={`text-xs font-bold truncate ${isCode ? "font-mono text-[9px] opacity-70" : ""}`}
            style={{ color: valueColor ?? "#111827" }}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function BillActivityRow({ bill }: { bill: any }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)" }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.10)" }}>
          <FileText className="w-3 h-3" style={{ color: "#16a34a" }} />
        </div>
        <div>
          <p className="text-[11px] font-black capitalize" style={{ color: "#111827" }}>{bill.bill_type.replace("_", " ")} Bill</p>
          <p className="text-[9px] font-bold" style={{ color: "#9ca3af" }}>{formatDate(bill.bill_date)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[11px] font-black" style={{ color: "#16a34a" }}>{bill.co2_kg.toFixed(1)} kg</p>
        <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>CO₂e</p>
      </div>
    </div>
  );
}

