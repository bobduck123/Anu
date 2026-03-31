// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  AnuActionLink,
  AnuChamberCard,
  AnuChamberMetricsRail,
  AnuChip,
  AnuCommonsStatusRail,
  AnuControlButton,
  AnuFilterBar,
  AnuFilterGroup,
  AnuFilterInput,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

describe('ANU surface primitives', () => {
  it('renders page hero content and actions', () => {
    render(
      <AnuPageHero
        eyebrow="Beacon"
        title="Shared shell"
        description="A route-level hero"
        actions={<AnuActionLink href="/community" tone="primary" iconRight={ArrowRight}>Open commons</AnuActionLink>}
        aside={<AnuSurfacePanel tone="quiet">Aside content</AnuSurfacePanel>}
      >
        <AnuHeroMetric label="Signal" value="Stable" detail="Operationally clear" />
      </AnuPageHero>,
    );

    expect(screen.getByText('Shared shell')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open commons/i })).toHaveAttribute('href', '/community');
    expect(screen.getByText('Aside content')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('renders section heading and chips', () => {
    render(
      <div>
        <AnuSectionHeading
          eyebrow="Orientation"
          title="Start here"
          description="Shared surface heading"
          action={<AnuChip tone="accent" icon={Sparkles}>Three-step path</AnuChip>}
        />
      </div>,
    );

    expect(screen.getByText('Start here')).toBeInTheDocument();
    expect(screen.getByText('Three-step path')).toBeInTheDocument();
  });

  it('renders filter and observatory primitives', () => {
    render(
      <div>
        <AnuFilterBar>
          <AnuFilterGroup>
            <AnuFilterInput placeholder="Search titles..." />
            <AnuControlButton tone="active">Featured only</AnuControlButton>
          </AnuFilterGroup>
        </AnuFilterBar>
        <AnuChamberMetricsRail columns="two">
          <AnuHeroMetric label="Queue" value="4" detail="Pending tasks" />
          <AnuHeroMetric label="Unread" value="2" detail="Inbox notices" />
        </AnuChamberMetricsRail>
        <AnuCommonsStatusRail
          items={[
            {
              label: 'Feed mode',
              value: 'Live commons',
              detail: 'Browsing the current public feed.',
            },
            {
              label: 'Publication',
              value: '12 traces',
              detail: 'Visible publication count.',
            },
            {
              label: 'Trusted',
              value: '3 signals',
              detail: 'Secondary trusted layer.',
            },
          ]}
        />
        <AnuInstrumentationCard label="Inflows" value="$120.00" detail="Monthly inflows" />
        <AnuChamberCard eyebrow="Private chamber" title="Tasks" description="Local accountable work.">
          <p>Chamber content</p>
        </AnuChamberCard>
      </div>,
    );

    expect(screen.getByPlaceholderText('Search titles...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /featured only/i })).toBeInTheDocument();
    expect(screen.getByText('Pending tasks')).toBeInTheDocument();
    expect(screen.getByText('Live commons')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('Chamber content')).toBeInTheDocument();
  });
});
