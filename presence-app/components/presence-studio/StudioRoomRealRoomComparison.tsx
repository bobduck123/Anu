"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { resolveOwnerSessionToken } from "@/components/studio/ownerSession";
import { PresenceApiError } from "@/lib/api/client";
import { getPresenceEditor } from "@/lib/api/editor";
import { getNode, listNodes } from "@/lib/api/owner";
import type { PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import {
  buildStudioRoomRealRoomComparison,
  type StudioRoomRealRoomComparisonResult,
} from "@/lib/presence/studio-room/realRoomComparison";
import { StudioRoomCanvas } from "./StudioRoomCanvas";

interface StudioRoomRealRoomComparisonProps {
  roomRef: string;
}

type LoadState =
  | { status: "loading"; label: string }
  | { status: "ready"; node: PresenceNode; overview: PresenceEditorOverview; comparison: StudioRoomRealRoomComparisonResult }
  | { status: "sign-in"; message?: string }
  | { status: "forbidden"; message?: string }
  | { status: "error"; message: string };

export function StudioRoomRealRoomComparison({ roomRef }: StudioRoomRealRoomComparisonProps) {
  const [state, setState] = useState<LoadState>({
    status: "loading",
    label: "Checking owner access...",
  });

  const load = useCallback(async () => {
    setState({ status: "loading", label: "Checking owner access..." });
    try {
      const token = await resolveOwnerSessionToken({ waitForHydration: true });
      if (!token) {
        setState({ status: "sign-in" });
        return;
      }

      setState({ status: "loading", label: "Confirming Room access..." });
      const roomId = await resolveRoomId(roomRef, token);
      const [node, overview] = await Promise.all([
        getNode(roomId, token),
        getPresenceEditor(roomId, token),
      ]);
      const comparison = buildStudioRoomRealRoomComparison({ node, overview });
      setState({ status: "ready", node, overview, comparison });
    } catch (error) {
      if (error instanceof PresenceApiError && error.status === 401) {
        setState({ status: "sign-in", message: error.message });
      } else if (error instanceof PresenceApiError && error.status === 403) {
        setState({ status: "forbidden", message: error.message });
      } else {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to load Studio Room comparison.",
        });
      }
    }
  }, [roomRef]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "sign-in") {
    return (
      <StudioNodeGate
        authRequired
        returnTo={`/internal/studio-room-comparison/${encodeURIComponent(roomRef)}`}
        error={state.message}
      />
    );
  }

  if (state.status === "forbidden") {
    return (
      <StudioNodeGate
        returnTo={`/internal/studio-room-comparison/${encodeURIComponent(roomRef)}`}
        error={state.message ?? "This internal preview is available only to the owner or staff with Room access."}
      />
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-dvh bg-[#15120d] px-5 py-8 text-stone-100">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-200/20 bg-red-950/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200">Internal preview unavailable</p>
          <h1 className="mt-3 text-2xl font-semibold">Studio Room comparison could not load</h1>
          <p className="mt-3 text-sm leading-6 text-red-50/80">{state.message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold text-stone-950"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (state.status === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#15120d] px-5 text-stone-100">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Internal preview</p>
          <h1 className="mt-3 text-xl font-semibold">{state.label}</h1>
          <p className="mt-2 text-sm text-stone-400">No private room data is shown until owner access is confirmed.</p>
        </div>
      </main>
    );
  }

  return <ComparisonReadyView state={state} />;
}

function ComparisonReadyView({
  state,
}: {
  state: Extract<LoadState, { status: "ready" }>;
}) {
  const { comparison, node, overview } = state;
  const diagnostics = comparison.diagnostics;
  const draftLabel = overview.draft ? `Draft v${overview.draft.version ?? "?"}` : "No draft config";
  const publishedLabel = overview.published ? `Published v${overview.published.version ?? "?"}` : "No published config";
  const semanticRows = useMemo(
    () =>
      Object.entries(diagnostics.semanticMappedCounts).map(([label, count]) => (
        <MetadataBlock key={label} label={label} value={String(count)} />
      )),
    [diagnostics.semanticMappedCounts],
  );

  return (
    <main className="min-h-dvh bg-[#15120d] px-4 py-6 text-stone-100 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl gap-5">
        <div className="rounded-[2rem] border border-amber-200/30 bg-amber-200/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
            Internal owner/staff preview only - not public route output
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{node.display_name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-300">
            This compares the existing owner-authorized render model with the preview-only Studio Room adapter. It is hidden from normal navigation and does not change public Presence routes.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="grid gap-5">
            <Panel title="Existing render model summary">
              <div className="grid grid-cols-2 gap-3">
                <MetadataBlock label="Room" value={`${diagnostics.roomId} / ${diagnostics.slug}`} />
                <MetadataBlock label="Access" value={diagnostics.permissionStatus} />
                <MetadataBlock label="Mode" value={diagnostics.mode} />
                <MetadataBlock label="Source" value={diagnostics.sourceConfig} />
                <MetadataBlock label="Draft" value={draftLabel} />
                <MetadataBlock label="Live" value={publishedLabel} />
                <MetadataBlock label="Scenes" value={String(diagnostics.sceneCount)} />
                <MetadataBlock label="Widgets" value={String(diagnostics.widgetCount)} />
              </div>
            </Panel>

            <Panel title="Studio Room diagnostics">
              <div className="grid grid-cols-2 gap-3">
                <MetadataBlock label="Chambers" value={String(diagnostics.chamberCount)} />
                <MetadataBlock label="Objects" value={String(diagnostics.objectCount)} />
                <MetadataBlock label="Media" value={String(diagnostics.mediaCount)} />
                <MetadataBlock label="Mobile CTA" value={diagnostics.mobileCtaPresent ? "present" : "missing"} />
                <MetadataBlock label="Restricted keys" value={String(diagnostics.sanitizedPayloadRestrictedKeyCount)} />
                <MetadataBlock label="Blocked private fields" value={String(diagnostics.blockedPrivateFieldCount)} />
              </div>
            </Panel>

            <Panel title="Semantic mapping">
              <div className="grid grid-cols-2 gap-3">{semanticRows}</div>
              <DiagnosticList label="Missing where source exists" items={diagnostics.missingSemanticFields} />
              <DiagnosticList label="Source absent" items={diagnostics.absentSemanticFields} />
              <DiagnosticList label="Deferred" items={diagnostics.deferredSemanticFields} />
            </Panel>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Studio Room preview</p>
                <h2 className="mt-1 text-xl font-semibold">Adapted Draft room</h2>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-300">sanitized payload</span>
            </div>
            <StudioRoomCanvas room={comparison.sanitizedStudioRoom} dirty={diagnostics.mode === "draft"} viewport="mobile" />
          </section>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-300">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetadataBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-stone-100">{value}</p>
    </div>
  );
}

function DiagnosticList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">{label}</p>
      <p className="mt-1 text-sm text-stone-300">{items.length ? items.join(", ") : "none"}</p>
    </div>
  );
}

async function resolveRoomId(roomRef: string, token: string): Promise<number> {
  const numeric = Number(roomRef);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;

  const rooms = await listNodes(token);
  const match = rooms.find((room) => room.slug === roomRef);
  if (!match) {
    throw new PresenceApiError(404, "room_not_found", "No owned Room matched this id or slug.");
  }
  return match.id;
}
