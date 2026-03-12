'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Lesson } from '@/lib/api';

export default function EducationLessonPage() {
  const params = useParams();
  const lessonId = Number(params?.lessonId);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    api.education.getLesson(lessonId).then(setLesson);
  }, [lessonId]);

  if (!lesson) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">Loading lesson...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="card-civic">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{lesson.title}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Delivery: {lesson.delivery_type}</p>
        </div>

        <div className="card-civic">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Content placeholder. This lesson is structured for {lesson.delivery_type} delivery.
          </p>
          {lesson.content_ref && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-3">Content reference: {lesson.content_ref}</p>
          )}
        </div>
      </div>
    </div>
  );
}
