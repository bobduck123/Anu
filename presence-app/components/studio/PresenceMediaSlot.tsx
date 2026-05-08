"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Link as LinkIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { clearNodeMedia, uploadNodeMedia } from "@/lib/api/owner";
import type { PresenceMediaTarget, PresenceMediaUploadResult } from "@/lib/api/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function fileError(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Upload a JPG, PNG, or WEBP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Upload an image under 8 MB.";
  return null;
}

interface PresenceMediaSlotProps {
  label: string;
  description?: string;
  currentUrl?: string | null;
  targetType: PresenceMediaTarget;
  nodeId: number;
  token: string | null;
  workId?: number;
  collectionId?: number;
  aspectHint?: string;
  recommendedSize?: string;
  publicVisibilityNote?: string;
  onUploaded?: (result: PresenceMediaUploadResult) => void;
  onCleared?: (result: PresenceMediaUploadResult) => void;
  onManualUrlChange?: (url: string) => void;
}

export default function PresenceMediaSlot({
  label,
  description,
  currentUrl,
  targetType,
  nodeId,
  token,
  workId,
  collectionId,
  aspectHint = "aspect-[4/3]",
  recommendedSize,
  publicVisibilityNote,
  onUploaded,
  onCleared,
  onManualUrlChange,
}: PresenceMediaSlotProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState(currentUrl ?? "");

  useEffect(() => {
    setManualUrl(currentUrl ?? "");
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shownUrl = previewUrl ?? currentUrl ?? null;
  const hasImage = Boolean(shownUrl);

  const note = useMemo(() => {
    return [recommendedSize, publicVisibilityNote].filter(Boolean).join(" ");
  }, [recommendedSize, publicVisibilityNote]);

  async function upload(file: File) {
    const validation = fileError(file);
    if (validation) {
      setError(validation);
      return;
    }
    if (!token) {
      setError("Sign in again before uploading media.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setBusy(true);
    try {
      const result = await uploadNodeMedia(nodeId, token, {
        targetType,
        file,
        workId,
        collectionId,
      });
      onUploaded?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try a smaller JPG, PNG, or WEBP image.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!token || !currentUrl) return;
    setBusy(true);
    setError(null);
    try {
      const result = await clearNodeMedia(nodeId, token, targetType, { workId, collectionId });
      onCleared?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this image.");
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--p-studio-border)] bg-black/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--p-studio-text)]">{label}</p>
          {description && <p className="mt-1 text-xs leading-5 text-[var(--p-studio-muted)]">{description}</p>}
        </div>
        {busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--p-studio-accent)]" />}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`relative flex ${aspectHint} min-h-36 cursor-pointer overflow-hidden rounded-xl border border-dashed transition ${
          dragging
            ? "border-[var(--p-studio-accent)] bg-[var(--p-studio-accent)]/10"
            : "border-[var(--p-studio-border)] bg-[var(--p-studio-bg)]/70 hover:border-[var(--p-studio-accent)]/60"
        }`}
      >
        {hasImage ? (
          <img src={shownUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
        )}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center ${hasImage ? "bg-black/35 opacity-0 transition hover:opacity-100" : ""}`}>
          {hasImage ? <UploadCloud className="h-7 w-7 text-white" /> : <ImageIcon className="h-8 w-8 text-[var(--p-studio-accent)]" />}
          <p className={`text-sm font-semibold ${hasImage ? "text-white" : "text-[var(--p-studio-text)]"}`}>
            {hasImage ? "Replace image" : "Drop an image or choose a file"}
          </p>
          <p className={`text-xs ${hasImage ? "text-white/80" : "text-[var(--p-studio-muted)]"}`}>JPG, PNG, or WEBP</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--p-studio-accent)] px-3 py-2 text-xs font-semibold text-stone-950 transition hover:bg-orange-300 disabled:opacity-50"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          {hasImage ? "Replace" : "Upload"}
        </button>
        <button
          type="button"
          onClick={() => void clear()}
          disabled={busy || !hasImage}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold text-[var(--p-studio-muted)] transition hover:border-red-400 hover:text-red-300 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>

      {note && <p className="text-[11px] leading-5 text-[var(--p-studio-muted)]">{note}</p>}
      {error && <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs leading-5 text-red-100">{error}</p>}

      {onManualUrlChange && (
        <details className="rounded-xl border border-[var(--p-studio-border)] bg-[var(--p-studio-bg)]/40 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--p-studio-muted)]">
            Advanced: use a hosted image URL
          </summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              placeholder="https://..."
              className="min-w-0 flex-1 rounded-xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] px-3 py-2 text-sm text-[var(--p-studio-text)] placeholder:text-[var(--p-studio-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--p-studio-accent)]"
            />
            <button
              type="button"
              onClick={() => onManualUrlChange(manualUrl)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Use URL
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
