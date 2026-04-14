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

import ArchiveRecordPage from '@/app/(public)/archive/[record]/page';

const fetchMock = vi.fn();

describe('Archive record route', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders trust-report-shaped detail data from public trust API', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            report: {
              id: 22,
              slug: 'flood-resilience-brief',
              title: 'Flood resilience trust brief',
              summary: 'Public summary for flood resilience readiness.',
              body: 'Detailed methods and status notes for flood resilience readiness.',
              sections: [{ heading: 'Methods', content: 'Cross-checked against published response logs.' }],
              report_type: 'status-brief',
              status: 'verified-summary',
              node_slug: 'default',
              jurisdiction: 'NSW',
              published_at: '2026-04-14T00:00:00Z',
              effective_at: '2026-04-14T00:00:00Z',
              source_notes: 'Transparency publication packet #80.',
              provenance_summary: 'Verified by steward review.',
              freshness_hint: 'Reviewed today',
              public_visibility: true,
              archive_record_id: 5,
              record_route: '/archive/flood-resilience-q2',
              sponsor_disclosure_ref: null,
            },
            archive_record: {
              id: 5,
              slug: 'flood-resilience-q2',
              record_type: 'public-trust-report',
              title: 'Flood resilience Q2 archive record',
              summary: 'Canonical archive record for flood resilience trust brief.',
              node_slug: 'default',
              visibility_class: 'public',
              verification_status: 'verified-summary',
              last_verified_at: '2026-04-14T00:00:00Z',
              source_route: '/transparency',
              provenance_summary: 'Published from transparency route.',
              sponsor_context: null,
              redaction_note: null,
            },
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            disclosures: [
              {
                id: 12,
                slug: 'flood-support-disclosure',
                sponsor_name: 'Public Interest Labs',
                sponsor_type: 'civic-partner',
                sponsored_surface: '/archive',
                placement_type: 'supporting-note',
                disclosure_label: 'Sponsor disclosure',
                public_note: 'Support acknowledged for public record publication.',
                disclosure_text: 'Disclosure text that must remain separate from trust-report body text.',
                active_from: '2026-04-01T00:00:00Z',
                active_until: '2026-05-01T00:00:00Z',
                is_active: true,
                is_currently_active: true,
                trust_report_slug: 'flood-resilience-brief',
                archive_record_slug: 'flood-resilience-q2',
                related_routes: {
                  surface: '/archive',
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

    render(await ArchiveRecordPage({ params: { record: 'flood-resilience-brief' } }));

    expect(screen.getByText('Flood resilience trust brief')).toBeInTheDocument();
    expect(screen.getByText(/Detailed methods and status notes for flood resilience readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/Disclosure text that must remain separate from trust-report body text/i)).toBeInTheDocument();
    expect(screen.getByText(/Transparency publication packet #80/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: verified-summary/i)).toBeInTheDocument();
    expect(screen.getByText('Sponsor disclosures')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open transparency context' })).toHaveAttribute(
      'href',
      '/transparency?report=flood-resilience-brief',
    );
  });

  it('falls back to archive handoff and still renders trust-report-shaped data', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false }), { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              archive_record: {
                id: 8,
                slug: 'governance-memory-note',
                record_type: 'governance-decision-summary',
                title: 'Governance memory note',
                summary: 'Decision memory summary.',
                node_slug: 'default',
                visibility_class: 'public',
                verification_status: 'verified-summary',
                last_verified_at: '2026-04-14T04:00:00Z',
                source_route: '/governance/model-registry',
                provenance_summary: 'Source registry decision packet.',
                sponsor_context: null,
                redaction_note: null,
              },
              trust_report: {
                id: 33,
                slug: 'governance-memory-trust',
                title: 'Governance memory trust note',
                summary: 'Trust context for governance memory.',
                body: 'Trust appendix body from governance packet.',
                sections: [],
                report_type: 'integrity-brief',
                status: 'provisional',
                node_slug: 'default',
                jurisdiction: null,
                published_at: '2026-04-14T04:00:00Z',
                effective_at: '2026-04-14T04:00:00Z',
                source_notes: 'Governance publication packet.',
                provenance_summary: 'Manual steward confirmation.',
                freshness_hint: 'Reviewed 2 hours ago',
                public_visibility: true,
                archive_record_id: 8,
                record_route: '/archive/governance-memory-note',
                sponsor_disclosure_ref: null,
              },
              deep_links: {
                archive: '/archive/governance-memory-note',
                transparency: '/transparency?report=governance-memory-trust',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            decision: {
              decision_id: 'D001',
              title: 'Control host/domain',
              decision_statement: 'Confirm canonical control host/domain for privileged surfaces.',
              why_it_matters: 'Needed for host gating proof.',
              owner: 'Founder + Ops',
              due_date: '2026-04-14',
              current_status: 'Open (default active)',
              record_route: '/archive/governance-memory-note',
              archive_record_slug: 'governance-memory-note',
              publication_scope: 'public_summary',
              source_label: 'Decision register (public-safe projection)',
              summary: 'Confirm canonical control host/domain for privileged surfaces.',
            },
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            disclosures: [],
            disclosure_state: 'none_published',
            degraded_honesty: {
              is_degraded: false,
              reason: null,
              fallback: 'No active sponsor disclosures are published for this surface at this time.',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(await ArchiveRecordPage({ params: { record: 'governance-memory-note' } }));

    expect(screen.getByText('Governance memory trust note')).toBeInTheDocument();
    expect(screen.getByText(/Trust appendix body from governance packet/i)).toBeInTheDocument();
    expect(screen.getByText(/Governance publication packet/i)).toBeInTheDocument();
    expect(screen.getByText(/No active sponsor disclosures are published for this surface at this time/i)).toBeInTheDocument();
    expect(screen.getByText(/Decision register context/i)).toBeInTheDocument();
    expect(screen.getByText(/D001: Control host\/domain/i)).toBeInTheDocument();
    expect(screen.getByText(/public-safe decision summary/i)).toBeInTheDocument();
  });

  it('renders explicit degraded state when neither trust detail nor archive handoff exists', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false }), { status: 404 }));

    render(await ArchiveRecordPage({ params: { record: 'missing-record' } }));

    expect(screen.getByText('missing-record')).toBeInTheDocument();
    expect(screen.getByText('Degraded honesty')).toBeInTheDocument();
    expect(screen.getByText(/No published trust or archive record exists/i)).toBeInTheDocument();
  });
});
