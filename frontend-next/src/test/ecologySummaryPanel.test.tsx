// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EcologySummaryPanel from '@/components/impact/EcologySummaryPanel';

describe('EcologySummaryPanel', () => {
  it('renders computed ecology and geology details', () => {
    render(
      <EcologySummaryPanel
        ecology={{
          ecologyIdentity: 'estuary commons',
          identityConfidence: 0.78,
          dominantNutrients: ['reciprocity', 'mycelial-density'],
          nutrientVector: {
            careIndex: 0.72,
            reciprocityIndex: 0.79,
            resonanceIndex: 0.68,
            originalityIndex: 0.63,
            stewardshipIndex: 0.74,
            mycelialDensityIndex: 0.83,
          },
          geology: {
            formKey: 'alluvial-delta',
            strataSummary: 'Dense reciprocity and connective tissue.',
            permeabilityIndex: 0.79,
            volatilityIndex: 0.44,
            stabilityIndex: 0.75,
          },
        }}
      />,
    );

    expect(screen.getByText('estuary commons')).toBeTruthy();
    expect(screen.getByText('alluvial-delta')).toBeTruthy();
    expect(screen.getByText('Reciprocity')).toBeTruthy();
  });
});
