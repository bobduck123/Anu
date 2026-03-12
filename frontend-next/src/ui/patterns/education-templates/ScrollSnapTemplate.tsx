'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import type { CourseData } from './types';

interface Props { course: CourseData; }

export function ScrollSnapTemplate({ course }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observers: IntersectionObserver[] = [];
    const sections = container.querySelectorAll('[data-section-idx]');

    sections.forEach((section) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const idx = parseInt(section.getAttribute('data-section-idx') ?? '0');
            setActiveIndex(idx);
          }
        },
        { root: container, threshold: 0.6 }
      );
      observer.observe(section);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [course.sections.length]);

  const SECTION_COLORS = [
    'from-[#1e3a5f]/10 to-transparent',
    'from-[#2d5a3d]/10 to-transparent',
    'from-[#5a3d2d]/10 to-transparent',
    'from-[#3d2d5a]/10 to-transparent',
    'from-[#5a2d3d]/10 to-transparent',
    'from-[#2d5a5a]/10 to-transparent',
  ];

  return (
    <div className="relative">
      {/* Progress dots */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        {course.sections.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              containerRef.current?.querySelector(`[data-section-idx="${i}"]`)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === activeIndex
                ? 'bg-[var(--color-primary)] scale-125'
                : 'bg-[var(--color-border)] hover:bg-[var(--color-muted-foreground)]'
            }`}
            aria-label={`Go to section ${i + 1}`}
          />
        ))}
      </div>

      {/* Scroll snap container */}
      <div
        ref={containerRef}
        className="h-[calc(100vh-56px)] overflow-y-auto snap-y snap-mandatory"
      >
        {course.sections.map((section, i) => (
          <div
            key={section.id}
            data-section-idx={i}
            className={`h-[calc(100vh-56px)] snap-start snap-always flex items-center justify-center p-8 bg-gradient-to-b ${SECTION_COLORS[i % SECTION_COLORS.length]}`}
          >
            <div className="max-w-2xl w-full space-y-6">
              <div className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Section {i + 1} of {course.sections.length}
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-foreground)]">
                {section.title}
              </h2>
              {section.image && (
                <Image
                  src={section.image}
                  alt=""
                  width={1200}
                  height={720}
                  unoptimized
                  className="w-full rounded-xl object-cover max-h-64"
                />
              )}
              <p className="text-base leading-relaxed text-[var(--color-foreground)]/80 whitespace-pre-wrap">
                {section.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
