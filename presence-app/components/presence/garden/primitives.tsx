"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// === Brandmark used by Garden/Mask/Halls top frames ===========================
export function PresenceBrandmark({
  label = "Presence",
  href = "/",
  onDark = false,
}: {
  label?: string;
  href?: string;
  onDark?: boolean;
}) {
  return (
    <Link href={href} className="garden-brand" aria-label={`${label} — home`} data-on-dark={onDark || undefined}>
      <span className="glyph" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

// === Eyebrow — small mono label that anchors a section =======================
export function PresenceEyebrow({
  children,
  onStage = false,
  className,
}: {
  children: ReactNode;
  onStage?: boolean;
  className?: string;
}) {
  const cls = ["presence-eyebrow"];
  if (onStage) cls.push("on-stage");
  if (className) cls.push(className);
  return <p className={cls.join(" ")}>{children}</p>;
}

// === Chip ====================================================================
export function PresenceChip({
  children,
  tone = "default",
  live = false,
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "halls" | "rooms" | "dark";
  live?: boolean;
  className?: string;
}) {
  const cls = ["presence-chip"];
  if (tone === "accent") cls.push("is-accent");
  if (tone === "halls") cls.push("is-halls");
  if (tone === "rooms") cls.push("is-rooms");
  if (tone === "dark") cls.push("is-dark");
  if (className) cls.push(className);
  return (
    <span className={cls.join(" ")}>
      <span className={`dot ${live ? "live" : ""}`} aria-hidden />
      {children}
    </span>
  );
}

// === Section head — eyebrow + title + blurb + optional aside =================
export function PresenceSectionHead({
  num,
  label,
  title,
  blurb,
  aside,
}: {
  num?: string;
  label?: string;
  title: ReactNode;
  blurb?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="presence-section-head">
      <div>
        {(num || label) && (
          <p className="garden-section-eyebrow">
            {num && <span className="num">{num}</span>}
            {label && <span>{label}</span>}
          </p>
        )}
        <h2 className="garden-section-title presence-display">{title}</h2>
      </div>
      <div>
        {blurb && <p className="garden-section-blurb">{blurb}</p>}
        {aside}
      </div>
    </header>
  );
}

// === Empty state =============================================================
export function PresenceEmpty({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="presence-empty">
      {eyebrow && <PresenceEyebrow>{eyebrow}</PresenceEyebrow>}
      <p className="garden-section-title presence-display" style={{ margin: 0 }}>
        {title}
      </p>
      {body && (
        <p style={{ margin: 0, color: "var(--presence-on-paper-mute)", fontSize: 14, lineHeight: 1.55, maxWidth: "52ch" }}>
          {body}
        </p>
      )}
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>{actions}</div>}
    </div>
  );
}

// === Button (matches presence-btn classes) ===================================
export function PresenceButton({
  href,
  onClick,
  children,
  variant = "solid",
  tone = "ink",
  size = "default",
  disabled = false,
  onStage = false,
  type = "button",
  ariaLabel,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "solid" | "ghost";
  tone?: "ink" | "accent" | "halls";
  size?: "default" | "small";
  disabled?: boolean;
  onStage?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const cls = ["presence-btn"];
  if (variant === "ghost") cls.push("is-ghost");
  if (tone === "accent") cls.push("is-accent");
  if (tone === "halls") cls.push("is-halls");
  if (size === "small") cls.push("is-small");
  if (onStage) cls.push("on-stage");

  if (href) {
    return (
      <Link href={href} className={cls.join(" ")} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={cls.join(" ")}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
