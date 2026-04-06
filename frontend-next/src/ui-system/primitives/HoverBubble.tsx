'use client';

import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

type BubbleAlign = 'left' | 'center' | 'right';

interface HoverBubbleProps {
  title: string;
  children: ReactNode;
  align?: BubbleAlign;
  className?: string;
}

function alignmentClasses(align: BubbleAlign) {
  switch (align) {
    case 'left':
      return 'left-0';
    case 'right':
      return 'right-0';
    default:
      return 'left-1/2 -translate-x-1/2';
  }
}

export function HoverBubble({ title, children, align = 'center', className = '' }: HoverBubbleProps) {
  return (
    <div className={`group relative inline-flex ${className}`}>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.24)] bg-[color:rgba(246,212,203,0.08)] text-[color:rgba(246,212,203,0.82)] transition duration-200 hover:border-[color:rgba(224,177,21,0.42)] hover:bg-[color:rgba(224,177,21,0.16)] focus-visible:border-[color:rgba(224,177,21,0.5)] focus-visible:outline-none"
        aria-label={title}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <div
        role="note"
        className={`pointer-events-none absolute top-[calc(100%+0.45rem)] z-30 w-64 rounded-xl border border-[color:rgba(246,212,203,0.24)] bg-[color:rgba(30,2,39,0.96)] p-3 text-xs leading-5 text-[color:rgba(246,212,203,0.88)] shadow-[0_20px_45px_-24px_rgba(30,2,39,0.95)] opacity-0 translate-y-1 transition duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 ${alignmentClasses(align)}`}
      >
        <p className="font-semibold text-[color:rgba(246,212,203,0.96)]">{title}</p>
        <div className="mt-1 text-[color:rgba(246,212,203,0.84)]">{children}</div>
      </div>
    </div>
  );
}
