"use client";
import { useState, useEffect, useRef } from "react";
import { UserPlus, Trash2, Crown, User, Clock, Check, X, ShieldAlert, Building2, AlertTriangle, ChevronDown, Rocket, Zap, Users } from "lucide-react";
import { isPublicDomain } from "@/lib/utils/domain";

import type { TeamMember, TeamApiResponse } from "@/types";
import { formatDate } from "@/lib/utils/format";
import { PageLayout } from "@/components/ui/PageLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useApi } from "@/hooks/useApi";
import { useFetch } from "@/hooks/useFetch";

function RoleSelector({ currentRole, onRoleChange }: { currentRole: string, onRoleChange: (role: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={roleRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-4 h-[34px] rounded-xl bg-bg-surface border border-border-default hover:border-gt-green-500/50 transition-all group active:scale-95 shadow-sm min-w-[110px]"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-primary">
          {currentRole}
        </span>
        <div className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-36 z-50 h-0 overflow-visible">
          <div
            className="animate-scale-in border shadow-2xl p-2 rounded-2xl"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
          >
            {["owner", "member"].map((r) => (
              <button
                key={r}
                onClick={() => { onRoleChange(r); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${currentRole === r
                    ? "bg-gt-green-600 text-white shadow-lg"
                    : "text-text-muted hover:text-text-primary"
                  }`}
                style={currentRole !== r ? { background: "transparent" } : {}}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { data: teamData, loading, error: fetchError, refetch: fetchTeam } = useFetch<any>("/api/team");
  const members = teamData?.members ?? [];
  const org = teamData?.org ?? null;
  const myRole = teamData?.myRole ?? "member";
  const isAdmin = myRole === "owner";
  const normalizeRole = (role: string) => role === "admin" ? "member" : role;

  useEffect(() => {
    if (org) {
      setDomain(org.discovery_domain || "");
      setAllowDiscovery(org.allow_discovery);
    }
  }, [org]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePass, setInvitePass] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "success" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const [domain, setDomain] = useState("");
  const [allowDiscovery, setAllowDiscovery] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");
  const { data: requestData, loading: loadingReq, refetch: fetchRequests } = useFetch<{ requests: any[] }>("/api/team/requests");
  const requests = requestData?.requests ?? [];

  const { call, error: actionError } = useApi();
  const { call: inviteCall, error: inviteError } = useApi();
  const { call: resolveCall } = useApi();

  // Seat limit upgrade modal
  const [seatLimitModal, setSeatLimitModal] = useState<{ open: boolean; seats_limit: number; tier: string } | null>(null);

  async function handleInvite() {
    if (!inviteEmail) return;
    if (invitePass.length < 8) return;
    setInviting(true);
    const { ok } = await inviteCall("/api/team", {
      method: "POST",
      body: JSON.stringify({
        email: inviteEmail,
        fullName: inviteName,
        password: invitePass
      }),
    });
    setInviting(false);
    if (ok) {
      setInviteStatus("success");
      setInviteEmail("");
      setInviteName("");
      setInvitePass("");
      fetchTeam();
      setTimeout(() => setInviteStatus("idle"), 3000);
    } else {
      setInviteStatus("error");
    }
  }

  function handleRemove(userId: string) {
    setMemberToRemove(userId);
  }

  async function handleRoleChange(userId: string, role: string) {
    const { ok } = await call(`/api/team/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    if (ok) fetchTeam();
  }

  async function resolveRequest(requestId: string, action: "approve" | "reject") {
    const { ok, data } = await resolveCall("/api/team/requests/resolve", {
      method: "POST",
      body: JSON.stringify({ requestId, action }),
    });
    if (!ok && (data as any)?.error === "seat_limit_reached") {
      setSeatLimitModal({ open: true, seats_limit: (data as any).seats_limit, tier: (data as any).tier });
      return;
    }
    if (ok) {
      fetchRequests();
      if (action === "approve") fetchTeam();
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    const { ok } = await call("/api/org/settings", {
      method: "PATCH",
      body: JSON.stringify({
        discovery_domain: domain.toLowerCase().trim(),
        allow_discovery: allowDiscovery,
      }),
    });
    setSavingSettings(false);
    if (ok) fetchTeam();
  }

  const seatsFull = org ? members.length >= org.seats_limit : false;

  const columns: ColumnDef<TeamMember>[] = [
    {
      key: "member",
      header: "Member",
      render: (member) => {
        const initials = member.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        return (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gt-green-500 to-gt-green-700 flex items-center justify-center text-xs font-black text-white shadow-lg group-hover:scale-110 transition-transform">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-text-primary">{member.full_name}</p>
                {member.role === "owner" && <Crown className="w-3 h-3 text-yellow-500" />}
              </div>
              <p className="text-[9px] font-bold text-text-muted opacity-60 uppercase tracking-widest mt-0.5">{member.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role & Actions",
      align: "right",
      render: (member) => (
        <div className="text-right flex flex-col items-end justify-center">
          <p className="text-[9px] font-bold text-text-muted mb-1.5 opacity-40 uppercase tracking-widest">
            Registered {formatDate(member.created_at)}
          </p>
          <div className="flex items-center gap-2">
            {isAdmin && member.role !== "owner" && (
              <button
                type="button"
                title="Remove Member"
                disabled={deletingId === member.id}
                onClick={() => handleRemove(member.id)}
                className="w-[34px] h-[34px] rounded-xl flex items-center justify-center bg-red-500/5 text-red-500 border border-red-500/10 hover:bg-red-500/10 hover:text-red-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {member.role === "owner" ? (
              <span className="text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-700 border border-yellow-500/20">
                System Owner
              </span>
            ) : (
              <div className="relative inline-block">
                {isAdmin ? (
                  <RoleSelector currentRole={normalizeRole(member.role)} onRoleChange={(r) => handleRoleChange(member.id, r)} />
                ) : (
                  <span className="text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-[0.1em] bg-gray-50 text-gray-400 border border-gray-100 shadow-inner flex items-center h-[34px]">
                    {normalizeRole(member.role)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  const seatWidget = org ? (
    <div className="hidden xl:flex items-center gap-3 px-4 h-[44px] rounded-2xl border border-border-subtle bg-bg-surface/50 shadow-sm mr-4">
      <div className="flex items-center gap-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-80">
          Seat Utilization
        </p>
        <p className="text-sm font-black text-text-primary tracking-tighter">
          {members.length}<span className="text-[10px] opacity-40">/</span>{org.seats_limit}
        </p>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: Math.min(org.seats_limit, 6) }, (_, i) => (
          <div
            key={i}
            className={`w-1.5 h-4 rounded-full transition-all duration-500 ${i < members.length
                ? "bg-gt-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                : "bg-bg-inset"
              }`}
          />
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <PageLayout
      icon={<UserPlus className="w-6 h-6" />}
      title="Collaborators"
      subtitle={`Managing governance and access for ${org?.name ?? "your organisation"}`}
      className="!pb-0"
    >

      {/* ── Confirm Removal Dialog ─────────────────────────────── */}
      <ConfirmDialog
        open={!!memberToRemove}
        title="Remove Member"
        description="Are you sure you want to remove this member from your organisation? They will lose all access to data and settings immediately."
        confirmLabel="Remove Member"
        variant="danger"
        loading={deletingId !== null}
        onConfirm={async () => {
          if (!memberToRemove) return;
          const userId = memberToRemove;
          setDeletingId(userId);
          const { ok } = await call(`/api/team/${userId}`, { method: "DELETE" });
          setDeletingId(null);
          setMemberToRemove(null);
          if (ok) fetchTeam();
        }}
        onCancel={() => !deletingId && setMemberToRemove(null)}
      />

      {/* ── Seat Limit Upgrade Modal ─────────────────────────────── */}
      {seatLimitModal?.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setSeatLimitModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated gradient header */}
            <div className="relative h-36 flex items-center justify-center overflow-hidden"
              style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)" }}
            >
              {/* Floating orbs */}
              <div className="absolute w-32 h-32 rounded-full opacity-20 animate-pulse" style={{ background: "radial-gradient(circle, #34d399, transparent)", top: "-20px", left: "-20px" }} />
              <div className="absolute w-24 h-24 rounded-full opacity-20 animate-pulse" style={{ background: "radial-gradient(circle, #6ee7b7, transparent)", bottom: "-10px", right: "-10px", animationDelay: "0.5s" }} />
              <div className="relative flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl animate-bounce">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Capacity Reached</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-7">
              <h2 className="text-xl font-black text-text-primary tracking-tight mb-1">
                Your team is full
                <Rocket className="w-5 h-5 inline-block ml-2 text-gt-green-500" />
              </h2>
              <p className="text-sm text-text-muted leading-relaxed mb-6">
                You&apos;ve hit the <strong className="text-text-primary">{seatLimitModal.seats_limit}-seat limit</strong> on your <strong className="text-text-primary capitalize">{seatLimitModal.tier}</strong> plan.
                Upgrade to unlock unlimited seats and powerful collaboration features.
              </p>

              {/* Feature highlights */}
              <div className="space-y-2.5 mb-7">
                {[
                  { icon: Users, label: "Unlimited team members" },
                  { icon: Zap, label: "Priority data processing" },
                  { icon: ShieldAlert, label: "Advanced role permissions" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-inset)" }}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-text-primary">{label}</span>
                    <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2">
                <a
                  href="/billing"
                  className="w-full py-3.5 rounded-2xl font-black text-sm text-white text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
                >
                  ✦ Upgrade Plan — Unlock More Seats
                </a>
                <button
                  onClick={() => setSeatLimitModal(null)}
                  className="w-full py-3 rounded-2xl text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSeatLimitModal(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {isAdmin && (
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="hidden lg:block h-[44px]" aria-hidden="true" />
            <div id="tour-team-provision" className="premium-card p-6 sm:p-8 flex flex-col gap-6">
              <SectionHeader
                title="Provision Access"
                subtitle="Invite a new climate auditor"
              />

              {seatsFull ? (
                <div className="p-4 rounded-2xl bg-brand-orange/5 border border-brand-orange/20 space-y-3">
                  <p className="text-[10px] font-bold text-brand-orange-dark leading-relaxed uppercase tracking-widest">
                    Capacity Limit Reached
                  </p>
                  <a
                    href="/billing"
                    role="button"
                    aria-label="Expand plan and upgrade seats"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[9px] uppercase tracking-widest text-white transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gt-green-500 shadow-sm"
                    style={{ background: "linear-gradient(135deg, #fb923c, #f97316)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Rocket className="w-4 h-4 text-white" />
                    <span>Expand Plan</span>
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="James Mitchell"
                    minLength={2}
                    maxLength={50}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    minLength={5}
                    maxLength={100}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={invitePass}
                    onChange={(e) => setInvitePass(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    maxLength={100}
                    required
                   
                  />
                  <p className="text-[9px] text-text-muted italic opacity-60">
                    Password is required to create a new user.
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    icon={<UserPlus className="w-4 h-4" />}
                    disabled={inviting || !inviteEmail || invitePass.length < 8}
                    onClick={handleInvite}
                  >
                    {inviting ? "Processing..." : inviteStatus === "success" ? "Access Provisioned" : "Create & Provision Access"}
                  </Button>

                  {inviteStatus === "success" && (
                    <p className="text-[9px] font-black text-gt-green-600 uppercase tracking-widest text-center animate-fade-in">
                      ✓ Audit link successfully transmitted
                    </p>
                  )}
                  {inviteStatus === "error" && (
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest text-center animate-fade-in">
                      ⚠ {inviteError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div id="tour-team-discovery" className="premium-card p-6 flex flex-col gap-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Discovery Settings
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-5 rounded-full relative transition-all ${allowDiscovery ? "bg-gt-green-500" : "bg-bg-inset"}`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={allowDiscovery}
                      onChange={e => setAllowDiscovery(e.target.checked)}
                    />
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${allowDiscovery ? "left-6" : "left-1"}`} />
                  </div>
                  <span className="text-[11px] font-bold text-text-primary group-hover:text-gt-green-600 transition-colors">
                    Enable Domain Discovery
                  </span>
                </label>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-40">Organisation Domain</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40 text-xs">@</span>
                      <input
                        className="recessed-input w-full pl-8 pr-6 py-4 text-sm font-bold transition-all"
                        placeholder="company.com"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        minLength={3}
                        maxLength={100}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={savingSettings || (domain === org?.discovery_domain && allowDiscovery === org?.allow_discovery) || isPublicDomain(domain)}
                      onClick={handleSaveSettings}
                    >
                      {savingSettings ? "..." : "Save"}
                    </Button>
                  </div>
                  {domain && isPublicDomain(domain) ? (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-red-600 leading-relaxed font-bold">
                        Public domains like gmail.com are shared by millions of people and cannot be used for discovery. Enter your company&apos;s own domain (e.g. <span className="font-black">yourcompany.com</span>).
                      </p>
                    </div>
                  ) : (
                    <p className="text-[8px] text-text-muted leading-relaxed opacity-60">
                      Allows users with this email domain to find and request to join your organisation automatically during signup.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="tour-team-table" className={isAdmin ? "lg:col-span-2 flex flex-col gap-6 min-h-0" : "lg:col-span-3 flex flex-col gap-6 min-h-0"}>
          {activeTab === "members" ? (
            <DataTable<TeamMember> tableId="team_members"
              fullHeight
              toolbarLeft={
                <div className="flex w-full items-center justify-between">
                  <div className="flex gap-1.5 p-1.5 bg-bg-inset rounded-2xl w-fit shrink-0">
                    <button
                      onClick={() => setActiveTab("members")}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer bg-white text-gt-green-600 shadow-sm`}
                    >
                      Active Members ({members.length})
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setActiveTab("requests")}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-primary`}
                      >
                        Join Requests {requests.length > 0 && (
                          <span className="w-4 h-4 bg-gt-green-500 text-white rounded-full flex items-center justify-center text-[8px] animate-pulse">
                            {requests.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  {seatWidget}
                </div>
              }
              columns={columns}
              data={members}
              rowKey={(m) => m.id}
              loading={loading}
              loadingLabel="Querying team registry..."
              emptyIcon={<UserPlus className="w-10 h-10 text-gt-green-500" />}
              emptyTitle="No Team Members"
              emptyMessage="Invite your first collaborator to get started."
              mobileRender={(member) => {
                const initials = member.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gt-green-500 to-gt-green-700 flex items-center justify-center text-[10px] font-black text-white shadow shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-text-primary truncate">{member.full_name}</p>
                        {member.role === "owner" && <Crown className="w-3 h-3 text-yellow-500 shrink-0" />}
                      </div>
                      <p className="text-[9px] text-text-muted opacity-80 uppercase tracking-widest truncate">{member.email}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {member.role === "owner" ? (
                        <span className="text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-700">
                          Owner
                        </span>
                      ) : (
                        <div className="relative inline-block">
                          {isAdmin ? (
                            <RoleSelector currentRole={normalizeRole(member.role)} onRoleChange={(r) => handleRoleChange(member.id, r)} />
                          ) : (
                            <span className="text-[9px] px-3 py-2 rounded-xl font-black uppercase tracking-[0.1em] bg-gray-50 text-gray-400 border border-gray-100 shadow-inner">
                              {normalizeRole(member.role)}
                            </span>
                          )}
                        </div>
                      )}
                      {isAdmin && member.role !== "owner" && (
                        <button
                          type="button"
                          title="Remove Member"
                          disabled={deletingId === member.id}
                          onClick={() => handleRemove(member.id)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/5 text-red-500 border border-red-500/10 hover:bg-red-500/10 hover:text-red-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }}
              footer={
                <div className="px-4 sm:px-8 py-4 bg-bg-inset/10 flex items-center justify-between">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                    {members.length} Verified Accounts
                  </p>
                </div>
              }
            />
          ) : (
            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-center">
                <div className="flex w-full items-center justify-between">
                  <div className="flex gap-1.5 p-1.5 bg-bg-inset rounded-2xl w-fit shrink-0">
                    <button
                      onClick={() => setActiveTab("members")}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-text-muted hover:text-text-primary`}
                    >
                      Active Members ({members.length})
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setActiveTab("requests")}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer bg-white text-gt-green-600 shadow-sm`}
                      >
                        Join Requests {requests.length > 0 && (
                          <span className="w-4 h-4 bg-gt-green-500 text-white rounded-full flex items-center justify-center text-[8px] animate-pulse">
                            {requests.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  {seatWidget}
                </div>
              </div>
              {requests.length === 0 ? (
                <div className="premium-card p-12 text-center flex flex-col items-center justify-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-3xl bg-bg-inset flex items-center justify-center text-text-muted/30">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-primary">No Pending Requests</h3>
                    <p className="text-[11px] text-text-muted mt-1">Users who find your organisation via domain discovery will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div key={req.id} className="premium-card p-5 flex items-center justify-between group hover:border-gt-green-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-bg-inset flex items-center justify-center text-text-muted">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-primary tracking-tight">{req.full_name}</p>
                          <p className="text-[10px] font-bold text-text-muted opacity-50 uppercase tracking-widest mt-0.5">{req.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-red-500 hover:bg-red-50 border-red-100"
                          onClick={() => resolveRequest(req.id, "reject")}
                        >
                          <X className="w-3.5 h-3.5 mr-1.5" /> Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => resolveRequest(req.id, "approve")}
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5" /> Approve Access
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-5 rounded-2xl bg-bg-surface border border-border-default shadow-sm flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-gt-green-600 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-gt-green-700 uppercase tracking-[0.1em]">Security Note</p>
                  <p className="text-[10px] font-bold text-text-primary leading-relaxed">
                    Approving a request grants the user "Member" access immediately. They will be able to view and contribute data for <span className="text-gt-green-600 font-black">{org?.name}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
