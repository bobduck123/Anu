'use client';

import { TEMPLATE_REGISTRY } from './templates';
import type { TemplateId } from './types';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selected: TemplateId;
  onChange: (id: TemplateId) => void;
}

export function TemplateSelector({ selected, onChange }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {TEMPLATE_REGISTRY.map((t) => {
        const active = t.id === selected;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md'
                : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40'
            }`}
          >
            {active && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                <Check className="w-3 h-3 text-[var(--color-foreground)]" />
              </div>
            )}
            <div className="text-2xl mb-2">{t.icon}</div>
            <div className="font-semibold text-sm text-[var(--color-foreground)]">{t.name}</div>
            <div className="text-xs text-[var(--color-muted-foreground)] mt-1 leading-relaxed">{t.description}</div>
          </button>
        );
      })}
    </div>
  );
}
