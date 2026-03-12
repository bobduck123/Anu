'use client';

import { useState, useMemo } from 'react';
import { useFeatureFlag } from '@/lib/featureFlags';
import {
  TEMPLATE_REGISTRY,
  TemplateRenderer,
  MOCK_COURSES,
  type TemplateId,
  type CourseData,
} from '@/ui/patterns/education-templates';
import { BookOpen, Eye, ArrowRight, Layers } from 'lucide-react';
import Link from 'next/link';

export default function EducationTemplatesPage() {
  const enabled = useFeatureFlag('educationTemplates');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateId | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);

  // Build a preview course for template demos
  const previewCourse = useMemo<CourseData | null>(() => {
    if (!previewTemplate) return null;
    // Use the first mock course's content but with the selected template
    const base = MOCK_COURSES[0];
    return { ...base, template: previewTemplate };
  }, [previewTemplate]);

  if (!enabled) {
    return (
      <div className="p-8 text-center text-[var(--color-muted-foreground)]">
        <Layers className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">Education Templates disabled</p>
        <p className="text-sm mt-1">Enable the educationTemplates feature flag to access template library.</p>
      </div>
    );
  }

  // Interactive tools (no course data needed)
  const INTERACTIVE_TOOLS: TemplateId[] = ['retro-pixel', 'cosmic-clock', 'time-travel'];
  const isInteractiveTool = previewTemplate && INTERACTIVE_TOOLS.includes(previewTemplate);

  // If previewing a specific template
  if (previewTemplate) {
    return (
      <div className="min-h-screen">
        {/* Preview header bar */}
        <div className="sticky top-0 z-30 bg-[var(--color-background)]/95 backdrop-blur border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              &larr; Back to Templates
            </button>
            <span className="text-[var(--color-muted-foreground)]">/</span>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {TEMPLATE_REGISTRY.find((t) => t.id === previewTemplate)?.name} {isInteractiveTool ? 'Tool' : 'Preview'}
            </span>
          </div>
          {!isInteractiveTool && previewCourse && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Showing: {previewCourse.title}
              </span>
            </div>
          )}
        </div>

        {/* Template/tool preview */}
        {isInteractiveTool ? (
          <TemplateRenderer templateId={previewTemplate} mode="full" />
        ) : previewCourse ? (
          <TemplateRenderer course={previewCourse} />
        ) : null}
      </div>
    );
  }

  // If viewing a course detail
  if (selectedCourse) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-30 bg-[var(--color-background)]/95 backdrop-blur border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCourse(null)}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              &larr; Back to Templates
            </button>
            <span className="text-[var(--color-muted-foreground)]">/</span>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {selectedCourse.title}
            </span>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            {TEMPLATE_REGISTRY.find((t) => t.id === selectedCourse.template)?.name}
          </span>
        </div>

        <TemplateRenderer course={selectedCourse} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Education Templates
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          Choose from 6 presentation styles. Each transforms course content into a unique learning experience.
        </p>
      </div>

      {/* Template Grid */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
          Available Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATE_REGISTRY.map((template) => (
            <div
              key={template.id}
              className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:border-[var(--color-primary)]/40 hover:shadow-lg transition-all"
            >
              <div className="text-3xl mb-3">{template.icon}</div>
              <h3 className="font-semibold text-[var(--color-foreground)]">{template.name}</h3>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1 leading-relaxed">
                {template.description}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]/60 mt-2 italic">
                {template.preview}
              </p>
              <button
                onClick={() => setPreviewTemplate(template.id)}
                className="mt-4 flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Sample Courses */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
          Sample Courses
        </h2>
        <div className="space-y-3">
          {MOCK_COURSES.map((course) => {
            const template = TEMPLATE_REGISTRY.find((t) => t.id === course.template);
            return (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:border-[var(--color-primary)]/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-xl">
                    {template?.icon ?? '📖'}
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--color-foreground)]">{course.title}</h3>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-muted-foreground)]/60">
                      <span>By {course.author}</span>
                      <span>{course.sections.length} sections</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                        {template?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCourse(course)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition-opacity"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <Link
                    href={`/education/courses/${course.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                  >
                    Full Page
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
