'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import type { CourseData } from './types';

interface Props { course: CourseData; }

export function PhysicsWireTemplate({ course }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleWires, setVisibleWires] = useState<Set<number>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll('[data-wire-node]');
    const observers: IntersectionObserver[] = [];

    nodes.forEach((node) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const idx = parseInt(node.getAttribute('data-wire-node') ?? '0');
          setVisibleWires((prev) => {
            const next = new Set(prev);
            if (entry.isIntersecting) {
              next.add(idx);
              setActiveIndex(idx);
            }
            return next;
          });
        },
        { threshold: 0.5 }
      );
      observer.observe(node);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [course.sections.length]);

  return (
    <div ref={containerRef} className="min-h-screen py-16 px-4">
      <div className="max-w-2xl mx-auto relative">
        {/* Central wire line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[var(--color-border)]" />

        {/* Sections as nodes */}
        {course.sections.map((section, i) => {
          const isVisible = visibleWires.has(i);
          const isActive = i === activeIndex;

          return (
            <div
              key={section.id}
              data-wire-node={i}
              className="relative pl-20 pb-16"
            >
              {/* Wire connection node */}
              <div className="absolute left-6 top-8 flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-500 ${
                    isActive
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-[0_0_12px_var(--color-primary)]'
                      : isVisible
                        ? 'bg-[var(--color-card)] border-[var(--color-primary)]'
                        : 'bg-[var(--color-card)] border-[var(--color-border)]'
                  }`}
                />
                {/* Horizontal connector */}
                <svg className="absolute left-5 top-1/2 w-12 h-4 -translate-y-1/2" viewBox="0 0 48 16">
                  <path
                    d="M 0 8 C 16 8, 16 2, 32 8 C 40 12, 44 8, 48 8"
                    fill="none"
                    className="transition-all duration-700"
                    stroke={isVisible ? 'var(--color-primary)' : 'var(--color-border)'}
                    strokeWidth="2"
                    strokeDasharray={isVisible ? '0' : '4 4'}
                    style={{
                      strokeDashoffset: isVisible ? 0 : 48,
                      transition: 'stroke-dashoffset 0.8s ease',
                    }}
                  />
                </svg>
              </div>

              {/* Content card */}
              <div
                className={`rounded-xl border p-6 transition-all duration-500 ${
                  isActive
                    ? 'bg-[var(--color-card)] border-[var(--color-primary)]/40 shadow-lg'
                    : isVisible
                      ? 'bg-[var(--color-card)] border-[var(--color-border)] shadow-md'
                      : 'bg-[var(--color-muted)] border-[var(--color-border)] opacity-60'
                }`}
                style={{
                  transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
                  transition: 'all 0.6s ease',
                }}
              >
                <div className="text-xs font-medium text-[var(--color-primary)] mb-2">
                  Node {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-3">
                  {section.title}
                </h3>
                {section.image && (
                  <Image
                    src={section.image}
                    alt=""
                    width={960}
                    height={384}
                    unoptimized
                    className="w-full rounded-lg object-cover max-h-40 mb-3"
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
