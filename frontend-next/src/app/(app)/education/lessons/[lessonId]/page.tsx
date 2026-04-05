'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Assessment, LearningModule, Lesson } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

interface LessonContext {
  module: LearningModule;
  lessons: Lesson[];
  assessment: Assessment | null;
}

export default function EducationLessonPage() {
  const params = useParams();
  const lessonId = Number(params?.lessonId);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [context, setContext] = useState<LessonContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setLoading(false);
      setError('Lesson identifier is missing.');
      return;
    }

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const lessonData = await api.education.getLesson(lessonId);
        setLesson(lessonData);

        try {
          const moduleData = await api.education.getModule(lessonData.module_id);
          setContext({
            module: moduleData.module,
            lessons: moduleData.lessons || [],
            assessment: moduleData.assessment || null,
          });
        } catch {
          setContext(null);
        }
      } catch (err) {
        const actionable = toActionableSurfaceError({
          area: 'Education lesson',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Back to education hub',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [lessonId]);

  const sequenceMeta = useMemo(() => {
    if (!lesson || !context) {
      return { index: null as number | null, total: null as number | null, nextLesson: null as Lesson | null };
    }

    const ordered = [...context.lessons].sort((a, b) => a.sequence - b.sequence);
    const currentIndex = ordered.findIndex((entry) => entry.id === lesson.id);
    return {
      index: currentIndex >= 0 ? currentIndex + 1 : null,
      total: ordered.length,
      nextLesson: currentIndex >= 0 ? ordered[currentIndex + 1] || null : null,
    };
  }, [context, lesson]);

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)] hover:text-[var(--color-foreground)]">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-[color:rgba(246,212,203,0.75)]">Loading lesson context…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-[#7c413c]">{error}</div>
        ) : !lesson ? (
          <div className="edu-card p-8 text-sm text-[color:rgba(246,212,203,0.75)]">Lesson not found.</div>
        ) : (
          <>
            <section className="edu-card edu-card-highlight p-6 md:p-8">
              <p className="edu-pill">Lesson</p>
              <h1 className="mt-4 text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                {lesson.title}
              </h1>
              <p className="mt-3 text-sm uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)]">Delivery · {lesson.delivery_type}</p>

              <div className="mt-5 grid gap-3 md:grid-cols-3 text-xs">
                <div className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-3 py-2 text-[color:rgba(246,212,203,0.75)]">
                  <p className="uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Version</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{lesson.version}</p>
                </div>
                <div className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-3 py-2 text-[color:rgba(246,212,203,0.75)]">
                  <p className="uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Module progression</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">
                    {sequenceMeta.index && sequenceMeta.total
                      ? `Lesson ${sequenceMeta.index} of ${sequenceMeta.total}`
                      : 'Sequence info pending'}
                  </p>
                </div>
                <div className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-3 py-2 text-[color:rgba(246,212,203,0.75)]">
                  <p className="uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Content reference</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{lesson.content_ref || 'Attached in delivery package'}</p>
                </div>
              </div>
            </section>

            <section className="edu-card p-6">
              <p className="text-sm leading-7 text-[color:rgba(246,212,203,0.75)]">
                This lesson surface is active and can host mapped content, guided activities, or embedded delivery media.
                Once curriculum payloads are attached, this space keeps the same sequence and trust context shown above.
              </p>
              {lesson.content_ref ? (
                <p className="mt-3 text-xs uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Content reference · {lesson.content_ref}</p>
              ) : null}
            </section>

            <section className="edu-card p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">What next</p>
              {sequenceMeta.nextLesson ? (
                <Link href={`/education/lessons/${sequenceMeta.nextLesson.id}`} className="btn-pill btn-pill-primary text-sm">
                  Continue to next lesson
                </Link>
              ) : context?.assessment ? (
                <Link href={`/education/assessments/${context.assessment.id}`} className="btn-pill btn-pill-primary text-sm">
                  Move to assessment
                </Link>
              ) : context?.module ? (
                <Link href={`/education/modules/${context.module.id}`} className="btn-pill btn-pill-primary text-sm">
                  Return to module overview
                </Link>
              ) : (
                <Link href="/education" className="btn-pill btn-pill-primary text-sm">
                  Back to education hub
                </Link>
              )}
              <div className="flex flex-wrap gap-2">
                <Link href="/education/regeneration" className="btn-pill btn-pill-outline text-xs">
                  See linked actions
                </Link>
                <Link href="/education/certifications" className="btn-pill btn-pill-outline text-xs">
                  Track credentials
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
