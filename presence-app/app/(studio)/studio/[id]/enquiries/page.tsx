"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  AtSign,
  CheckCircle,
  ExternalLink,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading, Empty, Button } from "@/components/ui";
import { listEnquiries, updateEnquiry } from "@/lib/api/owner";
import type { PresenceEnquiry } from "@/lib/api/types";

const STATUS_COLOR: Record<string, string> = {
  new: "text-amber-400",
  read: "text-blue-400",
  replied: "text-emerald-400",
  archived: "text-stone-500",
};

// Segment filters mirror the public enquiry-type vocabulary so an owner can
// quickly sort inbox items by intent.
const TYPE_FILTERS: Array<[string, string]> = [
  ["all", "All"],
  ["new", "New"],
  ["commission_request", "Commissions"],
  ["viewing", "Viewings"],
  ["work_enquiry", "Works"],
  ["conversation", "Conversations"],
  ["quote_request", "Quotes"],
  ["visit_partner_support", "Visit / partner"],
  ["collaboration", "Collaboration"],
];

const METHOD_LABEL: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  handle: "Handle",
  in_studio: "In-studio",
  any: "Any",
};

function MethodIcon({ method }: { method?: string | null }) {
  if (method === "phone" || method === "sms") return <Phone className="w-3.5 h-3.5" aria-label="Phone preferred" />;
  if (method === "handle") return <AtSign className="w-3.5 h-3.5" aria-label="Handle preferred" />;
  return <Mail className="w-3.5 h-3.5" aria-label="Email preferred" />;
}

function getContactHandle(enq: PresenceEnquiry): string | null {
  if (enq.contact_handle) return enq.contact_handle;
  const meta = enq.metadata;
  if (meta && typeof meta === "object" && "contact_handle" in meta) {
    const h = (meta as Record<string, unknown>).contact_handle;
    return typeof h === "string" ? h : null;
  }
  return null;
}

function ReplyAction({ enq }: { enq: PresenceEnquiry }) {
  // Build the smartest follow-up action based on the visitor's preferred
  // contact method. Falls back to email if available.
  const method = enq.preferred_contact_method ?? "email";
  if (method === "phone" || method === "sms") {
    if (enq.phone) {
      return (
        <a
          href={`tel:${enq.phone}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--p-studio-border)] text-xs text-[var(--p-studio-text)] hover:border-[var(--p-studio-accent)] transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          Call {enq.phone}
        </a>
      );
    }
  }
  if (method === "handle") {
    const handle = getContactHandle(enq);
    if (handle) {
      const looksLikeUrl = /^https?:\/\//i.test(handle);
      return (
        <a
          href={looksLikeUrl ? handle : `https://www.google.com/search?q=${encodeURIComponent(handle)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--p-studio-border)] text-xs text-[var(--p-studio-text)] hover:border-[var(--p-studio-accent)] transition-colors"
        >
          <AtSign className="w-3.5 h-3.5" />
          Reach via {handle}
        </a>
      );
    }
  }
  if (enq.email) {
    return (
      <a
        href={`mailto:${enq.email}`}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--p-studio-border)] text-xs text-[var(--p-studio-text)] hover:border-[var(--p-studio-accent)] transition-colors"
      >
        <Mail className="w-3.5 h-3.5" />
        Reply by email
      </a>
    );
  }
  return (
    <span className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--p-studio-border)] text-xs text-[var(--p-studio-muted)]">
      No external contact route
    </span>
  );
}

