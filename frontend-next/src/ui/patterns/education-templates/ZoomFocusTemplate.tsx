'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import type { CourseData } from './types';

interface Props { course: CourseData; }

export function ZoomFocusTemplate({ course }: Props) {
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionRefs.current.forEach((el, idx) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          setVisibleSections((prev) => {
            const next = new Set(prev);
            if (entry.isIntersecting) next.add(idx);
            else next.delete(idx);
            return next;
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [course.sections.length]);

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-2xl mx-auto space-y-32">
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[var(--color-foreground)]">{course.title}</h1>
          <p className="text-base text-[var(--color-muted-foreground)]">{course.description}</p>
        </div>

        {/* Sections */}
        {course.sections.map((section, i) => {
          const isVisible = visibleSections.has(i);
          return (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[i] = el; }}
              className="transition-all duration-700 ease-out"
              style={{
                transform: isVisible ? 'scale(1)' : 'scale(0.85)',
                opacity: isVisible ? 1 : 0.3,
                filter: isVisible ? 'blur(0px)' : 'blur(4px)',
              }}
            >
              <div className={`rounded-2xl p-8 bg-[var(--color-card)] border border-[var(--color-border)] shadow-lg transition-shadow duration-700 ${
                isVisible ? 'shadow-xl' : 'shadow-none'
              }`}>
                <div className="text-xs font-medium text-[var(--color-primary)] mb-3">
                  Section {i + 1}
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-4">
                  {section.title}
                </h2>
                {section.image && (
                  <Image
                    src={section.image}
                    alt=""
                    width={1200}
                    height={672}
                    unoptimized
                    className="w-full rounded-xl object-cover max-h-56 mb-4"
                  />
                )}
                <p className="text-sm leading-relaxed text-[var(--color-foreground)]/80 whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
