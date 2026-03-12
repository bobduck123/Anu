"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  EducationAdminOverview,
  PlantKnowledgeEntry,
  ReflectionRecord,
  educationStackApi,
} from "@/lib/api/educationStack";

type ApprovalAuditItem = {
  id: number;
  knowledge_id: number;
  verifier_id: number;
  decision: string;
  notes?: string | null;
  elder_verification_flag: boolean;
  created_at?: string | null;
};

type ApprovalPanel = {
  pending_entries: PlantKnowledgeEntry[];
  recent_approvals: ApprovalAuditItem[];
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return "n/a";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const toOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
};

export function EducationAdminDashboard() {
  const [overview, setOverview] = useState<EducationAdminOverview | null>(null);
  const [approvalPanel, setApprovalPanel] = useState<ApprovalPanel | null>(null);
  const [reflections, setReflections] = useState<ReflectionRecord[]>([]);
  const [topicFilter, setTopicFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResponse, approvalsResponse, reflectionsResponse] = await Promise.all([
        educationStackApi.adminOverview(),
        educationStackApi.adminApprovals(),
        educationStackApi.adminReflections(),
      ]);
      setOverview(overviewResponse);
      setApprovalPanel(approvalsResponse);
      setReflections(reflectionsResponse.reflections);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load education admin analytics.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const loadFilteredReflections = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingReflections(true);
    setError(null);
    try {
      const response = await educationStackApi.adminReflections({
        topic_id: toOptionalNumber(topicFilter),
        user_id: toOptionalNumber(userFilter),
      });
      setReflections(response.reflections);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load filtered reflections.";
      setError(message);
    } finally {
      setLoadingReflections(false);
    }
  };

  const progressionRows = useMemo(() => {
    if (!overview) {
      return [];
    }
    return Object.entries(overview.user_progression_distribution);
  }, [overview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading education administration dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: "var(--font-serif)" }}>
            Education Administration
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Program metrics, completion analytics, progression distribution, reflection review, and verifier workflow visibility.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent-light)] p-4 text-sm text-[var(--color-accent)]">
            {error}
          </div>
        )}

        {overview && (
          <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <article className="card-civic">
              <p className="text-xs text-[var(--color-muted-foreground)]">Programs</p>
              <p className="font-mono-data text-2xl font-semibold">{overview.summary.programs}</p>
            </article>
            <article className="card-civic">
              <p className="text-xs text-[var(--color-muted-foreground)]">Topics</p>
              <p className="font-mono-data text-2xl font-semibold">{overview.summary.topics}</p>
            </article>
            <article className="card-civic">
              <p className="text-xs text-[var(--color-muted-foreground)]">Completion Rate</p>
              <p className="font-mono-data text-2xl font-semibold">{overview.summary.completion_rate.toFixed(1)}%</p>
            </article>
            <article className="card-civic">
              <p className="text-xs text-[var(--color-muted-foreground)]">Reflections</p>
              <p className="font-mono-data text-2xl font-semibold">{overview.summary.reflection_submissions}</p>
            </article>
            <article className="card-civic">
              <p className="text-xs text-[var(--color-muted-foreground)]">Pending Approvals</p>
              <p className="font-mono-data text-2xl font-semibold">{overview.summary.pending_approvals}</p>
            </article>
          </section>
        )}

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <article className="card-civic">
            <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Module Performance
            </h2>
            {overview?.module_performance.length ? (
              <div className="space-y-3">
                {overview.module_performance.map((row) => (
                  <div key={row.module_id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-semibold">{row.module_title}</p>
                      <span className="text-xs text-[var(--color-muted-foreground)]">{row.record_count} records</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full bg-[var(--color-sage)] transition-all duration-300 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, row.avg_completion_percent))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Average completion {row.avg_completion_percent.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No module performance records yet.</p>
            )}
          </article>

          <article className="card-civic">
            <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Progression Distribution
            </h2>
            {progressionRows.length ? (
              <div className="space-y-3">
                {progressionRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2">
                    <span className="text-sm text-[var(--color-earth-dark)]">{label}</span>
                    <span className="font-mono-data text-sm font-semibold text-[var(--color-institutional)]">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No progression distribution data yet.</p>
            )}

            <h3 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Recent Reflections
            </h3>
            {overview?.recent_reflections.length ? (
              <div className="space-y-2">
                {overview.recent_reflections.map((row) => (
                  <div key={row.id} className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2">
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      User {row.username || row.user_id} | Topic {row.topic_id}
                    </p>
                    <p className="text-sm text-[var(--color-earth-dark)]">{row.prompt}</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">{formatDateTime(row.submitted_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No recent reflection submissions.</p>
            )}
          </article>
        </section>

        <section className="mb-8 card-civic">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Reflection Submission Viewer
            </h2>
            <button type="button" onClick={loadOverview} className="btn-pill btn-pill-outline text-xs">
              Refresh Dashboard
            </button>
          </div>
          <form onSubmit={loadFilteredReflections} className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-[var(--color-muted-foreground)]">
              Topic ID
              <input
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value)}
                inputMode="numeric"
                className="ml-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                placeholder="Any"
              />
            </label>
            <label className="text-xs text-[var(--color-muted-foreground)]">
              User ID
              <input
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                inputMode="numeric"
                className="ml-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                placeholder="Any"
              />
            </label>
            <button type="submit" disabled={loadingReflections} className="btn-pill btn-pill-primary text-xs disabled:opacity-60">
              {loadingReflections ? "Loading..." : "Apply Filters"}
            </button>
          </form>
          {reflections.length ? (
            <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
              {reflections.map((row) => (
                <article key={row.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    User {row.user_id} | Program {row.program_id} | Module {row.module_id} | Topic {row.topic_id}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">{row.prompt}</p>
                  <p className="mt-1 text-sm text-[var(--color-earth-dark)]">{row.response_text}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">{formatDateTime(row.submitted_at)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No reflections match the selected filters.</p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="card-civic">
            <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Verifier Approval Panel
            </h2>
            {approvalPanel?.pending_entries.length ? (
              <div className="space-y-3">
                {approvalPanel.pending_entries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-semibold">{entry.indigenous_name}</p>
                      <span className="text-xs text-[var(--color-muted-foreground)]">{entry.region}</span>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {entry.language_group} | {entry.sensitivity_level} | {entry.verification_status}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-earth-dark)]">{entry.traditional_uses}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No pending knowledge entries.</p>
            )}
          </article>

          <article className="card-civic">
            <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Recent Approval Audit
            </h2>
            {approvalPanel?.recent_approvals.length ? (
              <div className="space-y-2">
                {approvalPanel.recent_approvals.map((row) => (
                  <div key={row.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Knowledge {row.knowledge_id} | Verifier {row.verifier_id}
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-earth-dark)]">
                      {row.decision} {row.elder_verification_flag ? "(elder verified)" : ""}
                    </p>
                    {row.notes && <p className="text-sm text-[var(--color-muted-foreground)]">{row.notes}</p>}
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">{formatDateTime(row.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No approval audit entries yet.</p>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