export default function StudioEnquiriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);
  const [enquiries, setEnquiries] = useState<PresenceEnquiry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    listEnquiries(nodeId, token)
      .then((items) => {
        if (!cancelled) setEnquiries(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "Could not load enquiries.");
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId, token]);

  async function markReplied(enq: PresenceEnquiry) {
    if (!token) return;
    const updated = await updateEnquiry(enq.id, "replied", token);
    setEnquiries((es) => es.map((e) => (e.id === updated.id ? updated : e)));
  }

  const filtered = useMemo(() => {
    if (filter === "all") return enquiries;
    if (filter === "new") return enquiries.filter((e) => e.status === "new");
    return enquiries.filter((e) => e.enquiry_type === filter);
  }, [enquiries, filter]);

  if (loading) return <Loading label="Loading enquiries..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/enquiries`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Conversations
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--p-studio-text)]">
            Enquiries
          </h2>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Filter enquiries">
          {TYPE_FILTERS.map(([key, label]) => {
            const active = filter === key;
            const count =
              key === "all"
                ? enquiries.length
                : key === "new"
                  ? enquiries.filter((e) => e.status === "new").length
                  : enquiries.filter((e) => e.enquiry_type === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                  active
                    ? "border-[var(--p-studio-accent)] bg-[var(--p-studio-accent)]/15 text-[var(--p-studio-accent)]"
                    : "border-[var(--p-studio-border)] text-[var(--p-studio-muted)] hover:border-[var(--p-studio-accent)]/60 hover:text-[var(--p-studio-text)]"
                }`}
              >
                {label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </nav>

        {listLoading && <Loading label="Loading enquiries..." />}

        {!listLoading && listError && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Enquiries could not be loaded.</p>
              <p className="mt-1 text-xs leading-5 text-amber-100/80">
                Refresh the page or sign in again. The backend said: {listError}
              </p>
            </div>
          </div>
        )}

        {!listLoading && !listError && enquiries.length === 0 && (
          <Empty title="No enquiries yet" body="When someone begins a conversation from your public Presence, it will appear here." />
        )}
        {!listLoading && !listError && enquiries.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-[var(--p-studio-muted)]">No enquiries match this filter.</p>
        )}

        {!listError && filtered.map((enq) => {
          const method = enq.preferred_contact_method ?? "email";
          const handle = getContactHandle(enq);
          const isAnuMember = enq.is_anu_member ?? (enq.submitter_user_id !== null && enq.submitter_user_id !== undefined);
          return (
            <div key={enq.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
              <button
                className="flex items-start justify-between gap-3 text-left w-full"
                onClick={() => setExpanded(expanded === enq.id ? null : enq.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--p-studio-border)] flex items-center justify-center shrink-0">
                    <MethodIcon method={method} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--p-studio-text)] truncate">{enq.name}</p>
                      {isAnuMember && (
                        <span
                          title="Submitter is signed in to ANU"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-700/50 bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
                        >
                          <UserCheck className="w-3 h-3" />
                          ANU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--p-studio-muted)] truncate">
                      {enq.enquiry_type.replace(/_/g, " ")} prefers {METHOD_LABEL[method] ?? method}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
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

                  <dl className="grid grid-cols-1 gap-1.5 text-xs">
                    {enq.contact_route_summary && (
                      <div className="flex items-center gap-2 text-[var(--p-studio-muted)]">
                        <span className="font-semibold text-[var(--p-studio-text)]">Routes</span>
                        <span className="truncate">{enq.contact_route_summary}</span>
                      </div>
                    )}
                    {enq.email && (
                      <div className="flex items-center gap-2 text-[var(--p-studio-muted)]">
                        <Mail className="w-3 h-3 shrink-0" />
                        <a className="hover:text-[var(--p-studio-text)] truncate" href={`mailto:${enq.email}`}>
                          {enq.email}
                        </a>
                      </div>
                    )}
                    {enq.phone && (
                      <div className="flex items-center gap-2 text-[var(--p-studio-muted)]">
                        <Phone className="w-3 h-3 shrink-0" />
                        <a className="hover:text-[var(--p-studio-text)] truncate" href={`tel:${enq.phone}`}>
                          {enq.phone}
                        </a>
                      </div>
                    )}
                    {handle && (
                      <div className="flex items-center gap-2 text-[var(--p-studio-muted)]">
                        <AtSign className="w-3 h-3 shrink-0" />
                        <span className="truncate">{handle}</span>
                      </div>
                    )}
                    {enq.source_url && (
                      <div className="flex items-center gap-2 text-[var(--p-studio-muted)]">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <a
                          className="hover:text-[var(--p-studio-text)] truncate"
                          href={enq.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Source: ${enq.source_type ?? "public_enquiry"}`}
                        >
                          {enq.source_url}
                        </a>
                      </div>
                    )}
                  </dl>

                  <p className="text-sm text-[var(--p-studio-text)] whitespace-pre-wrap">{enq.message}</p>

                  <div className="flex items-center gap-2">
                    <ReplyAction enq={enq} />
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
          );
        })}
      </div>
    </StudioShell>
  );
}
