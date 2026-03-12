'use client';

import type { ReactNode, CSSProperties } from 'react';
import Image from 'next/image';

// --- BentoGrid ---

export interface BentoGridProps {
  children: ReactNode;
  /** Max columns (default 12). Responsive: 1 on mobile, 6 on md, full on lg. */
  columns?: number;
  /** Row height in px (default 110) */
  rowHeight?: number;
  /** Gap in px (default 12) */
  gap?: number;
  className?: string;
  style?: CSSProperties;
}

export function BentoGrid({
  children,
  columns = 12,
  rowHeight = 110,
  gap = 12,
  className = '',
  style,
}: BentoGridProps) {
  return (
    <div
      className={`bento-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: `${rowHeight}px`,
        gap: `${gap}px`,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- BentoCell ---

export interface BentoCellProps {
  children: ReactNode;
  /** Column span (default 1) */
  colSpan?: number;
  /** Row span (default 1) */
  rowSpan?: number;
  /** Background color (CSS value) */
  bg?: string;
  /** Text color (CSS value) */
  fg?: string;
  /** Stagger animation delay index (0-based) */
  stagger?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function BentoCell({
  children,
  colSpan = 1,
  rowSpan = 1,
  bg,
  fg,
  stagger = 0,
  className = '',
  style,
  onClick,
}: BentoCellProps) {
  return (
    <div
      className={`bento-cell rounded-2xl border border-[var(--color-border)] overflow-hidden ${className}`}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        backgroundColor: bg ?? 'var(--color-card)',
        color: fg ?? 'var(--color-foreground)',
        padding: '24px',
        animation: 'bentoFloatIn 0.9s ease both',
        animationDelay: `${stagger * 0.05}s`,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </div>
  );
}

// --- BentoHero ---

export interface BentoHeroProps {
  title: string;
  subtitle?: string;
  metric?: string;
  metricLabel?: string;
  children?: ReactNode;
  /** Column span (default 7) */
  colSpan?: number;
  /** Row span (default 3) */
  rowSpan?: number;
  bg?: string;
  fg?: string;
  className?: string;
}

export function BentoHero({
  title,
  subtitle,
  metric,
  metricLabel,
  children,
  colSpan = 7,
  rowSpan = 3,
  bg,
  fg,
  className = '',
}: BentoHeroProps) {
  return (
    <BentoCell colSpan={colSpan} rowSpan={rowSpan} bg={bg} fg={fg} stagger={0} className={className}>
      <div className="h-full flex flex-col justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm opacity-70 mt-2 max-w-md">{subtitle}</p>}
        </div>
        <div className="flex items-end justify-between">
          {metric && (
            <div>
              <span className="text-3xl md:text-4xl font-bold">{metric}</span>
              {metricLabel && <span className="text-sm opacity-60 ml-2">{metricLabel}</span>}
            </div>
          )}
          {children}
        </div>
      </div>
    </BentoCell>
  );
}

// --- BentoStat ---

export interface BentoStatProps {
  label: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  icon?: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  bg?: string;
  fg?: string;
  stagger?: number;
}

export function BentoStat({
  label,
  value,
  change,
  changePositive,
  icon,
  colSpan = 3,
  rowSpan = 1,
  bg,
  fg,
  stagger = 0,
}: BentoStatProps) {
  return (
    <BentoCell colSpan={colSpan} rowSpan={rowSpan} bg={bg} fg={fg} stagger={stagger}>
      <div className="h-full flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider opacity-60">{label}</span>
          {icon && <span className="opacity-40">{icon}</span>}
        </div>
        <div>
          <span className="text-2xl font-bold">{value}</span>
          {change && (
            <span className={`text-xs ml-2 ${changePositive ? 'text-green-500' : 'text-red-400'}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </BentoCell>
  );
}

// --- BentoList ---

export interface BentoListProps {
  title: string;
  items: Array<{ label: string; value?: string; icon?: ReactNode }>;
  colSpan?: number;
  rowSpan?: number;
  bg?: string;
  fg?: string;
  stagger?: number;
}

export function BentoList({
  title,
  items,
  colSpan = 4,
  rowSpan = 2,
  bg,
  fg,
  stagger = 0,
}: BentoListProps) {
  return (
    <BentoCell colSpan={colSpan} rowSpan={rowSpan} bg={bg} fg={fg} stagger={stagger}>
      <h3 className="text-xs font-medium uppercase tracking-wider opacity-60 mb-3">{title}</h3>
      <ul className="space-y-2 overflow-y-auto flex-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 truncate">
              {item.icon && <span className="opacity-50">{item.icon}</span>}
              {item.label}
            </span>
            {item.value && <span className="text-xs opacity-50 ml-2 shrink-0">{item.value}</span>}
          </li>
        ))}
      </ul>
    </BentoCell>
  );
}

// --- BentoImage ---

export interface BentoImageProps {
  src: string;
  alt: string;
  overlay?: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  stagger?: number;
  className?: string;
  onClick?: () => void;
}

export function BentoImage({
  src,
  alt,
  overlay,
  colSpan = 4,
  rowSpan = 2,
  stagger = 0,
  className = '',
  onClick,
}: BentoImageProps) {
  return (
    <BentoCell colSpan={colSpan} rowSpan={rowSpan} stagger={stagger} className={className} onClick={onClick} style={{ padding: 0 }}>
      <div className="relative w-full h-full">
        <Image src={src} alt={alt} fill unoptimized sizes="100vw" className="w-full h-full object-cover" />
        {overlay && (
          <div className="absolute inset-0 bg-black/30 flex items-end p-4">
            {overlay}
          </div>
        )}
      </div>
    </BentoCell>
  );
}
