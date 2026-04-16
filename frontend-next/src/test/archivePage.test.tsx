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

  it('passes title-prefix to backend and renders filtered paginated archive summaries', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            records: [
              {
                record_ref: 'alpha-trust-1',
                slug: 'alpha-trust-1',
                title: 'Alpha trust one',
                record_type: 'public-trust-report',
                summary: 'Canonical memory summary for alpha trust one.',
                provenance_label: 'Published from transparency packet #90.',
                source_label: 'Published from transparency packet #90.',
                source_route: '/transparency',
                verification_status: 'verified-summary',
                status: 'verified-summary',
                published_at: '2026-04-14T02:00:00Z',
                effective_at: '2026-04-14T02:00:00Z',
                freshness_hint: 'Reviewed 1 hour ago',
                related_trust_report_slug: 'alpha-trust-report',
                related_trust_report_route: '/transparency?report=alpha-trust-report',
                related_decision_id: 'D001',
                related_decision_route: '/archive/alpha-trust-1#decision-summary',
                related_route: '/archive/alpha-trust-1#decision-summary',
                record_route: '/archive/alpha-trust-1',
                is_trust_linked: true,
                is_decision_linked: true,
                sponsor_name: 'Should Not Render',
              },
            ],
            pagination: {
              model: 'offset',
              page: 1,
              page_size: 12,
              total_records: 3,
              total_pages: 3,
              has_more: true,
              has_previous: false,
              next_page: 2,
              previous_page: null,
              ordering: ['updated_at:desc', 'id:desc'],
            },
            available_record_types: ['public-trust-report', 'connector-transition-proof-summary'],
            applied_filters: {
              record_type: 'public-trust-report',
              title_prefix: 'Al',
              node_slug: null,
            },
            applied_record_type_filter: 'public-trust-report',
            applied_title_prefix_filter: 'Al',
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

    render(
      await ArchiveIndexPage({
        searchParams: Promise.resolve({ type: 'public-trust-report', title_prefix: 'Al', page: '1' }),
      }),
    );

    expect(screen.getByText('Alpha trust one')).toBeInTheDocument();
    expect(screen.getByText(/Trust-linked record/i)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Al')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/archive?type=public-trust-report&title_prefix=Al&page=2',
    );
    expect(screen.getByRole('link', { name: 'Open decision summary' })).toHaveAttribute(
      'href',
      '/archive/alpha-trust-1#decision-summary',
    );
    expect(screen.queryByText('Should Not Render')).not.toBeInTheDocument();

    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain(
      '/public/archive/records?page=1&page_size=12&type=public-trust-report&title_prefix=Al',
    );
  });

  it('keeps title-prefix refinement when navigating previous page and supports clear action', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            records: [
              {
                record_ref: 'alpha-trust-3',
                slug: 'alpha-trust-3',
                title: 'Alpha trust three',
                record_type: 'public-trust-report',
                summary: 'Alpha trust three summary.',
                provenance_label: 'Alpha trust provenance.',
                source_label: 'Alpha trust provenance.',
                source_route: '/transparency',
                verification_status: 'verified-summary',
                status: 'verified-summary',
                published_at: null,
                effective_at: '2026-04-14T04:00:00Z',
                freshness_hint: 'Last verified 2026-04-14T04:00:00Z',
                related_trust_report_slug: null,
                related_trust_report_route: null,
                related_route: '/transparency',
                record_route: '/archive/alpha-trust-3',
                is_trust_linked: false,
              },
            ],
            pagination: {
              model: 'offset',
              page: 2,
              page_size: 2,
              total_records: 3,
              total_pages: 2,
              has_more: false,
              has_previous: true,
              next_page: null,
              previous_page: 1,
              ordering: ['updated_at:desc', 'id:desc'],
            },
            available_record_types: ['public-trust-report'],
            applied_filters: {
              record_type: 'public-trust-report',
              title_prefix: 'Al',
              node_slug: null,
            },
            applied_record_type_filter: 'public-trust-report',
            applied_title_prefix_filter: 'Al',
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

    render(
      await ArchiveIndexPage({
        searchParams: Promise.resolve({ type: 'public-trust-report', title_prefix: 'Al', page: '2' }),
      }),
    );

    expect(screen.getByRole('link', { name: 'Previous page' })).toHaveAttribute(
      'href',
      '/archive?type=public-trust-report&title_prefix=Al',
    );
    expect(screen.getByRole('link', { name: 'Clear' })).toHaveAttribute(
      'href',
      '/archive?type=public-trust-report',
    );
  });

  it('normalizes title-prefix whitespace before backend query and preserves normalized echo in UI', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            records: [],
            pagination: {
              model: 'offset',
              page: 1,
              page_size: 12,
              total_records: 0,
              total_pages: 0,
              has_more: false,
              has_previous: false,
              next_page: null,
              previous_page: null,
              ordering: ['updated_at:desc', 'id:desc'],
            },
            available_record_types: ['public-trust-report'],
            applied_filters: {
              record_type: null,
              title_prefix: 'Alpha Trust',
              node_slug: null,
            },
            applied_record_type_filter: null,
            applied_title_prefix_filter: 'Alpha Trust',
            degraded_honesty: {
              is_degraded: true,
              reason: 'no_public_archive_records_for_title_prefix',
              fallback: "No public archive records are published for title prefix 'Alpha Trust' in this scope yet.",
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(await ArchiveIndexPage({ searchParams: Promise.resolve({ title_prefix: '  Alpha   Trust  ' }) }));

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0] ?? 'https://core.example/public/archive/records'));
    expect(requestUrl.searchParams.get('title_prefix')).toBe('Alpha Trust');
    expect(screen.getByDisplayValue('Alpha Trust')).toBeInTheDocument();
  });

  it('caps overlong title-prefix before backend query', async () => {
    const overlongPrefix = 'A'.repeat(120);
    const cappedPrefix = 'A'.repeat(80);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            records: [],
            pagination: {
              model: 'offset',
              page: 1,
              page_size: 12,
              total_records: 0,
              total_pages: 0,
              has_more: false,
              has_previous: false,
              next_page: null,
              previous_page: null,
              ordering: ['updated_at:desc', 'id:desc'],
            },
            available_record_types: ['public-trust-report'],
            applied_filters: {
              record_type: null,
              title_prefix: cappedPrefix,
              node_slug: null,
            },
            applied_record_type_filter: null,
            applied_title_prefix_filter: cappedPrefix,
            degraded_honesty: {
              is_degraded: true,
              reason: 'no_public_archive_records_for_title_prefix',
              fallback: "No public archive records are published for title prefix 'AAAAAAAA' in this scope yet.",
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(await ArchiveIndexPage({ searchParams: Promise.resolve({ title_prefix: overlongPrefix }) }));

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0] ?? 'https://core.example/public/archive/records'));
    expect(requestUrl.searchParams.get('title_prefix')).toBe(cappedPrefix);
    expect(requestUrl.searchParams.get('title_prefix')?.length).toBe(80);
  });

  it('renders honest degraded state when archive summary feed cannot be loaded', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json' } }),
    );

    render(await ArchiveIndexPage({}));

    expect(screen.getByText('Degraded honesty')).toBeInTheDocument();
    expect(screen.getByText(/Archive summary feed is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/No public archive records are currently available for this node scope/i)).toBeInTheDocument();
  });

  it('renders honest empty-state messaging for title-prefix refinement', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            records: [],
            pagination: {
              model: 'offset',
              page: 1,
              page_size: 12,
              total_records: 0,
              total_pages: 0,
              has_more: false,
              has_previous: false,
              next_page: null,
              previous_page: null,
              ordering: ['updated_at:desc', 'id:desc'],
            },
            available_record_types: ['public-trust-report'],
            applied_filters: {
              record_type: null,
              title_prefix: 'zzz',
              node_slug: null,
            },
            applied_record_type_filter: null,
            applied_title_prefix_filter: 'zzz',
            degraded_honesty: {
              is_degraded: true,
              reason: 'no_public_archive_records_for_title_prefix',
              fallback: "No public archive records are published for title prefix 'zzz' in this scope yet.",
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(await ArchiveIndexPage({ searchParams: Promise.resolve({ title_prefix: 'zzz' }) }));

    expect(screen.getByText(/No public archive records are currently available for title prefix "zzz"/i)).toBeInTheDocument();
    expect(screen.getByText(/No public archive records are published for title prefix 'zzz'/i)).toBeInTheDocument();
  });
});
