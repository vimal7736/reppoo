"use client";

import { useState } from "react";
import { Leaf, Eye, EyeOff, AlertCircle, BarChart3, FileText, Users, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    let destination = "/dashboard";
    if (authUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();
      if (profile?.role === "superadmin" || profile?.role === "super_admin" || profile?.role === "admin") {
        destination = "/admin";
      }
    }

    router.push(destination);
  }

  async function handleResendVerification() {
    if (!email) return;
    setResending(true);
    setError(null);
    setSuccess(null);

    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    setResending(false);
    if (resendErr) {
      setError(resendErr.message);
    } else {
      setSuccess("Verification code sent! Please check your inbox.");
      setShowOtp(true);
    }
  }

  async function handleVerifyOtp() {
    if (loading) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/setup-org", { method: "POST" });
      const resData = await res.json();

      if (!res.ok) {
        setError(resData.error || "Failed to setup organisation.");
        setLoading(false);
        return;
      }

      window.location.href = resData.redirect || "/dashboard";
    } catch (e) {
      setError("Network error setting up organisation.");
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ── Left branding panel ─────────────────────────────── */}
      <div className="hidden lg:flex w-[380px] shrink-0 bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-3 mb-10 w-full">
            <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 text-green-900" />
            </div>
            <span className="text-white font-bold text-lg">GreenTrack AI</span>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
          <h2 className="text-white text-2xl font-black leading-snug mb-3">
            Carbon management<br />for UK businesses
          </h2>
          <p className="text-green-300 text-sm leading-relaxed mb-10">
            Track, report, and reduce your carbon footprint using real UK DEFRA emission factors.
          </p>
          <div className="space-y-4">
            {[
              { Icon: BarChart3, text: "Automatic CO₂ calculation from bills" },
              { Icon: FileText, text: "SECR-compliant PDF carbon reports" },
              { Icon: Users, text: "Team management & role-based access" },
              { Icon: ShieldCheck, text: "UK GDPR compliant · Data in London" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-green-300" />
                </div>
                <p className="text-green-200 text-xs">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-green-500 text-[10px]">© 2025 GreenTrack AI · Free to start</p>
      </div>

      {/* ── Right form panel ────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center px-8 lg:px-14"
        style={{ background: "var(--bg-base)" }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between w-full mb-8 max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg" style={{ color: "var(--text-primary)" }}>GreenTrack AI</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black mb-1" style={{ color: "var(--text-primary)" }}>Welcome back</h2>
          <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>Sign in to your account</p>

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2.5 rounded-lg mb-5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg mb-5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
              {!showOtp && error.toLowerCase().includes("email not veriffied") && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="mt-1 self-start text-[11px] font-bold text-red-600 hover:text-red-800 underline flex items-center gap-1 disabled:opacity-50"
                >
                  {resending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {resending ? "Resending..." : "Resend verification email"}
                </button>
              )}
            </div>
          )}

          {showOtp ? (
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-4 text-left">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-primary">
                  Verification Code <span className="text-red-400 ml-1">*</span>
                </label>
                  <input
                  className="recessed-input w-full px-6 py-4 text-sm font-bold placeholder:text-text-muted/50 transition-all text-center text-lg tracking-widest font-mono"
                  required
                  placeholder="000000"
                  maxLength={6}
                  minLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${loading || otp.length < 6 ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={() => { setShowOtp(false); setSuccess(null); setError(null); }}
                className="w-full text-xs text-gray-500 hover:text-gray-700 mt-2 font-medium"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4" autoComplete="off">
              {/* Hidden honeypot fields — trick Chrome into NOT showing password autofill on the real inputs */}
              <input type="text" name="fakeuser" style={{ display: "none" }} readOnly tabIndex={-1} />
              <input type="password" name="fakepass" style={{ display: "none" }} readOnly tabIndex={-1} />

              <Input
                type="text"
                inputMode="email"
                label="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="off"
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
                placeholder="you@company.co.uk"
                maxLength={100}
                minLength={5}
              />

              <Input
                type={showPass ? "text" : "password"}
                label="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
                placeholder="••••••••"
                maxLength={100}
                minLength={8}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                  <input type="checkbox" className="rounded accent-green-600" />
                  Remember me
                </label>
                <a href="#" className="text-green-600 hover:underline font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-1 flex items-center justify-center gap-2 ${loading ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-green-600 font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>

        <p className="absolute bottom-6 text-[10px] text-gray-300">
          UK GDPR compliant · Data stored in London
        </p>
      </div>
    </div>
  );
}
