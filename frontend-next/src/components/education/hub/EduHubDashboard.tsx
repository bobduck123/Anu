"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CurriculumProgram, educationStackApi } from "@/lib/api/educationStack";
import { toActionableSurfaceError } from "@/lib/ui/actionableErrors";
import { buildAuthHref } from "@/lib/auth/returnTo";

type ProgramCardProps = {
  program: CurriculumProgram;
};

function ProgramCard({ program }: ProgramCardProps) {
  return (
    <article className="edu-card card-lift p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">{program.title}</h3>
        <span className="edu-pill">{program.region || "Global"}</span>
      </div>
      <p className="text-sm text-[var(--edu-foreground)]/80">
        {program.description || "Program overview is being prepared."}
      </p>
      <div className="flex items-center justify-between text-xs text-[var(--edu-foreground)]/70">
        <span>{program.module_count} Modules</span>
        <span>{program.topic_count} Topics</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span>Depth pathway {program.depth_tier_unlocked ?? 1}</span>
        <Link
          href="/education/curriculum"
          className="manara-glass-chip inline-flex items-center justify-center border border-[var(--edu-border)] bg-[color:rgba(30,2,39,0.22)] px-3 py-1.5 text-xs font-medium text-[var(--edu-foreground)] transition hover:border-[var(--edu-accent)]/45 hover:bg-[var(--edu-accent-light)] hover:text-[var(--edu-accent)]"
        >
          Explore
        </Link>
      </div>
    </article>
  );
}

const FALLBACK_PROGRAMS: CurriculumProgram[] = [
  {
    program_id: 9101,
    title: "Community Regeneration Foundations",
    description:
      "Starter pathway covering systems literacy, stewardship ethics, and grounded regeneration planning.",
    region: "Global",
    language_group: "Multilingual",
    module_ids: [1, 2, 3],
    module_count: 3,
    topic_count: 12,
    depth_tier_unlocked: 1,
  },
  {
    program_id: 9102,
    title: "Custodial Governance Practice",
    description:
      "Institutional decision practice with transparency checks and conflict-aware governance routines.",
    region: "Regional",
    language_group: "Commons",
    module_ids: [4, 5],
    module_count: 2,
    topic_count: 8,
    depth_tier_unlocked: 1,
  },
  {
    program_id: 9103,
    title: "Landscape Repair and Action Linkage",
    description:
      "Connect education milestones with real-world regeneration actions and measurable care outcomes.",
    region: "Bioregional",
    language_group: "Multilingual",
    module_ids: [6, 7, 8],
    module_count: 3,
    topic_count: 10,
    depth_tier_unlocked: 1,
  },
];

