import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?:  ReactNode;
  suffix?: ReactNode;
  label?: string;
  error?: string;
}

export function Input({ icon, suffix, label, error, className = "", id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[10px] font-black uppercase tracking-widest text-text-primary"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-gt-green-500 transition-colors pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          {...props}
          className={[
            "recessed-input w-full",
            "py-4 text-sm font-bold",
            icon ? "pl-12" : "px-6",
            suffix ? "pr-12" : "pr-6",
            error ? "!border-brand-orange-dark" : "",
            className,
          ].join(" ")}
          style={props.style}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-brand-orange-dark uppercase tracking-wider">{error}</p>
      )}
    </div>
  );
}
