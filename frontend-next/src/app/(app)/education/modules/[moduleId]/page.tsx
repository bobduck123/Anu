'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, LearningModule, Lesson, Assessment } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

export default function EducationModulePage() {
  const params = useParams();
  const moduleId = Number(params?.moduleId);
  const [module, setModule] = useState<LearningModule | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moduleId) {
      setLoading(false);
      setError('Module identifier is missing.');
      return;
    }

    setLoading(true);
    setError(null);

    api.education
      .getModule(moduleId)
      .then((data) => {
        setModule(data.module);
        setLessons(data.lessons || []);
        setAssessment(data.assessment || null);
      })
      .catch((err) => {
        const actionable = toActionableSurfaceError({
          area: 'Education module',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Back to education hub',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      })
      .finally(() => setLoading(false));
  }, [moduleId]);

  const sequenceCount = lessons.length + (assessment ? 1 : 0);

  const sequenceLabel = useMemo(() => {
    if (sequenceCount < 1) {
      return 'No published sequence yet';
    }
    return `${sequenceCount} step${sequenceCount === 1 ? '' : 's'} in this learning flow`;
  }, [sequenceCount]);

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-white/75">Loading module sequence…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-rose-200">{error}</div>
        ) : !module ? (
          <div className="edu-card p-8 text-sm text-white/75">Module not found.</div>
        ) : (
          <>
            <section className="edu-card edu-card-highlight p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="edu-pill">Module</p>
                  <h1 className="mt-4 text-3xl font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                    {module.title}
                  </h1>
                  <p className="mt-3 text-sm text-white/75">{module.description}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70 space-y-1 min-w-[14rem]">
                  <p className="uppercase tracking-[0.15em] text-white/60">Trust signals</p>
                  <p>Version: {module.version}</p>
                  <p>Completion threshold: {module.completion_threshold}%</p>
                  <p>Retakes allowed: {module.retake_limit}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Progression map</p>
                <p className="mt-1 text-sm text-white/80">{sequenceLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/75">
                  {lessons.map((lesson, index) => (
                    <span key={lesson.id} className="rounded-full border border-white/15 px-2 py-1">
                      {index + 1}. {lesson.title}
                    </span>
                  ))}
                  {assessment ? (
                    <span className="rounded-full border border-[#f2c786]/40 bg-[rgba(242,199,134,0.14)] px-2 py-1 text-[#f6d6a3]">
                      Final checkpoint: {assessment.title}
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Lessons</h2>
              {lessons.map((lesson, index) => (
                <article key={lesson.id} className="edu-card p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-white/60">Lesson {index + 1}</p>
                    <p className="mt-1 font-medium text-white">{lesson.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/60">
                      Delivery · {lesson.delivery_type}
                    </p>
                  </div>
                  <Link href={`/education/lessons/${lesson.id}`} className="btn-pill btn-pill-outline text-sm">
                    Open
                  </Link>
                </article>
              ))}
              {lessons.length === 0 && (
                <div className="edu-card p-5 text-sm text-white/70">
                  No lessons are published yet. This module shell stays visible so progression never dead-ends.
                </div>
              )}
            </section>

            {assessment ? (
              <section className="edu-card p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-white">Assessment</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/60">
                    {assessment.title} · Pass {assessment.pass_score}%
                  </p>
                </div>
                <Link href={`/education/assessments/${assessment.id}`} className="btn-pill btn-pill-primary text-sm">
                  Start assessment
                </Link>
              </section>
            ) : null}

            <section className="edu-card p-5">
              <p className="text-xs uppercase tracking-[0.13em] text-white/60">Insight → action bridge</p>
              <p className="mt-2 text-sm text-white/75">
                Completion feeds practical pathways: regeneration action logs, competency updates, and credential
                readiness.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/education/regeneration" className="btn-pill btn-pill-outline text-xs">
                  View regeneration actions
                </Link>
                <Link href="/education/certifications" className="btn-pill btn-pill-outline text-xs">
                  View certification pathway
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
