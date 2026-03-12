'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'accent' | 'sage' | 'forest' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:brightness-90',
  accent: 'bg-[var(--color-accent)] text-white hover:brightness-90',
  sage: 'bg-[var(--color-sage)] text-white hover:bg-[var(--color-forest)]',
  forest: 'bg-[var(--color-forest)] text-white hover:brightness-90',
  outline: 'bg-transparent border-[1.5px] border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-institutional-light)]',
  ghost: 'bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
  danger: 'bg-[var(--color-danger)] text-white hover:brightness-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm px-4 py-1.5 gap-1.5',
  md: 'text-sm px-6 py-2.5 gap-2',
  lg: 'text-base px-8 py-3 gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon: Icon, iconRight: IconRight, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-full font-medium transition-all duration-300 focus-ring disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : Icon ? (
          <Icon className="w-4 h-4" />
        ) : null}
        {children}
        {IconRight && !loading && <IconRight className="w-4 h-4" />}
      </button>
    );
  }
);

Button.displayName = 'Button';
