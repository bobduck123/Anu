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

import ArchiveIndexPage from '@/app/(public)/archive/page';

const fetchMock = vi.fn();

describe('Archive index route', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the archive shell with trust-report list data', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            reports: [
              {
                id: 11,
                slug: 'water-trust-report',
                title: 'Water stewardship trust report',
                summary: 'Quarterly public trust snapshot for water stewardship pathways.',
                report_type: 'integrity-brief',
                status: 'verified-summary',
                node_slug: 'default',
                jurisdiction: 'NSW',
                published_at: '2026-04-14T02:00:00Z',
                effective_at: '2026-04-14T02:00:00Z',
                source_notes: 'Published from transparency packet #74.',
                freshness_hint: 'Reviewed 3 hours ago',
                public_visibility: true,
                record_route: '/archive/water-stewardship-q2-2026',
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
    );

    render(await ArchiveIndexPage());

    expect(screen.getByText('Public memory records')).toBeInTheDocument();
    expect(screen.getByText('Water stewardship trust report')).toBeInTheDocument();
    expect(screen.getByText(/Threshold:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open archive record' })).toHaveAttribute(
      'href',
      '/archive/water-stewardship-q2-2026',
    );
  });

  it('renders honest degraded state when trust index cannot be loaded', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json' } }),
    );

    render(await ArchiveIndexPage());

    expect(screen.getByText('Degraded honesty')).toBeInTheDocument();
    expect(screen.getByText(/Trust report index is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/No public trust reports are currently available/i)).toBeInTheDocument();
  });
});
