"use client";
import { useState, useRef, useEffect } from "react";
import withAsyncDisabled from "../../lib/withAsyncDisabled";
import { ChevronDown, Filter } from "lucide-react";

export interface AdminSelectOption {
  value: string;
  label: string;
}

interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  icon?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AdminSelect({ value, onChange, options, icon, placeholder, disabled, className = "" }: AdminSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={`relative shrink-0 inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={withAsyncDisabled(() => setIsOpen(!isOpen))}
        className="w-full flex items-center gap-3 px-4 py-2 rounded-2xl bg-bg-inset/30 border border-border-subtle hover:border-gt-green-500/50 transition-all group active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
      >
        {icon ? (
          <div className="text-text-muted group-hover:text-gt-green-500 transition-colors flex items-center justify-center w-3.5 h-3.5">
            {icon}
          </div>
        ) : (
          <Filter className="w-3.5 h-3.5 text-text-muted group-hover:text-gt-green-500 transition-colors" />
        )}
        <span className="text-[11px] font-black uppercase tracking-widest text-text-primary truncate whitespace-nowrap overflow-hidden">
          {selectedOption ? selectedOption.label : placeholder || "Select..."}
        </span>
        <div className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-48 z-50 h-0 overflow-visible">
          <div
            className="animate-scale-in border shadow-2xl p-2 rounded-2xl"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={withAsyncDisabled(() => {
                  onChange(option.value);
                  setIsOpen(false);
                })}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  value === option.value
                    ? "bg-gt-green-600 text-white shadow-lg"
                    : "text-text-muted hover:text-text-primary"
                }`}
                style={value !== option.value ? { background: "transparent" } : {}}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
