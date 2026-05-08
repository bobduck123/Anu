"use client";

import { use } from "react";
import Link from "next/link";
import { Globe, Eye, Edit, QrCode, BarChart2, Inbox, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading, StatusPill, Button } from "@/components/ui";
import { publishNode, unpublishNode } from "@/lib/api/owner";
import type { PresenceNode } from "@/lib/api/types";
import { canonicalPublicUrl, displayPublicUrl } from "@/lib/presence/url";

const QUICK_LINKS = [
  { label: "Shape portfolio", href: "portfolio", icon: Edit },
  { label: "Selected works", href: "works", icon: Eye },
  { label: "Collections", href: "collections", icon: Eye },
  { label: "Enquiries", href: "enquiries", icon: Inbox },
  { label: "QR & NFC", href: "qr", icon: QrCode },
  { label: "Signals", href: "analytics", icon: BarChart2 },
];

interface ReadinessCheck {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
}

function buildReadinessChecks(node: PresenceNode, baseHref: string): ReadinessCheck[] {
  const works = node.works ?? [];
  const collections = node.collections ?? [];
  const visibleWorks = works.filter((w) => w.is_visible !== false);
  const visibleCollections = collections.filter((c) => c.is_visible !== false);
  const hasContact = Boolean(node.public_email?.trim() || node.public_phone?.trim());
  return [
    {
      id: "headline",
      label: "Headline tells visitors who you are",
      description: "A short sentence above the fold so the page feels authored.",
      done: Boolean(node.headline?.trim()),
      href: `${baseHref}/portfolio`,
    },
    {
      id: "bio",
      label: "Bio or world statement",
      description: "Helps visitors understand context, practice, or place.",
      done: Boolean((node.bio || node.practice_statement || node.curatorial_statement)?.trim?.()),
      href: `${baseHref}/portfolio`,
    },
    {
      id: "profile_image",
      label: "Profile or cover image",
      description: "Visual anchors lift the page above text-only profiles.",
      done: Boolean(node.profile_image_url || node.cover_image_url),
      href: `${baseHref}/portfolio`,
    },
    {
      id: "works",
      label: "At least one published work",
      description: "Works are how visitors encounter your practice.",
      done: visibleWorks.length > 0,
      href: `${baseHref}/works`,
    },
    {
      id: "collections",
      label: "At least one collection grouping (optional)",
      description: "Collections frame works as rooms, series, or dossiers.",
      done: visibleCollections.length > 0,
      href: `${baseHref}/collections`,
    },
    {
      id: "contact",
      label: "Public contact route",
      description: "Email or phone visitors can reach you on.",
      done: hasContact,
      href: `${baseHref}/portfolio`,
    },
    {
      id: "published",
      label: "Presence is published",
      description: "Drafts and private nodes are not visible to visitors.",
      done: node.status === "published",
      href: `${baseHref}/settings`,
    },
  ];
}

export default function StudioDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired, reload } = useOwnerNode(nodeId);

  async function handlePublish() {
    if (!token || !node) return;
    await (node.status === "published" ? unpublishNode(nodeId, token) : publishNode(nodeId, token));
    await reload();
  }

  if (loading) return <Loading label="Loading your Presence..." />;
  if (error || !node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}`}
        error={error ?? "Node not found."}
      />
    );
  }

  const base = `/studio/${nodeId}`;
  const checks = buildReadinessChecks(node, base);
  const completed = checks.filter((c) => c.done).length;
  const total = checks.length;
  const readinessPct = Math.round((completed / total) * 100);
  const nextActions = checks.filter((c) => !c.done).slice(0, 3);
  const publicUrl = canonicalPublicUrl(node.slug);
  const publicUrlDisplay = displayPublicUrl(node.slug);

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Public world
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--p-studio-text)]">
            {node.display_name}
          </h1>
          {node.headline && (
            <p className="mt-2 text-sm leading-6 text-[var(--p-studio-muted)]">
              {node.headline}
            </p>
          )}
        </section>

        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <StatusPill status={node.status} />
              {node.status === "published" ? (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[var(--p-studio-muted)] hover:text-[var(--p-studio-accent)] truncate"
                >
                  <Globe className="w-3 h-3 shrink-0" />
                  {publicUrlDisplay}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-xs text-[var(--p-studio-muted)] truncate">
                  <Globe className="w-3 h-3 shrink-0" />
                  Draft preview path: /p/{node.slug}
                </span>
              )}
            </div>
            <Button
              variant={node.status === "published" ? "secondary" : "primary"}
              size="sm"
              onClick={() => void handlePublish()}
            >
              {node.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
          {node.status !== "published" && (
            <p className="text-[11px] leading-5 text-[var(--p-studio-muted)]">
              {node.status === "draft" && node.visibility === "private"
                ? "Draft & private. Visitors can't reach the public URL yet — only you and platform staff can see it. Publish when you're ready."
                : node.status === "draft"
                  ? "Draft. Public visitors land on a 404 until this Presence is published."
                  : `Status: ${node.status}. Public visitors cannot reach this Presence.`}
            </p>
          )}
        </div>

        {/* Launch readiness — computed from real node fields, no fake data */}
        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5 flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
                Launch readiness
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--p-studio-text)]">
                {readinessPct}%
                <span className="ml-2 text-sm font-normal text-[var(--p-studio-muted)]">
                  {completed} of {total}
                </span>
              </p>
            </div>
            {readinessPct < 100 ? (
              <Link
                href={nextActions[0]?.href ?? `${base}/portfolio`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--p-studio-accent)]/40 bg-[var(--p-studio-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--p-studio-accent)] transition hover:bg-[var(--p-studio-accent)]/20"
              >
                Next action
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-900/40 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Launch-ready
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-[var(--p-studio-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--p-studio-accent)] transition-[width] duration-500"
              style={{ width: `${readinessPct}%` }}
            />
          </div>

          {/* Top 3 missing actions */}
          {nextActions.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {nextActions.map((c) => (
                <li key={c.id}>
                  <Link
                    href={c.href}
                    className="group flex items-start gap-3 rounded-xl border border-[var(--p-studio-border)] bg-black/15 p-3 transition hover:border-[var(--p-studio-accent)]/40"
                  >
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--p-studio-muted)] group-hover:text-[var(--p-studio-accent)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--p-studio-text)]">{c.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--p-studio-muted)]">{c.description}</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--p-studio-muted)] group-hover:text-[var(--p-studio-accent)]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs leading-5 text-emerald-300">
              All readiness signals look good. Share your QR / NFC code and welcome visitors in.
            </p>
          )}
        </section>

        {node.analytics && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Views", value: node.analytics.total_views },
              { label: "Enquiries", value: node.analytics.total_enquiries },
              { label: "Rate", value: `${(node.analytics.conversion_rate * 100).toFixed(1)}%` },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)] text-center">
                <span className="text-xl font-semibold text-[var(--p-studio-text)]">{stat.value}</span>
                <span className="text-xs text-[var(--p-studio-muted)]">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map((ql) => (
            <Link
              key={ql.href}
              href={`${base}/${ql.href}`}
              className="flex items-center gap-3 p-4 rounded-xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)] hover:border-[var(--p-studio-accent)]/40 transition-colors group"
            >
              <ql.icon className="w-4 h-4 text-[var(--p-studio-muted)] group-hover:text-[var(--p-studio-accent)]" />
              <span className="text-sm text-[var(--p-studio-text)]">{ql.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </StudioShell>
  );
}
