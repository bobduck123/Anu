"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Eye, Edit, QrCode, BarChart2, Inbox, CheckCircle2, Circle, ArrowRight, DoorOpen, Paintbrush, Send } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading, StatusPill, Button } from "@/components/ui";
import { publishNode, unpublishNode } from "@/lib/api/owner";
import { getPresenceEditor } from "@/lib/api/editor";
import type { PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import { canonicalPublicUrl, displayPublicUrl } from "@/lib/presence/url";
import { shouldUsePresenceStudioV2Editor } from "@/lib/presence/studio-v2/feature";

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

function formatOwnerDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
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
  const [editorOverview, setEditorOverview] = useState<PresenceEditorOverview | null>(null);
  const [editorOverviewLoading, setEditorOverviewLoading] = useState(false);
  const [editorOverviewError, setEditorOverviewError] = useState(false);
  const isV2Enabled = Boolean(node && shouldUsePresenceStudioV2Editor({
    roomId: nodeId,
    slug: node.slug,
    rendererKey: node.renderer_key,
    config: node.editable_config,
    node,
  }));

  useEffect(() => {
    let active = true;
    if (!token || !isV2Enabled) {
      setEditorOverview(null);
      setEditorOverviewLoading(false);
      setEditorOverviewError(false);
      return () => { active = false; };
    }
    setEditorOverviewLoading(true);
    setEditorOverviewError(false);
    void getPresenceEditor(nodeId, token)
      .then((overview) => {
        if (active) setEditorOverview(overview);
      })
      .catch(() => {
        if (active) {
          setEditorOverview(null);
          setEditorOverviewError(true);
        }
      })
      .finally(() => {
        if (active) setEditorOverviewLoading(false);
      });
    return () => { active = false; };
  }, [isV2Enabled, nodeId, token]);

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
  const hasUnpublishedChanges = Boolean(editorOverview?.draft);
  const lastEdited = formatOwnerDate(editorOverview?.draft?.updated_at ?? node.updated_at);
  const lastPublished = formatOwnerDate(editorOverview?.published?.published_at ?? node.published_at);

  return (
    <StudioShell node={node}>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)]">
          <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_0.8fr] md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-accent)]">
                Your digital home
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--p-studio-text)] md:text-4xl">
            {node.display_name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--p-studio-muted)]">
                {node.headline || "Arrange the rooms, pieces, and atmosphere people experience when they visit your Presence."}
              </p>
              {isV2Enabled && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href={`${base}/editor?step=rooms`} className="inline-flex items-center gap-2 rounded-full bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110">
                    <DoorOpen className="h-4 w-4" />
                    Edit my Presence
                  </Link>
                  <Link href={`${base}/editor/preview`} className="inline-flex items-center gap-2 rounded-full border border-[var(--p-studio-border)] px-5 py-3 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60">
                    <Eye className="h-4 w-4" />
                    Preview as visitor
                  </Link>
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-[var(--p-studio-border)] bg-black/15 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">Live status</span>
                <StatusPill status={node.status} />
              </div>
              <p className="mt-4 text-lg font-semibold text-[var(--p-studio-text)]">
                {node.status === "published" ? "Your Presence is live" : "Your Presence is not live yet"}
              </p>
              {node.status === "published" && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-sm text-[var(--p-studio-accent)] hover:underline">
                  <Globe className="h-4 w-4" />
                  {publicUrlDisplay}
                </a>
              )}
              <div className="mt-5 grid gap-2 text-xs text-[var(--p-studio-muted)]">
                <span>{editorOverviewLoading ? "Checking for saved changes…" : editorOverviewError ? "Couldn’t check saved changes — open Studio to verify" : hasUnpublishedChanges ? "Unpublished changes are ready to review" : "No saved unpublished changes"}</span>
                {lastEdited && <span>Last edited {lastEdited}</span>}
                {lastPublished && <span>Last published {lastPublished}</span>}
              </div>
            </div>
          </div>
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
                  Draft preview path: /presence/{node.slug}
                </span>
              )}
            </div>
            {isV2Enabled ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link href={`${base}/editor?step=publish`} className="inline-flex items-center gap-2 rounded-full border border-[var(--p-studio-accent)]/40 bg-[var(--p-studio-accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--p-studio-accent)] transition hover:bg-[var(--p-studio-accent)]/20">
                  <Send className="h-4 w-4" />
                  Publish update
                </Link>
                {node.status === "published" && (
                  <Button variant="secondary" size="sm" onClick={() => void handlePublish()}>
                    Unpublish
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant={node.status === "published" ? "secondary" : "primary"}
                size="sm"
                onClick={() => void handlePublish()}
              >
                {node.status === "published" ? "Unpublish" : "Publish"}
              </Button>
            )}
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

        {isV2Enabled && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Presence owner actions">
            {[
              { label: "Rooms", copy: "Choose the spaces inside your Presence.", href: `${base}/editor?step=rooms`, icon: DoorOpen },
              { label: "Arrange", copy: "Move your pieces into the room.", href: `${base}/editor?step=arrange`, icon: Edit },
              { label: "Look & Feel", copy: "Set the mood, movement, and texture.", href: `${base}/editor?step=style`, icon: Paintbrush },
              { label: "Review changes", copy: "Preview and safely update your live Presence.", href: `${base}/editor?step=publish`, icon: CheckCircle2 },
            ].map((action) => (
              <Link key={action.label} href={action.href} className="group rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--p-studio-accent)]/50">
                <action.icon className="h-5 w-5 text-[var(--p-studio-accent)]" />
                <h2 className="mt-4 font-semibold text-[var(--p-studio-text)]">{action.label}</h2>
                <p className="mt-2 text-xs leading-5 text-[var(--p-studio-muted)]">{action.copy}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--p-studio-accent)]">Open <ArrowRight className="h-3 w-3" /></span>
              </Link>
            ))}
          </section>
        )}

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
