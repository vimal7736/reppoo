"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import withAsyncDisabled from "../../lib/withAsyncDisabled";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastCtx {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
}

/* ── Config ────────────────────────────────────────────────── */
const ICON_MAP: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLOR_MAP: Record<ToastVariant, { accent: string; bg: string; border: string }> = {
  success: {
    accent: "var(--brand-green)",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
  },
  error: {
    accent: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
  warning: {
    accent: "var(--brand-orange)",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.25)",
  },
  info: {
    accent: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
  },
};

const DURATION = 5000;

/* ── Context ───────────────────────────────────────────────── */
const ToastContext = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ── Individual Toast Item (Premium Design) ─────────────────── */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  // Trigger leave animation
  const triggerLeave = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 400); // Wait for exit animation
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (isHovered) return;

    let startTime = Date.now();
    let rAF: number;
    let currentProgress = progress;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const remainingTime = DURATION * (currentProgress / 100) - elapsed;
      
      if (remainingTime <= 0) {
        setProgress(0);
        triggerLeave();
      } else {
        const newProgress = (remainingTime / DURATION) * 100;
        setProgress(newProgress);
        rAF = requestAnimationFrame(animate);
      }
    };

    rAF = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rAF);
  }, [isHovered, triggerLeave, progress]);

  const color = COLOR_MAP[toast.variant];
  const Icon = ICON_MAP[toast.variant];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative flex items-center gap-4 px-4 py-3.5 rounded-2xl overflow-hidden ${
        isLeaving ? "toast-exit" : "toast-enter"
      }`}
      style={{
        background: "var(--bg-inset)",
        boxShadow: "var(--shadow-inset-xs)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
        style={{ background: color.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: color.accent }} />
      </div>
      
      <p className="relative flex-1 text-[13px] font-bold text-text-primary leading-snug tracking-tight">
        {toast.message}
      </p>

      <button
        type="button"
        onClick={withAsyncDisabled(triggerLeave)}
        className="relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 text-text-muted hover:text-text-primary"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
        <div 
          className="h-full transition-all duration-75 ease-linear toast-sparkle"
          style={{ 
            width: `${progress}%`,
            backgroundImage: `linear-gradient(90deg, ${color.accent} 0%, rgba(0,0,0,0.7) 50%, ${color.accent} 100%)`,
            backgroundSize: '200% auto',
            opacity: isHovered ? 0.3 : 1
          }}
        />
      </div>
    </div>
  );
}

/* ── Provider ──────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastCtx = {
    success: (msg) => push("success", msg),
    error: (msg) => push("error", msg),
    warning: (msg) => push("warning", msg),
    info: (msg) => push("info", msg),
  };

  return (
    <ToastContext.Provider value={ctx}>
      <style>{`
        .toast-enter {
          animation: toastSlideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .toast-exit {
          animation: toastFadeUp 0.4s cubic-bezier(0.5, 0, 0.2, 1) forwards;
        }
        .toast-sparkle {
          animation: sparkle 1.5s linear infinite;
        }
        @keyframes sparkle {
          to { background-position: -200% center; }
        }
        @keyframes toastSlideDown {
          0% { opacity: 0; transform: translateY(-40px) scale(0.95); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes toastFadeUp {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.95); filter: blur(4px); }
        }
      `}</style>
      
      {children}

      {/* Toast container — fixed Top Right */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
