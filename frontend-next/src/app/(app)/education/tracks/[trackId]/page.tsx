'use client';

import { useEffect, useState } from 'react';
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

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-white/75">Loading track…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-rose-200">{error}</div>
        ) : !track ? (
          <div className="edu-card p-8 text-sm text-white/75">Track not found.</div>
        ) : (
          <>
            <section className="edu-card p-6 md:p-8">
              <p className="edu-pill">Learning track</p>
              <h1 className="mt-4 text-3xl font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                {track.title}
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/75">{track.description}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/60">Pillar · {track.pillar}</p>
            </section>

            <section className="space-y-4">
              {modules.map((module) => (
                <article key={module.id} className="edu-card p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{module.title}</h2>
                    <p className="mt-2 text-sm text-white/75">{module.description}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.13em] text-white/60">
                      Completion {module.completion_threshold}% · Retakes {module.retake_limit}
                    </p>
                  </div>
                  <Link href={`/education/modules/${module.id}`} className="btn-pill btn-pill-primary text-sm">
                    Open module
                  </Link>
                </article>
              ))}
              {modules.length === 0 && <p className="text-sm text-white/65">No modules are published for this track yet.</p>}
            </section>
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
