'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';

const baseInputClasses = 'w-full px-3 py-2 border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent placeholder:text-[var(--color-muted-foreground)]';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, error, hint, required, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
          {label}
          {required && <span className="text-[var(--color-danger)] ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ className = '', error, ...props }, ref) => (
    <input
      ref={ref}
      className={`${baseInputClasses} ${error ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]' : ''} ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  ({ className = '', error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={`${baseInputClasses} resize-y min-h-[80px] ${error ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]' : ''} ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ className = '', error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={`${baseInputClasses} ${error ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => (
    <label className={`inline-flex items-center gap-2 text-sm cursor-pointer ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="w-4 h-4 rounded border-[var(--color-input)] text-[var(--color-primary)] focus:ring-[var(--color-ring)]"
        {...props}
      />
      {label && <span className="text-[var(--color-foreground)]">{label}</span>}
    </label>
  )
);
Checkbox.displayName = 'Checkbox';
