"use client";

import { useEffect, useMemo, useState } from "react";
import { educationStackApi, CurriculumProgram, EducationAdminOverview } from "@/lib/api/educationStack";
import { Button } from "@/components/education/ui/button";

type ProgramCardProps = {
  program: CurriculumProgram;
};

function ProgramCard({ program }: ProgramCardProps) {
  return (
    <article className="edu-card card-lift p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{program.title}</h3>
        <span className="edu-pill">{program.region || "Global"}</span>
      </div>
      <p className="text-sm text-[var(--edu-foreground)]/80">{program.description}</p>
      <div className="flex items-center justify-between text-xs text-[var(--edu-foreground)]/70">
        <span>{program.module_count} Modules</span>
        <span>{program.topic_count} Topics</span>
      </div>
      <div className="edu-progress">
        <div className="edu-progress-fill" style={{ width: `${Math.min(100, Math.max(0, program.completion_percent ?? 0))}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span>Depth unlocked {program.depth_tier_unlocked ?? 1}</span>
        <Button variant="outline" size="sm">
          Explore
        </Button>
      </div>
    </article>
  );
}

export function EduHubDashboard() {
  const [overview, setOverview] = useState<EducationAdminOverview | null>(null);
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([educationStackApi.adminOverview(), educationStackApi.listPrograms()])
      .then(([overviewResp, programsResp]) => {
        if (!active) return;
        setOverview(overviewResp);
        setPrograms(programsResp.programs);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load education data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const statCards = useMemo(() => {
    if (!overview) return [];
    return [
      { label: "Programs", value: overview.summary.programs },
      { label: "Topics", value: overview.summary.topics },
      { label: "Progress Records", value: overview.summary.progress_records },
      { label: "Reflections", value: overview.summary.reflection_submissions },
    ];
  }, [overview]);

  if (loading) {
    return (
      <div className="edu-card edu-card-highlight flex items-center justify-center min-h-[260px]">
        <span className="text-sm text-[var(--edu-foreground)]/70">Loading education hub...</span>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <header className="edu-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-[var(--edu-accent)]">Institutional Layer</p>
            <h1 className="mt-2 text-4xl font-semibold text-[var(--edu-foreground)]">
              Living Indigenous Knowledge Infrastructure
            </h1>
            <p className="mt-3 text-sm text-[var(--edu-foreground)]/80">
              Museum-grade storytelling, systems literacy, and regenerative actions converge here. Navigate the layered curriculum and unlock guided knowledge-to-action pathways.
            </p>
          </div>
          <div className="edu-glow rounded-2xl px-5 py-3 border border-[var(--edu-border)]">
            <p className="text-sm font-semibold">Live completion rate</p>
            <p className="text-2xl font-mono-data">{overview ? `${overview.summary.completion_rate.toFixed(1)}%` : "--"}</p>
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

      {error && (
        <div className="edu-card border-l-4 border-red-500 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Programs</h2>
          <Button variant="ghost" size="sm">
            View reports
          </Button>
        </div>
        <div className="edu-tracks-grid mt-6">
          {programs.map((program) => (
            <ProgramCard key={program.program_id} program={program} />
          ))}
        </div>
      </div>
    </section>
  );
}
