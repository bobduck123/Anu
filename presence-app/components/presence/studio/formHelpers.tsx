"use client";

// Shared form primitives for the Presence Studio submit step.

import { cloneElement, type ReactElement, type ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<{ className?: string; style?: React.CSSProperties }>;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const baseClass = "presence-studio-input";
  const childClass = children.props.className ? `${baseClass} ${children.props.className}` : baseClass;
  return (
    <label className="presence-studio-field">
      <span className="field-label">{label}</span>
      {cloneElement(children, {
        className: childClass,
        style: { ...(children.props.style ?? {}), borderColor: error ? "#b04338" : undefined },
      })}
      {error && <span className="field-error">{error}</span>}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

interface ConsentRowProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  error?: string;
  children: ReactNode;
}

export function ConsentRow({ checked, onChange, error, children }: ConsentRowProps) {
  return (
    <label className="presence-studio-consent">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {children}
        {error && <span className="consent-error">{error}</span>}
      </span>
    </label>
  );
}

interface TrustCardProps {
  tone: "auto" | "hand" | "editable" | "you";
  title: string;
  items: string[];
}

const TONE_META = {
  auto:     { bar: "var(--studio-ink)",       k: "Automated by the system" },
  hand:     { bar: "var(--studio-copper)",     k: "Done by our studio team" },
  editable: { bar: "var(--studio-moss)",       k: "Always editable" },
  you:      { bar: "var(--studio-copper-soft)", k: "Things we'll need from you" },
} as const;

export function TrustCard({ tone, title, items }: TrustCardProps) {
  const meta = TONE_META[tone];
  return (
    <div className="presence-studio-trust-card">
      <span className="trust-bar" style={{ background: meta.bar }} aria-hidden />
      <div className="trust-body">
        <p className="trust-eyebrow">{meta.k}</p>
        <h3 className="trust-title">{title}</h3>
        <ol className="trust-list">
          {items.map((item, i) => (
            <li key={i}>
              <span className="trust-num">{String(i + 1).padStart(2, "0")}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
