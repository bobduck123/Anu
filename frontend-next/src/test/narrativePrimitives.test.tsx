// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { AnuNarrativeBriefPanel } from '@/ui-system/anu/narrativePrimitives';

describe('AnuNarrativeBriefPanel', () => {
  it('renders a shared route-reading grammar with signals and why-it-matters guidance', () => {
    render(
      <AnuNarrativeBriefPanel
        eyebrow="Route reading"
        title="How to read this route"
        description="A structured narrative output."
        signals={[
          {
            label: 'Output mode',
            value: 'Live route',
            detail: 'The route is rendering current state.',
            tone: 'signal',
            icon: Sparkles,
          },
          {
            label: 'Fallback truth',
            value: 'Declared openly',
            detail: 'Fallbacks remain visible.',
            tone: 'accent',
            icon: ShieldCheck,
          },
        ]}
        whyItMatters="People should not need insider context to understand the current contract."
      />,
    );

    expect(screen.getByText('How to read this route')).toBeInTheDocument();
    expect(screen.getByText('Live route')).toBeInTheDocument();
    expect(screen.getByText('Declared openly')).toBeInTheDocument();
    expect(screen.getByText('Why this matters')).toBeInTheDocument();
  });
});
