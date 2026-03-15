"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PlantKnowledgeEntry, SensitivityLevel, educationStackApi } from "@/lib/api/educationStack";

const VERIFIER_ROLES = new Set([
  "verifier",
  "validator",
  "node_admin",
  "platform_admin",
  "indigenous_council",
  "node_curator",
  "board_member",
  "auditor",
  "treasury_guardian",
]);

const INITIAL_FORM = {
  region: "",
  language_group: "",
  indigenous_name: "",
  season: "",
  traditional_uses: "",
  preparation_methods: "",
  cultural_context: "",
  scientific_notes: "",
  sensitivity_level: "community" as SensitivityLevel,
};

export function GovernanceLayerView() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const canVerify = useMemo(() => VERIFIER_ROLES.has(user?.role || ""), [user?.role]);
  const authHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("returnTo", "/education/governance");
    return `/auth?${params.toString()}`;
  }, []);
  const [entries, setEntries] = useState<PlantKnowledgeEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<PlantKnowledgeEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState("approved");
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const [entryResponse, pendingResponse] = await Promise.all([
        educationStackApi.listKnowledgeEntries({ status: statusFilter }),
        canVerify ? educationStackApi.pendingApprovals() : Promise.resolve({ pending_entries: [] }),
      ]);
      setEntries(entryResponse.knowledge_entries);
      setPendingEntries(pendingResponse.pending_entries);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to load governance entries.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, canVerify]);

  const submitKnowledge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await educationStackApi.createKnowledgeEntry(form);
      setMessage(`Knowledge entry submitted with status: ${response.verification_status}`);
      setForm(INITIAL_FORM);
      await loadEntries();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to submit knowledge entry.";
      setMessage(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyEntry = async (knowledgeId: number, decision: "approved" | "rejected") => {
    setProcessingId(knowledgeId);
    setMessage(null);
    try {
      await educationStackApi.verifyKnowledgeEntry(knowledgeId, { decision });
      setMessage(`Knowledge entry ${decision}.`);
      await loadEntries();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to process verification.";
      setMessage(messageText);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Cultural Governance Layer
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Sensitivity-tiered knowledge publishing, verifier approval workflow, custodial attribution, and lineage records.
          </p>
        </header>

        {message && <p className="mb-4 text-sm text-[var(--color-institutional)]">{message}</p>}
        {error && <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p>}

        <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Submit Knowledge Entry
          </h2>
          {authLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Checking submission access...</p>
          ) : !isAuthenticated ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Approved knowledge is public.{" "}
              <Link href={authHref} className="font-medium text-[var(--color-institutional)] hover:underline">
                Sign in
              </Link>{" "}
              to submit new entries for verification.
            </p>
          ) : (
            <form onSubmit={submitKnowledge} className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={form.region}
                onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))}
                placeholder="Region"
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <input
                required
                value={form.language_group}
                onChange={(event) => setForm((prev) => ({ ...prev, language_group: event.target.value }))}
                placeholder="Language group"
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <input
                required
                value={form.indigenous_name}
                onChange={(event) => setForm((prev) => ({ ...prev, indigenous_name: event.target.value }))}
                placeholder="Indigenous plant name"
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <input
                required
                value={form.season}
                onChange={(event) => setForm((prev) => ({ ...prev, season: event.target.value }))}
                placeholder="Season"
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <textarea
                required
                value={form.traditional_uses}
                onChange={(event) => setForm((prev) => ({ ...prev, traditional_uses: event.target.value }))}
                placeholder="Traditional uses"
                className="min-h-[84px] rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm md:col-span-2"
              />
              <textarea
                value={form.preparation_methods}
                onChange={(event) => setForm((prev) => ({ ...prev, preparation_methods: event.target.value }))}
                placeholder="Preparation methods"
                className="min-h-[70px] rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={form.cultural_context}
                onChange={(event) => setForm((prev) => ({ ...prev, cultural_context: event.target.value }))}
                placeholder="Cultural context"
                className="min-h-[70px] rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={form.scientific_notes}
                onChange={(event) => setForm((prev) => ({ ...prev, scientific_notes: event.target.value }))}
                placeholder="Scientific notes"
                className="min-h-[70px] rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <select
                value={form.sensitivity_level}
                onChange={(event) => setForm((prev) => ({ ...prev, sensitivity_level: event.target.value as SensitivityLevel }))}
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                <option value="public">public</option>
                <option value="community">community</option>
                <option value="restricted">restricted</option>
              </select>
              <div className="md:col-span-2">
                <button type="submit" disabled={submitting} className="btn-pill btn-pill-primary text-sm disabled:opacity-60">
                  {submitting ? "Submitting..." : "Submit For Verification"}
                </button>
              </div>
            </form>
          )}
        </section>

        {canVerify && (
          <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Verifier Approval Panel
            </h2>
            {pendingEntries.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No pending entries.</p>
            ) : (
              <div className="space-y-3">
                {pendingEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold">{entry.indigenous_name}</p>
                      <span className="text-xs text-[var(--color-muted-foreground)]">{entry.region}</span>
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{entry.traditional_uses}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => verifyEntry(entry.id, "approved")}
                        disabled={processingId === entry.id}
                        className="btn-pill btn-pill-primary text-xs disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => verifyEntry(entry.id, "rejected")}
                        disabled={processingId === entry.id}
                        className="btn-pill btn-pill-outline text-xs disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Knowledge Registry
            </h2>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-xs"
            >
              <option value="approved">approved</option>
              {canVerify && <option value="pending">pending</option>}
              {canVerify && <option value="rejected">rejected</option>}
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading entries...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No entries match this filter.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {entries.map((entry) => (
                <article key={entry.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{entry.indigenous_name}</h3>
                    <span className="rounded-full bg-[var(--color-institutional-light)] px-2 py-0.5 text-[10px] text-[var(--color-institutional)]">
                      {entry.sensitivity_level}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {entry.region} | {entry.language_group} | {entry.verification_status}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-earth-dark)]">{entry.traditional_uses}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
