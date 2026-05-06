"use client";

import { use, useEffect, useState } from "react";
import { Mail, CheckCircle, Clock } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { Loading, Empty, Button } from "@/components/ui";
import { listEnquiries, updateEnquiry } from "@/lib/api/owner";
import type { PresenceEnquiry } from "@/lib/api/types";

const STATUS_COLOR: Record<string, string> = {
  new: "text-amber-400",
  read: "text-blue-400",
  replied: "text-emerald-400",
  archived: "text-stone-500",
};

export default function StudioEnquiriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading } = useOwnerNode(nodeId);
  const [enquiries, setEnquiries] = useState<PresenceEnquiry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    listEnquiries(nodeId, token).then(setEnquiries).catch(console.error).finally(() => setListLoading(false));
  }, [nodeId, token]);

  async function markReplied(enq: PresenceEnquiry) {
    if (!token) return;
    const updated = await updateEnquiry(enq.id, "replied", token);
    setEnquiries((es) => es.map((e) => (e.id === updated.id ? updated : e)));
  }

  if (loading) return <Loading />;
  if (!node) return null;

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--p-studio-text)]">Enquiries</h2>

        {listLoading && <Loading />}

        {!listLoading && enquiries.length === 0 && (
          <Empty title="No enquiries yet" body="When people reach out via your portfolio, they'll appear here." />
        )}

        {enquiries.map((enq) => (
          <div
            key={enq.id}
            className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]"
          >
            <button
              className="flex items-start justify-between gap-3 text-left w-full"
              onClick={() => setExpanded(expanded === enq.id ? null : enq.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--p-studio-border)] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[var(--p-studio-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--p-studio-text)]">{enq.name}</p>
                  <p className="text-xs text-[var(--p-studio-muted)]">{enq.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${STATUS_COLOR[enq.status] ?? "text-stone-400"}`}>
                  {enq.status}
                </span>
                {enq.created_at && (
                  <span className="text-xs text-[var(--p-studio-muted)]">
                    {new Date(enq.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </button>

            {expanded === enq.id && (
              <div className="flex flex-col gap-3 pt-2 border-t border-[var(--p-studio-border)]">
                {enq.company && (
                  <p className="text-xs text-[var(--p-studio-muted)]">{enq.company}</p>
                )}
                <p className="text-sm text-[var(--p-studio-text)] whitespace-pre-wrap">{enq.message}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${enq.email}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--p-studio-border)] text-xs text-[var(--p-studio-text)] hover:border-[var(--p-studio-accent)] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Reply
                  </a>
                  {enq.status !== "replied" && (
                    <Button size="sm" onClick={() => void markReplied(enq)}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark replied
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </StudioShell>
  );
}