export function EduHubDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [degradedMode, setDegradedMode] = useState(false);
  const authHref = useMemo(() => buildAuthHref("/education"), []);
  const actionableError = useMemo(
    () =>
      error
        ? toActionableSurfaceError({
            area: "Education program catalog",
            rawMessage: error,
            fallbackHref: "/docs",
            fallbackLabel: "Open documentation",
          })
        : null,
    [error],
  );

  useEffect(() => {
    let active = true;

    const loadPrograms = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);
      setDegradedMode(false);

      try {
        const response = await educationStackApi.listPrograms();
        if (!active) return;

        if ((response.programs || []).length < 1) {
          setPrograms(FALLBACK_PROGRAMS);
          setDegradedMode(true);
          setNotice("No live program records are published yet. Showing fallback learning pathways for continuity.");
          return;
        }

        setPrograms(response.programs);
      } catch (err) {
        if (!active) return;

        setError(err instanceof Error ? err.message : "Unable to load education programs.");
        setNotice(
          "Working now: maps, curriculum layers, and regeneration pathways remain available while program services recover.",
        );
        setPrograms(FALLBACK_PROGRAMS);
        setDegradedMode(true);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPrograms();

    return () => {
      active = false;
    };
  }, []);

  const statCards = useMemo(() => {
    const moduleCount = programs.reduce((sum, program) => sum + Number(program.module_count || 0), 0);
    const topicCount = programs.reduce((sum, program) => sum + Number(program.topic_count || 0), 0);
    const regionCount = new Set(programs.map((program) => program.region).filter(Boolean)).size;
    return [
      { label: "Programs", value: programs.length },
      { label: "Modules", value: moduleCount },
      { label: "Topics", value: topicCount },
      { label: "Regions", value: regionCount || "Global" },
    ];
  }, [programs]);

  if (loading) {
    return (
      <div className="edu-card edu-card-highlight flex min-h-[260px] items-center justify-center">
        <span className="text-sm text-[var(--edu-foreground)]/70">Loading education hub...</span>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <header className="edu-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-wide text-[var(--edu-accent)]">Public Education Hub</p>
            <h1 className="mt-2 text-4xl font-semibold text-[var(--edu-foreground)]">
              Living Indigenous Knowledge Infrastructure
            </h1>
            <p className="mt-3 text-sm text-[var(--edu-foreground)]/80">
              Browse programs, plant knowledge, and systems literacy anonymously. Sign in only when you
              want to save progress, submit reflections, log regenerative actions, or view your credentials.
            </p>
          </div>
          <div className="edu-glow max-w-xs rounded-2xl border border-[var(--edu-border)] px-5 py-4">
            {authLoading ? (
              <>
                <p className="text-sm font-semibold">Checking session</p>
                <p className="text-sm text-[var(--edu-foreground)]/70">Loading learner access...</p>
              </>
            ) : isAuthenticated ? (
              <>
                <p className="text-sm font-semibold">Learner tools unlocked</p>
                <p className="text-sm text-[var(--edu-foreground)]/70">
                  Your progress, reflections, regeneration logging, and personal certifications are available.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Anonymous browsing is open</p>
                <Link href={authHref} className="mt-3 inline-flex text-sm font-medium text-[var(--edu-accent)] hover:underline">
                  Sign in to save learner progress
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="mt-6 edu-stat-grid">
          {statCards.map((stat) => (
            <div key={stat.label} className="edu-stat">
              <p className="text-xs uppercase tracking-wide text-[var(--edu-foreground)]/70">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      {actionableError ? (
        <div className="edu-card border-l-4 border-[var(--edu-accent)] bg-[rgba(246,212,203,0.1)] text-[var(--edu-foreground)] p-5">
          <p className="text-sm font-semibold text-[#f6d4cb]">{actionableError.headline}</p>
          <p className="mt-1 text-sm text-[var(--edu-foreground)]/80">{actionableError.detail}</p>
          {notice ? <p className="mt-2 text-sm text-[var(--edu-foreground)]/80">{notice}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={actionableError.fallbackHref} className="btn-pill btn-pill-outline text-xs">
              {actionableError.fallbackLabel}
            </Link>
            <Link href="/education/maps" className="btn-pill btn-pill-outline text-xs">
              Open maps
            </Link>
            <Link href="/education/curriculum" className="btn-pill btn-pill-outline text-xs">
              Continue curriculum
            </Link>
            <Link href="/education/regeneration" className="btn-pill btn-pill-outline text-xs">
              Open regeneration
            </Link>
          </div>
        </div>
      ) : degradedMode && notice ? (
        <div className="edu-card border-l-4 border-[var(--edu-accent)] bg-[rgba(246,212,203,0.08)] text-[var(--edu-foreground)] p-5">
          <p className="text-sm text-[var(--edu-foreground)]/86">{notice}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/education/maps" className="btn-pill btn-pill-outline text-xs">
              Open maps
            </Link>
            <Link href="/education/curriculum" className="btn-pill btn-pill-outline text-xs">
              Continue curriculum
            </Link>
            <Link href="/docs" className="btn-pill btn-pill-outline text-xs">
              Open docs
            </Link>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Program Catalog</h2>
            <p className="text-sm text-[var(--edu-foreground)]/70">
              {degradedMode
                ? "Fallback catalog active. Working now: you can continue with maps, curriculum, and regeneration routes while live program feeds recover."
                : "Public overview first. Structured learner interactions begin after sign-in."}
            </p>
          </div>
          <Link
            href="/education/curriculum"
            className="manara-glass-chip inline-flex items-center justify-center border border-[var(--edu-border)] bg-[color:rgba(30,2,39,0.22)] px-4 py-2 text-sm font-medium text-[var(--edu-foreground)] transition hover:border-[var(--edu-accent)]/45 hover:bg-[var(--edu-accent-light)] hover:text-[var(--edu-accent)]"
          >
            Open curriculum
          </Link>
        </div>
        {programs.length === 0 ? (
          <div className="edu-card p-6 text-sm text-[var(--edu-foreground)]/70">
            No curriculum programs are published yet.
          </div>
        ) : (
          <div className="edu-tracks-grid">
            {programs.map((program) => (
              <ProgramCard key={program.program_id} program={program} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
