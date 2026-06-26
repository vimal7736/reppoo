"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Brain, Lightbulb, AlertCircle, Plus, Cpu, Blocks, Lock, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import withAsyncDisabled from "../lib/withAsyncDisabled";
import { useToast } from "@/components/ui/Toast";

interface AITipAdvisorProps {
  ytdCo2: number;
  annualTarget: number;
  reductionPct: number;
  billTypes: string[];
  sbtiPathway: string;
  onAddStrategy?: (tip: string) => void;
  /** Pass the org tier so the component can gate access for free users */
  orgTier?: string;
}

export function AITipAdvisor({
  ytdCo2,
  annualTarget,
  reductionPct,
  billTypes,
  sbtiPathway,
  onAddStrategy,
  orgTier = "free",
}: AITipAdvisorProps) {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const toast = useToast();

  const isFree = orgTier === "free";

  const fetchTip = async () => {
    // ── Gate: show upgrade prompt for free users ──────────────
    if (isFree) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    setError(null);
    setAdded(false);
    try {
      const res = await fetch("/api/ai/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ytdCo2,
          annualTarget,
          reductionPct,
          billTypes,
          sbtiPathway,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get tip");
      setTip(data.tip);
      setRemaining(data.remaining ?? null);
      
      const remainingMsg = data.remaining !== null ? ` ${data.remaining} tips remaining.` : "";
      toast.success(`AI Strategy generated successfully.${remainingMsg}`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-card p-4 sm:p-5 relative overflow-hidden group transition-all duration-500 h-[260px] flex flex-col justify-center">
      {/* Ambient glow blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-brand-green/20 transition-colors duration-700" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gt-green-500/5 blur-[50px] rounded-full -ml-10 -mb-10 group-hover:bg-gt-green-500/10 transition-colors duration-700" />

      {/* ── FREE USER — Upgrade Overlay ─────────────────────── */}
      {showUpgrade && isFree && (
        <div className="absolute inset-0 z-20 bg-bg-base/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 rounded-[inherit] animate-in fade-in zoom-in-95 duration-300">
          <div
            className="w-full max-w-[260px] rounded-[1.25rem] p-5 sm:p-6 flex flex-col items-center text-center relative overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05) inset",
            }}
          >
            {/* Background glow inside the card */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-gt-green-500/10 to-transparent pointer-events-none" />

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-gt-green-500/10 border border-gt-green-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.15)] mb-3 relative z-10">
              <Lock className="w-5 h-5 text-gt-green-600" />
            </div>

            {/* Typography */}
            <h4 className="text-[14px] font-black text-text-primary uppercase tracking-[0.15em] mb-2 relative z-10">
              Starter Feature
            </h4>
            <p className="text-[12px] font-medium text-text-secondary leading-relaxed mb-5 relative z-10">
              AI carbon insights unlock on <span className="font-black text-gt-green-600">Starter </span> &amp; above.
            </p>

            {/* Buttons */}
            <div className="w-full flex flex-col gap-2 relative z-10">
              <Link
                href="/billing"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                  boxShadow: "0 8px 20px rgba(34,197,94,0.3)",
                }}
              >
                <Zap className="w-3 h-3" />
                Upgrade Now
              </Link>

              <button
                onClick={withAsyncDisabled(() => setShowUpgrade(false))}
                className="w-full py-2 rounded-xl text-[12px] font-black uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary hover:bg-bg-inset"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Card Content ────────────────────────────────── */}
      <div className="relative z-10 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-gt-green-500/10 flex items-center justify-center border border-gt-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]">
              <Brain className="w-4.5 h-4.5 text-gt-green-600" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-black text-text-primary tracking-tight">AI Strategy Advisor</h3>
                {isFree && (
                  <span className="text-[12px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-0.5 bg-gt-green-500/10 text-gt-green-600 border border-gt-green-500/20">
                    <Lock className="w-2 h-2" /> Starter+
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[9.5px] font-bold text-text-muted uppercase tracking-widest">Powered by</p>
                <div className="flex items-center gap-1.5">
                  {tip && !isFree && (
                    <span
                      className="text-[12px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-0.5 bg-purple-500/10 text-purple-600 border border-purple-500/20"
                    >
                      <Blocks className="w-2.5 h-2.5" />
                      Grok AI
                    </span>
                  )}
                  {remaining !== null && (
                    <span className="text-[12px] font-black text-gt-green-600 uppercase tracking-widest bg-gt-green-500/10 px-1.5 py-0.5 rounded border border-gt-green-500/20">
                      {remaining} tips left
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

            {tip && !isFree && (
            <button
              onClick={withAsyncDisabled(fetchTip)}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-bg-inset transition-colors text-text-muted hover:text-gt-green-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        {/* ── State: Idle (no tip yet) ── */}
        {!tip && !loading && !error && (
          <div className="py-2 text-center space-y-3">
            <p className="text-[12px] text-text-muted leading-relaxed font-medium">
              {isFree
                ? "Upgrade to Starter to unlock AI-powered carbon reduction strategies tailored to your emissions data."
                : "Let our AI analyze your emission patterns and targets to suggest a high-impact reduction strategy."}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={fetchTip}
              className="w-full text-[12px] py-2 bg-gradient-to-r from-gt-green-600 to-gt-green-500 hover:from-gt-green-500 hover:to-gt-green-400 border-none shadow-lg shadow-gt-green-500/20"
            >
              {isFree ? (
                <>
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Generate AI Insight
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate AI Insight
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── State: Loading ── */}
        {loading && (
          <div className="py-5 flex flex-col items-center justify-center space-y-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-gt-green-500/20 border-t-gt-green-600 animate-spin" />
              <Sparkles className="w-3.5 h-3.5 text-gt-green-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-[12px] font-black uppercase tracking-widest text-gt-green-600 animate-pulse font-mono">
              Analyzing trajectories...
            </p>
          </div>
        )}

        {/* ── State: Error ── */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-[12px] font-black uppercase tracking-wider">Analysis Failed</span>
            </div>
            <p className="text-[12px] text-red-400/80 font-medium leading-relaxed">
              {error.includes("token not configured")
                ? "Grok API key is missing in .env.local"
                : error}
            </p>
            <Button variant="secondary" size="sm" onClick={fetchTip} className="text-[12px] h-6 px-2.5">
              Try Again
            </Button>
          </div>
        )}

        {/* ── State: Tip ready ── */}
        {tip && !loading && (
          <div className="space-y-3">
            <div className="relative p-3 rounded-xl bg-bg-inset border border-border-subtle group/tip overflow-hidden">
              <div className="absolute -top-1 -right-1 opacity-20 group-hover/tip:opacity-100 transition-opacity">
                <Sparkles className="w-6 h-6 text-gt-green-600/20" />
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 flex-shrink-0">
                  <Lightbulb className="w-3.5 h-3.5 text-gt-green-600" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[12px] text-text-primary font-medium leading-normal italic">
                    "{tip}"
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-[1px] w-3 bg-border-subtle" />
                    <span className="text-[12px] font-black text-text-muted uppercase tracking-widest font-mono">
                      Recommended Action
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {onAddStrategy && (
              <Button
                variant={added ? "secondary" : "primary"}
                size="sm"
                disabled={added}
                onClick={() => {
                  onAddStrategy(tip);
                  setAdded(true);
                }}
                className={`w-full text-[12px] py-2 font-black uppercase tracking-widest transition-all ${added
                  ? "bg-gt-green-500/10 text-gt-green-600 border border-gt-green-500/20 shadow-none hover:bg-gt-green-500/10"
                  : "bg-gt-green-600 hover:bg-gt-green-500 shadow-md"
                  }`}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {added ? "Added to Action Plan!" : "Add to Action Plan"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
