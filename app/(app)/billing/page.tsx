"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, CreditCard, AlertCircle, ExternalLink } from "lucide-react";

import type { BillingInfo } from "@/types";
import { PLANS } from "@/lib/billing/plans";
import { formatPriceWithVat } from "@/lib/utils/format";
import { PageLayout } from "@/components/ui/PageLayout";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tooltip } from "@/components/ui/Tooltip";
import { useApi } from "@/hooks/useApi";
import { useFetch } from "@/hooks/useFetch";
import { useOrgTier } from "@/hooks/useOrgTier";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { data: org, loading: orgLoading } = useFetch<BillingInfo>("/api/billing");
  const { role } = useOrgTier();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [highlightPortal, setHighlightPortal] = useState(false);
  const { call, error } = useApi();

  const isMember = role === "member";

  const successParam = searchParams.get("success");
  const cancelledParam = searchParams.get("cancelled");

  async function handleUpgrade(plan: string) {
    setUpgrading(plan);
    const { ok, data } = await call<{ url: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
    setUpgrading(null);
    if (ok && data?.url) {
      window.location.href = data.url;
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    const { ok, data } = await call<{ url: string }>("/api/billing/portal", { method: "POST" });
    setPortalLoading(false);
    if (ok && data?.url) {
      window.location.href = data.url;
    }
  }

  const currentTier = org?.tier ?? "free";

  return (
    <PageLayout
      icon={<CreditCard className="w-6 h-6" />}
      title="Financial Settlement"
      subtitle="Audit your plan, manage subscription cycles, and secure invoices"
      loading={orgLoading}
      loadingLabel="Loading billing data..."
      error={error}
      className="!pb-0"
      alerts={
        <>
          {successParam && <AlertBanner variant="success" message="Subscription Activated " />}
          {cancelledParam && <AlertBanner variant="warning" message="Transaction Interrupted — No resources were committed" />}
        </>
      }
    >
      {/* Current plan banner */}
      {currentTier !== "free" && (
        <HeroBanner
          icon={<CreditCard className="w-8 h-8 text-gt-green-400" />}
          bgIcon={<CheckCircle className="w-40 h-40" />}
          title={<><span className="text-gt-green-400">ACTIVE:</span> {currentTier.toUpperCase()} SYSTEM</>}
          subtitle="Self-service portal enabled for billing & invoices"
          action={
            !isMember ? (
              <div id="manage-financials-btn" className="relative inline-block text-left">
                {highlightPortal && (
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max bg-gt-green-600 text-white text-[11px] font-bold px-3 py-2 rounded-lg shadow-lg animate-bounce z-50 transition-opacity">
                    Manage subscription changes here
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gt-green-600 rotate-45"></div>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<ExternalLink className="w-4 h-4" />}
                  disabled={portalLoading}
                  onClick={handlePortal}
                  className={highlightPortal ? "ring-4 ring-gt-green-500 ring-offset-2 transition-all duration-300" : "transition-all duration-300"}
                >
                  {portalLoading ? "Opening..." : "Manage Financials"}
                </Button>
              </div>
            ) : (
              <div className="text-[9px] font-black text-text-muted uppercase tracking-widest px-4 py-2.5 border border-border-subtle rounded-lg bg-bg-inset shadow-[inset_1px_2px_4px_rgba(0,0,0,0.05)]">
                Billing Restricted
              </div>
            )
          }
        />
      )}

      {/* Plans grid */}
      <div id="tour-billing-plans" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentTier;
          const { vatAmount, totalPrice } = formatPriceWithVat(plan.price, plan.vatRate);

          return (
            <div
              key={plan.id}
              className={`premium-card p-5 sm:p-8 flex flex-col relative transition-all duration-500 overflow-hidden ${isCurrent ? "ring-2 ring-gt-green-500" : ""
                } ${plan.popular && !isCurrent ? "sm:col-span-2 lg:col-span-1" : ""}`}
            >
              {plan.popular && !isCurrent && (
                <div className="absolute top-0 right-0 p-4">
                  <div className="bg-gt-green-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Highest Adoption
                  </div>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 right-0 p-4">
                  <div className="bg-white text-black text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Deployed Now
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-2">{plan.name}</h3>
                {plan.price === 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-text-primary tracking-tighter">0.00</span>
                    <span className="text-xs font-black text-text-muted opacity-40 uppercase tracking-widest">GBP</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-text-primary tracking-tighter">{plan.price}</span>
                      <span className="text-xs font-black text-text-muted opacity-40 uppercase tracking-widest">GBP / MO</span>
                    </div>
                    <p className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-widest opacity-40">
                      + £{vatAmount} VAT = £{totalPrice} NET
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="mt-1 w-4 h-4 rounded-full bg-gt-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-gt-green-500/20 transition-colors">
                      <CheckCircle className="w-3 h-3 text-gt-green-600" />
                    </div>
                    <span className="text-[11px] font-bold text-text-muted group-hover:text-text-primary transition-colors leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const currentPlan = PLANS.find((p) => p.id === currentTier);
                const isDowngrade = currentPlan && plan.price < currentPlan.price;
                const isFree = plan.price === 0;
                
                return (
                  <Button
                    variant={isCurrent || isFree || isDowngrade ? "ghost" : "primary"}
                    fullWidth
                    size="lg"
                    disabled={isCurrent || upgrading !== null || isMember}
                    onClick={() => {
                      if (isFree || isDowngrade) {
                        setHighlightPortal(true);
                        document.getElementById('manage-financials-btn')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => setHighlightPortal(false), 3500);
                        return;
                      }
                      if (!isMember) handleUpgrade(plan.id);
                    }}
                    className={
                      isCurrent
                        ? "bg-bg-inset text-text-muted cursor-default shadow-none"
                        : isFree || isDowngrade
                          ? "bg-bg-inset/50 text-text-primary hover:text-gt-green-600 shadow-none transition-colors border border-border-subtle hover:border-gt-green-500"
                          : isMember
                            ? "bg-bg-inset/50 text-text-muted opacity-60 cursor-not-allowed shadow-none"
                            : ""
                    }
                  >
                    {isCurrent
                      ? "Active Instance"
                      : upgrading === plan.id
                        ? "Provisioning..."
                        : isFree
                          ? "Cancel via Portal"
                          : isDowngrade
                            ? "Downgrade via Portal"
                            : isMember
                              ? "Contact Admin to Upgrade"
                              : "Upgrade Cluster"}
                  </Button>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Support / Security Section - Compact */}
      <div className="flex justify-center mt-12 mb-8">
        <Tooltip
          position="top"
          content="All transactions are handled via Stripe's encrypted infrastructure. We do not store primary credit card data on our servers."
        >
          <div className="flex items-center gap-2 text-text-muted opacity-50 hover:opacity-100 transition-opacity cursor-help px-4 py-2 rounded-full border border-transparent hover:border-border-subtle bg-transparent hover:bg-bg-inset">
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Secure Financial Operations</span>
          </div>
        </Tooltip>
      </div>
    </PageLayout>
  );
}
