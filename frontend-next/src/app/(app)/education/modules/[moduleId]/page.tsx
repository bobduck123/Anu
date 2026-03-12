'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, LearningModule, Lesson, Assessment } from '@/lib/api';

export default function EducationModulePage() {
  const params = useParams();
  const moduleId = Number(params?.moduleId);
  const [module, setModule] = useState<LearningModule | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    if (!moduleId) return;
    api.education.getModule(moduleId).then((data) => {
      setModule(data.module);
      setLessons(data.lessons || []);
      setAssessment(data.assessment || null);
    });
  }, [moduleId]);

  if (!module) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">Loading module...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="card-civic">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{module.title}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">{module.description}</p>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-3">Completion threshold {module.completion_threshold}%</div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Lessons</h2>
          {lessons.map((lesson) => (
            <div key={lesson.id} className="card-civic flex items-center justify-between">
              <div>
                <p className="font-medium">{lesson.title}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">Delivery: {lesson.delivery_type}</p>
              </div>
              <Link href={`/education/lessons/${lesson.id}`} className="btn-pill btn-pill-outline text-sm">Open</Link>
            </div>
          ))}
          {lessons.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No lessons yet.</p>}
        </div>

        {assessment && (
          <div className="card-civic flex items-center justify-between">
            <div>
              <p className="font-medium">Assessment</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{assessment.title} · Pass {assessment.pass_score}%</p>
            </div>
            <Link href={`/education/assessments/${assessment.id}`} className="btn-pill btn-pill-primary text-sm">Start</Link>
          </div>
        )}
      </div>
    </div>
  );
}
