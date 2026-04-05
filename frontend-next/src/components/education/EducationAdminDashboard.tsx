"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ClipboardCheck,
  Layers3,
  NotebookPen,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  EducationAdminOverview,
  PlantKnowledgeEntry,
  ReflectionRecord,
  educationStackApi,
} from "@/lib/api/educationStack";
import {
  AnuChip,
  AnuControlButton,
  AnuFilterBar,
  AnuFilterGroup,
  AnuFilterInput,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from "@/ui-system/anu/surfacePrimitives";

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
  const [refreshing, setRefreshing] = useState(false);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

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
      const message =
        err instanceof Error ? err.message : "Unable to load education admin analytics.";
      setError(message);
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    void loadOverview("initial");
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
      const message =
        err instanceof Error ? err.message : "Unable to load filtered reflections.";
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
          <AnuSurfacePanel tone="quiet">
            <p className="text-sm text-[color:rgba(246,212,203,0.84)]">
              Loading education administration observatory...
            </p>
          </AnuSurfacePanel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <AnuPageHero
          eyebrow="Education observatory"
          title="Education administration observatory"
          description="Program metrics, completion analytics, reflection review, and verifier workflow visibility now share the ANU instrumentation language instead of a stack of generic utility cards."
          actions={
            <AnuControlButton
              onClick={() => void loadOverview("refresh")}
              tone="active"
              iconLeft={RefreshCw}
              className="w-full justify-center sm:w-auto"
            >
              {refreshing ? "Refreshing..." : "Refresh dashboard"}
            </AnuControlButton>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal" icon={ShieldCheck}>
                  Verifier workflow
                </AnuChip>
                <AnuChip tone="muted" icon={Layers3}>
                  Curriculum analytics
                </AnuChip>
              </div>
              <p className="mt-4 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
                This surface should read like an observatory: scanable first, detailed second, and
                explicit about the current review load across curriculum and governance.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Programs"
              value={String(overview?.summary.programs || 0)}
              detail="Live curriculum programs tracked across the education layer."
            />
            <AnuHeroMetric
              label="Completion rate"
              value={`${overview?.summary.completion_rate.toFixed(1) || "0.0"}%`}
              detail="Average completion across recorded education progress."
            />
            <AnuHeroMetric
              label="Generated"
              value={formatDateTime(overview?.generated_at)}
              detail="Use this timestamp to verify the observatory is reading current admin state."
            />
          </div>
        </AnuPageHero>

        {error ? (
          <AnuSurfacePanel tone="soft" className="mt-6">
            <AnuChip tone="accent">Dashboard degraded</AnuChip>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{error}</p>
          </AnuSurfacePanel>
        ) : null}

        {overview ? (
          <section className="mt-8 grid gap-4 lg:grid-cols-5">
            <AnuInstrumentationCard
              label="Programs"
              value={overview.summary.programs}
              detail="Live curriculum programs."
              icon={BookOpen}
            />
            <AnuInstrumentationCard
              label="Topics"
              value={overview.summary.topics}
              detail="Tracked curriculum topics."
              icon={Layers3}
            />
            <AnuInstrumentationCard
              label="Completion"
              value={`${overview.summary.completion_rate.toFixed(1)}%`}
              detail={`${overview.summary.completed_progress_records} completed records.`}
              icon={ClipboardCheck}
              tone="signal"
            />
            <AnuInstrumentationCard
              label="Reflections"
              value={overview.summary.reflection_submissions}
              detail="Submitted reflections available for review."
              icon={NotebookPen}
            />
            <AnuInstrumentationCard
              label="Pending approvals"
              value={overview.summary.pending_approvals}
              detail="Governance entries awaiting verifier action."
              icon={ShieldCheck}
              tone={overview.summary.pending_approvals > 0 ? "warning" : "steady"}
            />
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <AnuSurfacePanel tone="soft">
            <AnuSectionHeading
              eyebrow="Progress tracking"
              title="Module performance"
              description="Average completion is kept visible at the module level so weak curriculum segments can be spotted quickly."
            />
            {overview?.module_performance.length ? (
              <div className="mt-6 space-y-3">
                {overview.module_performance.map((row) => (
                  <div
                    key={row.module_id}
                    className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--color-foreground)]">{row.module_title}</p>
                      <span className="text-xs text-[color:rgba(246,212,203,0.64)]">{row.record_count} records</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[color:rgba(246,212,203,0.1)]">
                      <div
                        className="h-full transition-all duration-300 ease-out"
                        style={{
                          width: `${Math.min(100, Math.max(0, row.avg_completion_percent))}%`,
                          background:
                            "linear-gradient(90deg, rgba(246,212,203,0.92), rgba(246,212,203,0.92))",
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[color:rgba(246,212,203,0.64)]">
                      Average completion {row.avg_completion_percent.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[color:rgba(246,212,203,0.82)]">
                No module performance records yet.
              </p>
            )}
          </AnuSurfacePanel>

          <AnuSurfacePanel tone="soft">
            <AnuSectionHeading
              eyebrow="Learner movement"
              title="Progression distribution"
              description="Depth and reflection signals stay in the same chamber so operators can read curricular progress alongside recent submissions."
            />
            {progressionRows.length ? (
              <div className="mt-6 space-y-3">
                {progressionRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3"
                  >
                    <span className="text-sm text-[color:rgba(246,212,203,0.84)]">{label}</span>
                    <span className="font-mono-data text-sm font-semibold text-[#f6d4cb]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[color:rgba(246,212,203,0.82)]">
                No progression distribution data yet.
              </p>
            )}

            <div className="mt-8 border-t border-[color:rgba(246,212,203,0.1)] pt-6">
              <AnuSectionHeading
                eyebrow="Recent submissions"
                title="Reflection pulse"
                description="Most recent reflections stay visible without leaving the observatory surface."
              />
              {overview?.recent_reflections.length ? (
                <div className="mt-6 space-y-3">
                  {overview.recent_reflections.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3"
                    >
                      <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
                        User {row.username || row.user_id} | Topic {row.topic_id}
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-foreground)]">{row.prompt}</p>
                      <p className="mt-2 text-[11px] text-[color:rgba(246,212,203,0.64)]">
                        {formatDateTime(row.submitted_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-[color:rgba(246,212,203,0.82)]">
                  No recent reflection submissions.
                </p>
              )}
            </div>
          </AnuSurfacePanel>
        </section>

        <section className="mt-8">
          <AnuSurfacePanel tone="shell">
            <AnuSectionHeading
              eyebrow="Review queue"
              title="Reflection submission viewer"
              description="Operators can filter reflections without leaving the observatory or losing the surrounding program context."
              action={
                <AnuControlButton
                  onClick={() => void loadOverview("refresh")}
                  tone="default"
                  iconLeft={RefreshCw}
                >
                  Refresh dashboard
                </AnuControlButton>
              }
            />
            <form onSubmit={loadFilteredReflections} className="mt-6">
              <AnuFilterBar>
                <AnuFilterGroup className="flex-1">
                  <AnuFilterInput
                    value={topicFilter}
                    onChange={(event) => setTopicFilter(event.target.value)}
                    inputMode="numeric"
                    placeholder="Topic ID"
                    aria-label="Topic ID"
                  />
                  <AnuFilterInput
                    value={userFilter}
                    onChange={(event) => setUserFilter(event.target.value)}
                    inputMode="numeric"
                    placeholder="User ID"
                    aria-label="User ID"
                  />
                </AnuFilterGroup>
                <AnuFilterGroup>
                  <AnuControlButton
                    type="submit"
                    tone="active"
                    iconLeft={Search}
                    disabled={loadingReflections}
                  >
                    {loadingReflections ? "Loading..." : "Apply filters"}
                  </AnuControlButton>
                </AnuFilterGroup>
              </AnuFilterBar>
            </form>
            {reflections.length ? (
              <div className="mt-6 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                {reflections.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4"
                  >
                    <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
                      User {row.user_id} | Program {row.program_id} | Module {row.module_id} |
                      {" "}Topic {row.topic_id}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">
                      {row.prompt}
                    </p>
                    <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.92)]">{row.response_text}</p>
                    <p className="mt-2 text-[11px] text-[color:rgba(246,212,203,0.64)]">
                      {formatDateTime(row.submitted_at)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[color:rgba(246,212,203,0.82)]">
                No reflections match the selected filters.
              </p>
            )}
          </AnuSurfacePanel>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <AnuSurfacePanel tone="soft">
            <AnuSectionHeading
              eyebrow="Governance queue"
              title="Verifier approval panel"
              description="Knowledge entries awaiting review should be easy to triage without flattening custodial context."
            />
            {approvalPanel?.pending_entries.length ? (
              <div className="mt-6 space-y-3">
                {approvalPanel.pending_entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--color-foreground)]">{entry.indigenous_name}</p>
                        <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.64)]">{entry.region}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AnuChip tone="muted">{entry.language_group}</AnuChip>
                        <AnuChip tone="muted">{entry.sensitivity_level}</AnuChip>
                        <AnuChip
                          tone={entry.verification_status === "pending" ? "accent" : "signal"}
                        >
                          {entry.verification_status}
                        </AnuChip>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.84)]">{entry.traditional_uses}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[color:rgba(246,212,203,0.82)]">No pending knowledge entries.</p>
            )}
          </AnuSurfacePanel>

          <AnuSurfacePanel tone="soft">
            <AnuSectionHeading
              eyebrow="Audit trail"
              title="Recent approval audit"
              description="Recent verifier decisions remain visible beside the live pending queue so governance work stays attributable."
            />
            {approvalPanel?.recent_approvals.length ? (
              <div className="mt-6 space-y-3">
                {approvalPanel.recent_approvals.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
                          Knowledge {row.knowledge_id} | Verifier {row.verifier_id}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                          {row.decision} {row.elder_verification_flag ? "(elder verified)" : ""}
                        </p>
                      </div>
                      <AnuChip tone={row.decision === "approved" ? "signal" : "accent"}>
                        {row.decision}
                      </AnuChip>
                    </div>
                    {row.notes ? (
                      <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.82)]">{row.notes}</p>
                    ) : null}
                    <p className="mt-3 text-[11px] text-[color:rgba(246,212,203,0.64)]">
                      {formatDateTime(row.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[color:rgba(246,212,203,0.82)]">No approval audit entries yet.</p>
            )}
          </AnuSurfacePanel>
        </section>
      </div>
    </div>
  );
}
