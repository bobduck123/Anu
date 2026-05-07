"use client";

import { use } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_PRESENCE_API_BASE_URL ??
  "http://localhost:5000";

export default function StudioQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, loading, error, authRequired } = useOwnerNode(nodeId);

  if (loading) return <Loading label="Loading QR tools..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/qr`}
        error={error ?? "Node not found."}
      />
    );
  }

  const qrUrl = `${API_BASE}/api/presence/public/${node.slug}/qr`;
  const vcardUrl = `${API_BASE}/api/presence/public/${node.slug}/vcard`;

  async function copyPublicUrl() {
    if (!node?.public_url || typeof navigator === "undefined") return;
    await navigator.clipboard?.writeText(node.public_url);
  }

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Physical-world bridge
          </p>
          <h2 className="text-2xl font-semibold text-[var(--p-studio-text)]">QR and NFC</h2>
          <p className="max-w-sm text-sm leading-6 text-[var(--p-studio-muted)]">
            Put this Presence on exhibition cards, studio walls, business
            cards, event badges, venue entrances, posters, and artwork labels.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white shadow-xl">
          <img src={qrUrl} alt={`QR code for ${node.display_name}`} className="w-56 h-56" />
        </div>

        <div className="w-full rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4 text-center">
          <p className="text-xs text-[var(--p-studio-muted)]">Public Presence URL</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--p-studio-text)]">
            {node.public_url}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void copyPublicUrl()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--p-studio-border)] px-4 py-3 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
          >
            <Copy className="h-4 w-4" />
            Copy URL
          </button>
          <a
            href={vcardUrl}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--p-studio-border)] px-4 py-3 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
          >
            vCard
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <a
          href={qrUrl}
          download={`${node.slug}-qr.svg`}
          className="px-5 py-2.5 rounded-xl bg-[var(--p-studio-accent)] text-sm font-semibold text-stone-950 hover:bg-orange-300 transition-colors"
        >
          Download SVG
        </a>
      </div>
    </StudioShell>
  );
}
