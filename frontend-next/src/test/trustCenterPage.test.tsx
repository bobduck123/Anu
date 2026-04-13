// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@/lib/runtime', () => ({
  getCoreApiBase: () => 'https://core.example',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import TrustCenterPage from '@/app/(public)/trust/page';

const fetchMock = vi.fn();

describe('TrustCenterPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders intentional IA sections with trust reports and sponsor disclosures separated', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              reports: [
                {
                  id: 1,
                  slug: 'flood-resilience-brief',
                  title: 'Flood resilience trust brief',
                  summary: 'Public trust summary for flood resilience.',
                  report_type: 'status-brief',
                  status: 'verified-summary',
                  node_slug: 'default',
                  jurisdiction: 'NSW',
                  published_at: '2026-04-14T00:00:00Z',
                  effective_at: '2026-04-14T00:00:00Z',
                  source_notes: 'Published from transparency packet #80.',
                  freshness_hint: 'Reviewed today',
                  public_visibility: true,
                  record_route: '/archive/flood-resilience-q2',
                },
              ],
              degraded_honesty: {
                is_degraded: false,
                reason: null,
                fallback: null,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              disclosures: [
                {
                  id: 7,
                  slug: 'public-interest-labs-disclosure',
                  sponsor_name: 'Public Interest Labs',
                  sponsor_type: 'civic-partner',
                  sponsored_surface: '/trust',
                  placement_type: 'supporting-note',
                  disclosure_label: 'Sponsor disclosure',
                  public_note: 'Support acknowledged for trust publication infrastructure.',
                  disclosure_text: 'Support does not alter trust report claims.',
                  active_from: '2026-04-01T00:00:00Z',
                  active_until: '2026-05-01T00:00:00Z',
                  is_active: true,
                  is_currently_active: true,
                  trust_report_slug: 'flood-resilience-brief',
                  archive_record_slug: 'flood-resilience-q2',
                  related_routes: {
                    surface: '/trust',
                    transparency: '/transparency',
                    trust_report: '/transparency?report=flood-resilience-brief',
                    archive_record: '/archive/flood-resilience-q2',
                  },
                },
              ],
              disclosure_state: 'live',
              degraded_honesty: {
                is_degraded: false,
                reason: null,
                fallback: null,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    render(await TrustCenterPage());

    expect(screen.getByText('Public trust, disclosures, and memory links')).toBeInTheDocument();
    expect(screen.getByText('Latest trust reports')).toBeInTheDocument();
    expect(screen.getByText('Sponsor disclosures')).toBeInTheDocument();
    expect(screen.getByText('Archive and public memory links')).toBeInTheDocument();
    expect(screen.getAllByText('Flood resilience trust brief').length).toBeGreaterThan(0);
    expect(screen.getByText('Public Interest Labs')).toBeInTheDocument();
    expect(screen.getByText(/never overwrites trust-report body text/i)).toBeInTheDocument();
  });

  it('renders trust content even when sponsor feed is degraded and does not imply sponsor-free certainty', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              reports: [
                {
                  id: 2,
                  slug: 'water-integrity-brief',
                  title: 'Water integrity brief',
                  summary: 'Water trust summary.',
                  report_type: 'integrity-brief',
                  status: 'provisional',
                  node_slug: 'default',
                  jurisdiction: null,
                  published_at: '2026-04-14T00:00:00Z',
                  effective_at: '2026-04-14T00:00:00Z',
                  source_notes: 'Node publication packet.',
                  freshness_hint: null,
                  public_visibility: true,
                  record_route: '/archive/water-integrity-brief',
                },
              ],
              degraded_honesty: {
                is_degraded: false,
                reason: null,
                fallback: null,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    render(await TrustCenterPage());

    expect(screen.getAllByText('Water integrity brief').length).toBeGreaterThan(0);
    expect(screen.getByText('Disclosure feed degraded')).toBeInTheDocument();
    expect(screen.getByText('Sponsor disclosure contract is temporarily unavailable.')).toBeInTheDocument();
  });

  it('renders sponsor section and archive links even when trust-report feed is degraded', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              disclosures: [
                {
                  id: 9,
                  slug: 'archive-support-note',
                  sponsor_name: 'Civic Memory Partners',
                  sponsor_type: 'foundation',
                  sponsored_surface: '/trust',
                  placement_type: 'supporting-note',
                  disclosure_label: 'Sponsor disclosure',
                  public_note: 'Support acknowledged for archive publication reliability.',
                  disclosure_text: 'Sponsor note remains separate from trust report content.',
                  active_from: null,
                  active_until: null,
                  is_active: true,
                  is_currently_active: true,
                  trust_report_slug: null,
                  archive_record_slug: null,
                  related_routes: {
                    surface: '/trust',
                    transparency: '/transparency',
                  },
                },
              ],
              disclosure_state: 'live',
              degraded_honesty: {
                is_degraded: false,
                reason: null,
                fallback: null,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    render(await TrustCenterPage());

    expect(screen.getByText('Trust report feed degraded')).toBeInTheDocument();
    expect(screen.getByText('Civic Memory Partners')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Archive index' })).toHaveAttribute('href', '/archive');
  });
});
