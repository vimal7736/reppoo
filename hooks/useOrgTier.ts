"use client";

import { useState, useEffect } from "react";

/**
 * Returns the current user's organisation tier.
 * Fetches from /api/profile on mount (cached for the lifetime of the component).
 */
export function useOrgTier() {
  const [tier, setTier]     = useState<string | null>(null);
  const [role, setRole]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) {
            setTier(d.org_tier ?? "free");
            setRole(d.role ?? "member");
          }
        }
      } catch {
        if (!cancelled) {
          setTier("free");
          setRole("member");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { tier, role, loading, isFree: tier === "free" };
}
