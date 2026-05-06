"use client";

import { use } from "react";
import Link from "next/link";
import { Globe, Eye, Edit, QrCode, BarChart2, Inbox } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { Loading, StatusPill, Button } from "@/components/ui";
import { publishNode, unpublishNode } from "@/lib/api/owner";

const QUICK_LINKS = [
  { label: "Edit portfolio", href: "portfolio", icon: Edit },
  { label: "Works", href: "works", icon: Eye },
  { label: "Collections", href: "collections", icon: Eye },
  { label: "Enquiries", href: "enquiries", icon: Inbox },
  { label: "QR & NFC", href: "qr", icon: QrCode },
  { label: "Analytics", href: "analytics", icon: BarChart2 },
];

export default function StudioDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, reload } = useOwnerNode(nodeId);

  async function handlePublish() {
    if (!token || !node) return;
    await (node.status === "published" ? unpublishNode(nodeId, token) : publishNode(nodeId, token));
    await reload();
  }

  if (loading) return <Loading label="Loading your presence…" />;
  if (error || !node) {
    return <div className="p-8 text-red-400 text-sm">{error ?? "Node not found."}</div>;
  }

  const base = `/studio/${nodeId}`;

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Status bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
          <div className="flex flex-col gap-1">
            <StatusPill status={node.status} />
            {node.public_url && (
              <a
                href={node.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--p-studio-muted)] hover:text-[var(--p-studio-accent)]"
              >
                <Globe className="w-3 h-3" />
                {node.public_url.replace("https://", "")}
              </a>
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

        {/* Analytics snapshot */}
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

        {/* Quick links */}
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
