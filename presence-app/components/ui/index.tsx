"use client";

import { forwardRef } from "react";

// ── Surface ────────────────────────────────────────────────────────────────

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "base" | "alt" | "bordered";
}

export function Surface({ tone = "base", className = "", ...props }: SurfaceProps) {
  const bg =
    tone === "alt"
      ? "bg-[var(--p-surface-alt)]"
      : tone === "bordered"
        ? "bg-[var(--p-surface)] border border-[var(--p-border)]"
        : "bg-[var(--p-surface)]";
  return <div className={`rounded-2xl ${bg} ${className}`} {...props} />;
}

// ── Chip ───────────────────────────────────────────────────────────────────

interface ChipProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "muted";
  className?: string;
}

export function Chip({ children, variant = "default", className = "" }: ChipProps) {
  const style =
    variant === "accent"
      ? "bg-[var(--p-accent)] text-white"
      : variant === "muted"
        ? "bg-[var(--p-surface-alt)] text-[var(--p-text-muted)]"
        : "bg-[var(--p-surface-alt)] text-[var(--p-text)]";
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${style} ${className}`}
    >
      {children}
    </span>
  );
}

// ── StatusPill ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  unpublished: "bg-stone-100 text-stone-600 border-stone-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-stone-100 text-stone-500 border-stone-200",
};

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, children, className = "", disabled, ...props },
  ref,
) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-accent)] disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-[var(--p-accent)] text-white hover:bg-[var(--p-accent-dark)] active:scale-[0.98]",
    secondary: "bg-[var(--p-surface-alt)] text-[var(--p-text)] border border-[var(--p-border)] hover:bg-[var(--p-border)]",
    ghost: "text-[var(--p-text-muted)] hover:bg-[var(--p-surface-alt)] hover:text-[var(--p-text)]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<string, string> = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
});

// ── Input ──────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[var(--p-text-muted)] uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full px-3 py-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] text-[var(--p-text)] text-sm placeholder:text-[var(--p-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--p-accent)] focus:border-transparent transition ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

// ── Textarea ───────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = "", id, ...props },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[var(--p-text-muted)] uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={4}
        className={`w-full px-3 py-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] text-[var(--p-text)] text-sm placeholder:text-[var(--p-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--p-accent)] focus:border-transparent transition resize-y ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

// ── Spinner / Loading ──────────────────────────────────────────────────────

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin w-5 h-5 text-[var(--p-text-muted)] ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--p-text-muted)]">
      <Spinner className="w-7 h-7" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="font-medium text-[var(--p-text)]">{title}</p>
      {body && <p className="text-sm text-[var(--p-text-muted)] max-w-xs">{body}</p>}
      {action}
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────

export function SectionHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest ${className}`}>
      {children}
    </h2>
  );
}
