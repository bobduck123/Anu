'use client';

import { Component, type ReactNode } from 'react';
import type { CourseData, TemplateId } from './types';
import { ScrollSnapTemplate } from './ScrollSnapTemplate';
import { TimeTravelTemplate } from './TimeTravelTemplate';
import { ZoomFocusTemplate } from './ZoomFocusTemplate';
import { CosmicClockTemplate } from './CosmicClockTemplate';
import { RetroPixelTemplate } from './RetroPixelTemplate';
import { PhysicsWireTemplate } from './PhysicsWireTemplate';

interface Props {
  course?: CourseData;
  templateId?: TemplateId;
  mode?: 'full' | 'compact';
}

// Templates that accept course data
const COURSE_TEMPLATES: Partial<Record<TemplateId, React.ComponentType<{ course: CourseData }>>> = {
  'scroll-snap': ScrollSnapTemplate,
  'zoom-center': ZoomFocusTemplate,
  'physics-wire': PhysicsWireTemplate,
};

// Standalone interactive tools (no course data needed)
const TOOL_TEMPLATES: Partial<Record<TemplateId, React.ComponentType<{ mode?: 'full' | 'compact' }>>> = {
  'retro-pixel': RetroPixelTemplate,
  'cosmic-clock': CosmicClockTemplate,
  'time-travel': TimeTravelTemplate,
};

/** Error boundary wrapper for templates */
class TemplateErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function TemplateRenderer({ course, templateId, mode = 'full' }: Props) {
  const id = templateId ?? course?.template;
  if (!id) return null;

  // Check if it's a standalone tool
  const ToolTemplate = TOOL_TEMPLATES[id];
  if (ToolTemplate) {
    return (
      <TemplateErrorBoundary
        fallback={
          <div className="p-8 text-center">
            <p className="text-[var(--color-danger)]">Tool failed to render.</p>
          </div>
        }
      >
        <ToolTemplate mode={mode} />
      </TemplateErrorBoundary>
    );
  }

  // Course-based template
  const CourseTemplate = COURSE_TEMPLATES[id];
  if (!CourseTemplate || !course) {
    return (
      <div className="p-8 text-center text-sm opacity-50">
        Template not found or no course data.
      </div>
    );
  }

  return (
    <TemplateErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <p className="text-[var(--color-danger)]">Template failed to render.</p>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-2">Falling back to default view.</p>
          <ScrollSnapTemplate course={course} />
        </div>
      }
    >
      <CourseTemplate course={course} />
    </TemplateErrorBoundary>
  );
}
