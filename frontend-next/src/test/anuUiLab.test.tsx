// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnuUiLab } from '@/ui-system/anu/AnuUiLab';
import {
  ANU_PATTERN_EXPERIMENTS,
  ANU_PROMOTION_RULES,
  ANU_TOKEN_STAGING_GROUPS,
} from '@/ui-system/anu/patternBank';

describe('ANU Phase 0 pattern bank', () => {
  it('defines at least three adapted experiments with explicit sources and targets', () => {
    expect(ANU_PATTERN_EXPERIMENTS.length).toBeGreaterThanOrEqual(3);

    for (const experiment of ANU_PATTERN_EXPERIMENTS) {
      expect(experiment.targetSurface.length).toBeGreaterThan(0);
      expect(experiment.sources.length).toBeGreaterThan(0);
      expect(experiment.extractedQualities.length).toBeGreaterThan(0);
      expect(experiment.discardedQualities.length).toBeGreaterThan(0);
    }
  });

  it('keeps promotion rules and token staging categories explicit', () => {
    expect(ANU_PROMOTION_RULES.length).toBeGreaterThanOrEqual(4);
    expect(ANU_TOKEN_STAGING_GROUPS.map((group) => group.title)).toEqual(
      expect.arrayContaining(['Type', 'Color', 'Borders and Radii', 'Shadows and Materials', 'Motion']),
    );
  });

  it('renders the lab route with manifest-backed experiment cards', () => {
    render(<AnuUiLab />);

    expect(screen.getByRole('heading', { name: /ANU UI lab and pattern-bank foundation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Adapted experiments with explicit provenance/i })).toBeInTheDocument();
    expect(screen.getByText(/No raw clones/i)).toBeInTheDocument();
    expect(screen.getByText(/Private Chamber Queues/i)).toBeInTheDocument();
  });
});
