"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CurriculumProgram, educationStackApi } from "@/lib/api/educationStack";

type ProgramCardProps = {
  program: CurriculumProgram;
};

function buildAuthHref(returnTo: string): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  return `/auth?${params.toString()}`;
}

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
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)]"
        >
          Explore
        </Link>
      </div>
    </article>
  );
}

export function EduHubDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authHref = useMemo(() => buildAuthHref("/education"), []);

  useEffect(() => {
    let active = true;
    educationStackApi
      .listPrograms()
      .then((response) => {
        if (!active) return;
        setPrograms(response.programs);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load education programs.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
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

      {error && <div className="edu-card border-l-4 border-red-500 bg-red-50 text-red-700">{error}</div>}

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Program Catalog</h2>
            <p className="text-sm text-[var(--edu-foreground)]/70">
              Public overview first. Structured learner interactions begin after sign-in.
            </p>
          </div>
          <Link
            href="/education/curriculum"
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)]"
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
