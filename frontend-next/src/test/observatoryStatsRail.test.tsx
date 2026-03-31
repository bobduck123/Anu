// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObservatoryStatsRail } from '@/ui-system/realms/labyrinth/ObservatoryStatsRail';

describe('ObservatoryStatsRail', () => {
  it('renders shared embedded observatory stat panels', () => {
    render(
      <ObservatoryStatsRail
        items={[
          { label: 'Contract', value: 'Live', detail: 'Reporting contract state.' },
          { label: 'Coverage', value: '3 families', detail: 'Observatory route families.' },
        ]}
      />,
    );

    expect(screen.getByText('Contract')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('3 families')).toBeInTheDocument();
  });
});
