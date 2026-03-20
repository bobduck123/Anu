'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Lesson } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

export default function EducationLessonPage() {
  const params = useParams();
  const lessonId = Number(params?.lessonId);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      setError('Lesson identifier is missing.');
      return;
    }

    setLoading(true);
    setError(null);

    api.education
      .getLesson(lessonId)
      .then(setLesson)
      .catch((err) => {
        const actionable = toActionableSurfaceError({
          area: 'Education lesson',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Back to education hub',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-white/75">Loading lesson…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-rose-200">{error}</div>
        ) : !lesson ? (
          <div className="edu-card p-8 text-sm text-white/75">Lesson not found.</div>
        ) : (
          <>
            <section className="edu-card p-6 md:p-8">
              <p className="edu-pill">Lesson</p>
              <h1 className="mt-4 text-3xl font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                {lesson.title}
              </h1>
              <p className="mt-3 text-sm uppercase tracking-[0.14em] text-white/65">Delivery · {lesson.delivery_type}</p>
            </section>

            <section className="edu-card p-6">
              <p className="text-sm leading-7 text-white/75">
                Content placeholder. This lesson is prepared for {lesson.delivery_type} delivery.
              </p>
              {lesson.content_ref ? (
                <p className="mt-3 text-xs uppercase tracking-[0.13em] text-white/60">Content reference · {lesson.content_ref}</p>
              ) : null}
            </section>
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
