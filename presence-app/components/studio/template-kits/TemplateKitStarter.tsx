"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudioAuthGate } from "@/components/auth/StudioAuthGate";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { resolveOwnerSessionToken } from "@/components/studio/ownerSession";
import { StudioRoomCanvas } from "@/components/presence-studio/StudioRoomCanvas";
import { PresenceApiError } from "@/lib/api/client";
import { createStudioRoomFromTemplateKit } from "@/lib/api/studioRoomTemplates";
import type { StudioRoomTemplateKit } from "@/lib/presence/studio-room/model";
import {
  instantiateTemplateKitDraft,
  type TemplateKitDraftInstantiation,
} from "@/lib/presence/studio-room/templateDrafts";

interface TemplateKitStarterProps {
  kits: StudioRoomTemplateKit[];
  internalPreviewEnabled: boolean;
}

type AccessState = "checking" | "ready" | "sign-in" | "unavailable";

export function TemplateKitStarter({ kits, internalPreviewEnabled }: TemplateKitStarterProps) {
  const router = useRouter();
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [stagedFallback, setStagedFallback] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState(kits[0]?.id ?? "");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const token = await resolveOwnerSessionToken({ waitForHydration: true });
        if (cancelled) return;
        setToken(token);
        setAccessState(token ? "ready" : "sign-in");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to confirm Studio access.");
        setAccessState("unavailable");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (accessState === "checking") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--p-studio-bg)] px-4 text-[var(--p-studio-text)]">
        <div className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6">
          <p className="text-sm text-[var(--p-studio-muted)]">Checking Studio access...</p>
        </div>
      </main>
    );
  }

  if (accessState === "sign-in") {
    return <StudioAuthGate returnTo="/studio/template-kits" title="Sign in to start from a TemplateKit" body="TemplateKit starters create owner drafts only. Sign in with your Studio account to continue." />;
  }

  if (accessState === "unavailable") {
    return <StudioNodeGate returnTo="/studio" error={error ?? "Unable to confirm Studio access."} retryable onRetry={() => window.location.reload()} />;
  }

  const selectedKit = kits.find((kit) => kit.id === selectedKitId) ?? kits[0];
  const instantiation = selectedKit ? instantiateTemplateKitDraft(selectedKit.id) : null;

  async function createDraft() {
    if (!selectedKit || !instantiation || !token || creating) return;
    setCreating(true);
    setCreateError(null);
    setStagedFallback(false);
    try {
      const created = await createStudioRoomFromTemplateKit(token, {
        kitId: selectedKit.id,
        draftPayload: instantiation.saveablePayload,
      });
      router.push(created.editorPath);
    } catch (err) {
      setStagedFallback(true);
      setCreateError(templateKitCreateError(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <main data-testid="template-kit-starter" className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-8 text-[var(--p-studio-text)] safe-top">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="rounded-[2rem] border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Owner draft starter
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Start a Draft room from a TemplateKit</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--p-studio-muted)]">
            These kits create deterministic Studio Room drafts in your owner account. Nothing is published, and this does not change public Presence routes.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-testid="template-kit-owner-list" className="grid gap-3">
            {kits.map((kit) => (
              <article
                key={kit.id}
                data-testid={`template-kit-card-${kit.id}`}
                className={`rounded-[1.5rem] border p-4 transition ${
                  kit.id === selectedKit?.id
                    ? "border-[var(--p-studio-accent)] bg-[var(--p-studio-accent)]/10"
                    : "border-[var(--p-studio-border)] bg-[var(--p-studio-surface)]"
                }`}
              >
                <button
                  type="button"
                  data-testid={`template-kit-select-${kit.id}`}
                  onClick={() => setSelectedKitId(kit.id)}
                  className="block w-full text-left"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">{kit.name}</h2>
                    <span className="rounded-full border border-[var(--p-studio-border)] px-3 py-1 text-xs text-[var(--p-studio-muted)]">
                      {kit.defaultRoom.chambers.length} chambers
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--p-studio-muted)]">{kit.description}</p>
                  <p className="mt-3 text-xs text-[var(--p-studio-muted)]">
                    For: {kit.intendedUserTypes.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--p-studio-muted)]">
                    CTA: {kit.ctaStrategy.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--p-studio-muted)]">
                    Owner-creatable primary starter
                  </p>
                </button>
                {internalPreviewEnabled && (
                  <Link
                    href={`/internal/studio-room-template-kits/${kit.id}`}
                    className="mt-3 inline-flex rounded-full border border-[var(--p-studio-border)] px-3 py-1 text-xs font-semibold text-[var(--p-studio-text)]"
                  >
                    Internal preview
                  </Link>
                )}
              </article>
            ))}
          </div>

          {instantiation && selectedKit && (
            <TemplateDraftPreview
              selectedKit={selectedKit}
              instantiation={instantiation}
              creating={creating}
              createError={createError}
              stagedFallback={stagedFallback}
              onCreateDraft={createDraft}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function TemplateDraftPreview({
  selectedKit,
  instantiation,
  creating,
  createError,
  stagedFallback,
  onCreateDraft,
}: {
  selectedKit: StudioRoomTemplateKit;
  instantiation: TemplateKitDraftInstantiation;
  creating: boolean;
  createError: string | null;
  stagedFallback: boolean;
  onCreateDraft: () => void;
}) {
  return (
    <section className="grid gap-4 rounded-[2rem] border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--p-studio-muted)]">
          Draft room preflight
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{selectedKit.name}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--p-studio-muted)]">
          The preview below is deterministic and source-scrubbed. Create a saved Draft to persist it privately and open the Studio Room editor shell.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="template-kit-create-draft"
          onClick={onCreateDraft}
          disabled={creating}
          className="inline-flex rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {creating ? "Creating Draft..." : "Create saved Draft"}
        </button>
        <span className="text-xs text-[var(--p-studio-muted)]">
          Saved drafts stay private until you publish through an owner route.
        </span>
      </div>
      {createError && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/25 p-3 text-sm leading-6 text-red-100/85">
          {createError}
          {stagedFallback ? " The local preflight preview remains unsaved and unpublished." : null}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="State" value={instantiation.draft.room.state} />
        <Info label="Published" value={instantiation.published ? "present" : "none yet"} />
        <Info label="Required" value={selectedKit.requiredFields.length.toString()} />
        <Info label="Optional" value={selectedKit.optionalFields.length.toString()} />
      </div>
      <StudioRoomCanvas room={instantiation.publicPreviewPayload} dirty viewport="mobile" />
      <details className="rounded-2xl border border-[var(--p-studio-border)] p-4">
        <summary className="cursor-pointer text-sm font-semibold">Draft payload boundary</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-[var(--p-studio-muted)]">
          {JSON.stringify(
            {
              templateKitId: instantiation.saveablePayload.templateKitId,
              schemaVersion: instantiation.saveablePayload.schemaVersion,
              persistenceBoundary: instantiation.saveablePayload.persistenceBoundary,
              requiredFields: instantiation.saveablePayload.requiredFields,
              optionalFields: instantiation.saveablePayload.optionalFields,
              ctaStrategy: instantiation.saveablePayload.ctaStrategy,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}

function templateKitCreateError(err: unknown): string {
  if (err instanceof PresenceApiError) {
    if (err.status === 401) return "Sign in again to create this Draft.";
    if (err.status === 403) return "This TemplateKit is not available for owner draft creation.";
    if (err.status === 404) return "The TemplateKit draft endpoint is not available yet.";
  }
  return "The Draft could not be saved right now.";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--p-studio-border)] bg-black/5 p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--p-studio-muted)]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
