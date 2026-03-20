'use client';

import { useEffect, useState } from 'react';
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

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-white/75">Loading module…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-rose-200">{error}</div>
        ) : !module ? (
          <div className="edu-card p-8 text-sm text-white/75">Module not found.</div>
        ) : (
          <>
            <section className="edu-card p-6 md:p-8">
              <p className="edu-pill">Module</p>
              <h1 className="mt-4 text-3xl font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                {module.title}
              </h1>
              <p className="mt-3 text-sm text-white/75">{module.description}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/60">
                Completion threshold {module.completion_threshold}%
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Lessons</h2>
              {lessons.map((lesson) => (
                <article key={lesson.id} className="edu-card p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{lesson.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/60">Delivery · {lesson.delivery_type}</p>
                  </div>
                  <Link href={`/education/lessons/${lesson.id}`} className="btn-pill btn-pill-outline text-sm">
                    Open
                  </Link>
                </article>
              ))}
              {lessons.length === 0 && <p className="text-sm text-white/65">No lessons are published yet.</p>}
            </section>

            {assessment ? (
              <section className="edu-card p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-white">Assessment</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/60">
                    {assessment.title} · Pass {assessment.pass_score}%
                  </p>
                </div>
                <Link href={`/education/assessments/${assessment.id}`} className="btn-pill btn-pill-primary text-sm">
                  Start
                </Link>
              </section>
            ) : null}
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
