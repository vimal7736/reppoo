import { useCallback, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode, MouseEvent } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   "bg-black text-white hover:bg-gt-green-600 hover:shadow-lg hover:shadow-gt-green-500/20",
  secondary: "bg-white text-black hover:bg-black hover:text-white shadow-sm",
  ghost:     "bg-transparent text-text-muted hover:text-text-primary hover:bg-white",
  danger:    "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 border border-red-500",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[9px]",
  md: "px-4 py-2.5 text-[10px]",
  lg: "px-8 py-4 text-[11px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  icon?:     ReactNode;
  children:  ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const { onClick, disabled, ...rest } = props as ButtonProps;
  const [pending, setPending] = useState(false);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    if (disabled || pending) return;

    try {
      const result = onClick?.(e as any);
      if (result && typeof (result as any).then === "function") {
        setPending(true);
        Promise.resolve(result).finally(() => setPending(false));
      }
    } catch (err) {
      // If onClick throws synchronously, ensure button isn't left disabled
      setPending(false);
      throw err;
    }
  }, [disabled, pending, onClick]);

  return (
    <button
      type="button"
      {...rest}
      onClick={handleClick}
      disabled={Boolean(disabled) || pending}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl",
        "font-black uppercase tracking-widest",
        "border-none transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gt-green-500/30",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
