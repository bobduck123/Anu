'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFeatureFlag } from '@/lib/featureFlags';
import { TemplateRenderer, MOCK_COURSES, TEMPLATE_REGISTRY } from '@/ui/patterns/education-templates';
import { BookOpen, ArrowLeft, Layers } from 'lucide-react';
import Link from 'next/link';

export default function CourseDetailPage() {
  const enabled = useFeatureFlag('educationTemplates');
  const params = useParams<{ courseId: string }>();

  const course = useMemo(
    () => MOCK_COURSES.find((c) => c.id === params.courseId) ?? null,
    [params.courseId],
  );

  if (!enabled) {
    return (
      <div className="p-8 text-center text-[var(--color-muted-foreground)]">
        <Layers className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">Education Templates disabled</p>
        <p className="text-sm mt-1">Enable the educationTemplates feature flag to view courses.</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-[var(--color-muted-foreground)] opacity-40" />
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Course not found</h2>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
          No course matches the ID &ldquo;{params.courseId}&rdquo;.
        </p>
        <Link
          href="/education/templates"
          className="inline-flex items-center gap-1.5 mt-4 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Browse templates
        </Link>
      </div>
    );
  }

  const template = TEMPLATE_REGISTRY.find((t) => t.id === course.template);

  return (
    <div className="min-h-screen">
      {/* Sticky course header */}
      <div className="sticky top-0 z-30 bg-[var(--color-background)]/95 backdrop-blur border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/education/templates"
            className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Templates
          </Link>
          <span className="text-[var(--color-muted-foreground)]">/</span>
          <span className="text-sm font-medium text-[var(--color-foreground)] truncate max-w-[200px]">
            {course.title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {course.sections.length} sections
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center gap-1">
            {template?.icon} {template?.name}
          </span>
        </div>
      </div>

      {/* Render course via its assigned template */}
      <TemplateRenderer course={course} />
    </div>
  );
}
