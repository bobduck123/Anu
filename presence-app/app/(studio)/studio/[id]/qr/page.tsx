"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { Loading } from "@/components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

export default function StudioQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, loading } = useOwnerNode(nodeId);

  if (loading) return <Loading />;
  if (!node) return null;

  const qrUrl = `${API_BASE}/api/presence/public/${node.slug}/qr`;

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-sm font-semibold text-[var(--p-studio-text)]">QR Code</h2>
          <p className="text-xs text-[var(--p-studio-muted)]">
            Scan to open your public portfolio
          </p>
        </div>

        {/* QR code from backend — scanner-grade SVG */}
        <div className="p-6 rounded-3xl bg-white shadow-xl">
          <img
            src={qrUrl}
            alt={`QR code for ${node.display_name}`}
            className="w-56 h-56"
          />
        </div>

        <div className="text-center">
          <p className="text-xs text-[var(--p-studio-muted)] font-mono break-all">
            {node.public_url}
          </p>
        </div>

        <a
          href={qrUrl}
          download={`${node.slug}-qr.svg`}
          className="px-5 py-2.5 rounded-xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)] text-sm text-[var(--p-studio-text)] hover:border-[var(--p-studio-accent)]/40 transition-colors"
        >
          Download SVG
        </a>
      </div>
    </StudioShell>
  );
}
