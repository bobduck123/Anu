'use client';

import { useEffect, useState } from 'react';
import { BookOpenCheck, Milestone, RefreshCw } from 'lucide-react';
import {
  GuidedJourney,
  LearningModule,
  fetchGuidedJourneys,
  fetchLearningModules,
} from '@/lib/api/culturalIntelligence';

export default function LearnPage() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [journeys, setJourneys] = useState<GuidedJourney[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [moduleRows, journeyRows] = await Promise.all([
        fetchLearningModules(),
        fetchGuidedJourneys(),
      ]);
      setModules(moduleRows);
      setJourneys(journeyRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Learn</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Narrative and education engine modules, quests, and guided journeys.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary-foreground)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.25fr,1fr]">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="text-lg font-semibold">Learning Modules</h2>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">Loading modules...</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {modules.map((module) => (
                <article key={module.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{module.title}</p>
                    <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs">{module.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{module.description || 'No description.'}</p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">slug: {module.slug}</p>
                </article>
              ))}
              {modules.length < 1 && <p className="text-sm text-[var(--color-muted-foreground)]">No modules available.</p>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="text-lg font-semibold">Guided Journeys</h2>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">Loading journeys...</p>
          ) : (
            <div className="mt-3 space-y-3">
              {journeys.map((journey) => (
                <article key={journey.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-sm font-semibold">{journey.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{journey.description || 'No description.'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <span className="inline-flex items-center gap-1"><Milestone className="h-3.5 w-3.5" />{journey.modules?.length || 0} modules</span>
                    <span className="inline-flex items-center gap-1"><BookOpenCheck className="h-3.5 w-3.5" />{journey.status}</span>
                  </div>
                </article>
              ))}
              {journeys.length < 1 && <p className="text-sm text-[var(--color-muted-foreground)]">No journeys available.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
