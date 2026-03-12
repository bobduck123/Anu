'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type CardVariant = 'default' | 'dark' | 'muted' | 'outline';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-[var(--color-card)] text-[var(--color-card-foreground)] border border-[var(--color-border)]',
  dark: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
  muted: 'bg-[var(--color-muted)] text-[var(--color-foreground)]',
  outline: 'bg-transparent border border-[var(--color-border)] text-[var(--color-foreground)]',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hover = false, children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-lg transition-all duration-500 ${variantClasses[variant]} ${paddingClasses[padding]} ${
          hover ? 'hover:-translate-y-1 hover:shadow-lg cursor-pointer' : ''
        } ${className}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold ${className}`} style={{ fontFamily: 'var(--font-serif)' }}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 pt-4 border-t border-[var(--color-border)] ${className}`}>{children}</div>;
}
