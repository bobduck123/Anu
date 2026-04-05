'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, LearningModule, LearningTrack } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

export default function EducationTrackPage() {
  const params = useParams();
  const trackId = Number(params?.trackId);
  const [track, setTrack] = useState<LearningTrack | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) {
      setLoading(false);
      setError('Track identifier is missing.');
      return;
    }

    setLoading(true);
    setError(null);

    api.education
      .getTrack(trackId)
      .then((data) => {
        setTrack(data.track);
        setModules(data.modules || []);
      })
      .catch((err) => {
        const actionable = toActionableSurfaceError({
          area: 'Education track',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Back to education hub',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      })
      .finally(() => setLoading(false));
  }, [trackId]);

  const pathwaySteps = useMemo(
    () => [
      {
        title: 'Orientation',
        detail: 'Start with this track brief to understand pillar outcomes and pacing.',
      },
      {
        title: 'Module progression',
        detail: `${modules.length} module${modules.length === 1 ? '' : 's'} scaffolded in sequence with clear thresholds.`,
      },
      {
        title: 'Competency & action',
        detail: 'Complete modules to unlock assessments, certifications, and regeneration actions.',
      },
    ],
    [modules.length],
  );

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8 space-y-8">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)] hover:text-[var(--color-foreground)]">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-[color:rgba(246,212,203,0.75)]">Loading track pathway…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-[#7c413c]">{error}</div>
        ) : !track ? (
          <div className="edu-card p-8 text-sm text-[color:rgba(246,212,203,0.75)]">Track not found.</div>
        ) : (
          <>
            <section className="edu-card edu-card-highlight p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="edu-pill">Learning track</p>
                  <h1 className="mt-4 text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                    {track.title}
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-[color:rgba(246,212,203,0.75)]">{track.description}</p>
                </div>
                <div className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-4 py-3 text-xs text-[color:rgba(246,212,203,0.7)] space-y-1 min-w-[14rem]">
                  <p className="uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.6)]">Track trust signals</p>
                  <p>Pillar: {track.pillar}</p>
                  <p>Version: {track.version}</p>
                  {track.jurisdiction_default ? <p>Jurisdiction: {track.jurisdiction_default}</p> : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {pathwaySteps.map((step, index) => (
                  <article key={step.title} className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.6)]">Step {index + 1}</p>
                    <h2 className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">{step.title}</h2>
                    <p className="mt-2 text-xs leading-6 text-[color:rgba(246,212,203,0.7)]">{step.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Module sequence</h2>
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.6)]">
                    Progression clarity · ordered by learning sequence
                  </p>
                </div>
                <Link href="/education/certifications" className="btn-pill btn-pill-outline text-xs">
                  Credential outcomes
                </Link>
              </div>

              {modules.map((module, index) => (
                <article
                  key={module.id}
                  className="edu-card p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.6)]">Step {index + 1}</p>
                    <h3 className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{module.title}</h3>
                    <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.75)]">{module.description}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">
                      Completion {module.completion_threshold}% · Retakes {module.retake_limit}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/education/modules/${module.id}`} className="btn-pill btn-pill-primary text-sm">
                      Open module
                    </Link>
                    <Link href="/education/regeneration" className="btn-pill btn-pill-outline text-sm">
                      See action links
                    </Link>
                  </div>
                </article>
              ))}

              {modules.length === 0 && (
                <div className="edu-card p-6 text-sm text-[color:rgba(246,212,203,0.7)]">
                  No modules are published for this track yet. You can still explore the broader education layers from
                  the hub while this pathway is being prepared.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
