"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Loader2, Monitor, Send, Smartphone } from "lucide-react";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { resolveOwnerSessionToken } from "@/components/studio/ownerSession";
import PortfolioRenderer from "@/components/portfolio/PortfolioRenderer";
import { PresenceApiError } from "@/lib/api/client";
import { getPresenceEditor, previewPresenceEditorDraft, publishPresenceEditorDraft } from "@/lib/api/editor";
import { getNode } from "@/lib/api/owner";
import type { PresenceEditableConfig, PresenceEditorOverview, PresenceEditorPreviewResponse, PresenceNode } from "@/lib/api/types";
import PublishConfirmDialog from "./PublishConfirmDialog";
import { buildReadinessReport } from "@/lib/editor/readiness";

export default function PresenceDraftPreviewPage({ roomId }: { roomId: number }) {
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<PresenceEditorPreviewResponse | null>(null);
  const [overview, setOverview] = useState<PresenceEditorOverview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [accessFailure, setAccessFailure] = useState<"sign-in" | "forbidden" | null>(null);
  const [accessPhase, setAccessPhase] = useState<"checking-session" | "confirming-room">("checking-session");
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    setAccessPhase("checking-session");
    try {
      const accessToken = await resolveOwnerSessionToken({ waitForHydration: true });
      if (!accessToken) {
        setAccessFailure("sign-in");
        setToken(null);
        setNode(null);
        setPayload(null);
        setOverview(null);
        return;
      }
      setToken(accessToken);
      setAccessPhase("confirming-room");
      const [nextPayload, nextOverview] = await Promise.all([
        previewPresenceEditorDraft(roomId, accessToken),
        getPresenceEditor(roomId, accessToken),
      ]);
      let nextNode: PresenceNode;
      try {
        nextNode = await getNode(roomId, accessToken);
      } catch {
        // Preview authorization is defined by the protected editor endpoints.
        // A missing legacy node-hydration response must not replace a valid owner preview with a gate.
        nextNode = nodeFromEditorPreview(nextOverview, nextPayload.editable_config ?? nextPayload.draft);
      }
      setAccessFailure(null);
      setNode(nextNode);
      setPayload(nextPayload);
      setOverview(nextOverview);
    } catch (err) {
      if (err instanceof PresenceApiError && (err.status === 401 || err.status === 403)) {
        setAccessFailure(err.status === 401 ? "sign-in" : "forbidden");
        setToken(null);
        setNode(null);
        setPayload(null);
        setOverview(null);
      } else {
        setAccessFailure(null);
        setPreviewError(err instanceof Error ? err.message : "Draft preview failed to load.");
      }
    } finally {
      setLoadingPreview(false);
    }
  }, [roomId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const previewConfig = payload?.editable_config ?? payload?.draft ?? null;
  const previewNode = useMemo(() => {
    if (!node || !previewConfig) return null;
    return draftNodeForRenderer(node, previewConfig);
  }, [node, previewConfig]);

  const readiness = useMemo(
    () =>
      previewConfig && node
        ? buildReadinessReport({
            config: { ...previewConfig, status: "draft" },
            overview: overview ?? { room: { id: node.id, slug: node.slug, display_name: node.display_name }, draft: previewConfig, published: null, published_public_config: null, suggested_config: null, history: [], assets: [] },
            node,
            dirty: false,
            mobilePreviewReviewed: mode === "mobile",
          })
        : null,
    [mode, node, overview, previewConfig],
  );

  async function publishFromPreview() {
    if (!token) return;
    setPublishing(true);
    try {
      await publishPresenceEditorDraft(roomId, token);
      setConfirmOpen(false);
      await loadPreview();
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "We couldn't open your room. Try again.");
    } finally {
      setPublishing(false);
    }
  }

  if (accessFailure === "sign-in") {
    return (
      <StudioNodeGate
        authRequired
        returnTo={`/studio/${roomId}/editor/preview`}
      />
    );
  }

  if (accessFailure === "forbidden") {
    return (
      <StudioNodeGate
        returnTo={`/studio/${roomId}/editor/preview`}
        error="Draft preview is available only to the owner of this Room."
      />
    );
  }

  if (loadingPreview && !previewNode) {
    return (
      <PreviewState
        label={accessPhase === "confirming-room" ? "Warming secure preview..." : "Checking access..."}
      />
    );
  }

  if (previewError || !previewNode || !token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#101113] px-4 text-stone-100">
        <div className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center">
          <Eye className="mx-auto h-8 w-8 text-amber-200" />
          <h1 className="mt-4 text-xl font-semibold">Draft preview unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-stone-400">{previewError ?? "Create or save a draft before opening full-screen preview."}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href={`/studio/${roomId}/editor`} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-stone-200 hover:bg-white/5">
              Back to editor
            </Link>
            <button type="button" onClick={() => void loadPreview()} className="rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold text-stone-950">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black text-stone-100">
      <div className="fixed left-4 top-4 z-[1000] rounded-full border border-amber-200/40 bg-black/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 backdrop-blur">
        Draft preview - only you can see this
      </div>
      <div className="fixed right-4 top-4 z-[1000] flex flex-wrap items-center justify-end gap-2">
        <Link href={`/studio/${roomId}/editor`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-sm font-semibold text-stone-100 backdrop-blur hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
          Back to editor
        </Link>
        <div className="inline-flex rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur">
          <button type="button" onClick={() => setMode("desktop")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${mode === "desktop" ? "bg-amber-200 text-stone-950" : "text-stone-200"}`}>
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </button>
          <button type="button" onClick={() => setMode("mobile")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${mode === "mobile" ? "bg-amber-200 text-stone-950" : "text-stone-200"}`}>
            <Smartphone className="h-3.5 w-3.5" />
            Mobile
          </button>
        </div>
        <button
          type="button"
          data-testid="preview-open-to-visitors"
          aria-describedby={readiness?.hasBlockingIssues ? "preview-publish-blocked-reason" : undefined}
          onClick={() => setConfirmOpen(true)}
          disabled={publishing || Boolean(readiness?.hasBlockingIssues)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-200 disabled:pointer-events-none disabled:opacity-50"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Open room to visitors
        </button>
      </div>
      {readiness?.hasBlockingIssues && (
        <p
          id="preview-publish-blocked-reason"
          className="fixed right-4 top-16 z-[1000] max-w-sm rounded-2xl border border-red-300/25 bg-red-950/90 px-4 py-3 text-sm text-red-100 backdrop-blur"
        >
          Open your room after you fix: {readiness.critical.map((issue) => issue.label).join(" ")}
        </p>
      )}

      <div className={mode === "mobile" ? "mx-auto min-h-dvh max-w-[430px] overflow-hidden border-x border-white/15 bg-black shadow-2xl" : "min-h-dvh"}>
        <PortfolioRenderer node={previewNode} renderMode="draft" />
      </div>

      <PublishConfirmDialog
        open={confirmOpen}
        publishing={publishing}
        readiness={readiness}
        draftVersion={previewConfig?.version}
        publishedVersion={overview?.published?.version}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void publishFromPreview()}
      />
    </div>
  );
}

function PreviewState({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#101113] text-stone-300">
      <Loader2 className="h-7 w-7 animate-spin text-amber-200" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function draftNodeForRenderer(node: PresenceNode, config: PresenceEditableConfig): PresenceNode {
  const rendererConfig: PresenceEditableConfig = {
    ...config,
    status: "draft",
  };
  return {
    ...node,
    renderer_key: rendererConfig.renderer_key ?? node.renderer_key,
    editable_config: rendererConfig,
  };
}

function nodeFromEditorPreview(overview: PresenceEditorOverview, config: PresenceEditableConfig | null): PresenceNode {
  return {
    id: overview.room.id,
    slug: overview.room.slug,
    display_name: overview.room.display_name,
    node_type: "artist",
    display_mode: "room",
    status: "draft",
    visibility: "private",
    renderer_key: config?.renderer_key ?? null,
    editable_config: config,
  };
}
