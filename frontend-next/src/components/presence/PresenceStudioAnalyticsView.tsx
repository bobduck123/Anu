'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, Inbox, QrCode, RadioTower, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  getOwnerPresenceNodeAnalytics,
  getOwnerPresenceNodes,
  type PresenceAnalyticsSummary,
  type PresenceNode,
} from '@/lib/api/presence';
import { describeOwnerPresenceError } from './presenceStudioOwnerUtils';

function eventLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function Metric({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
      <Icon className="h-4 w-4 text-[#f6d4cb]/70" />
      <p className="mt-3 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#f6d4cb]/56">{label}</p>
    </div>
  );
}

export function PresenceStudioAnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [analytics, setAnalytics] = useState<PresenceAnalyticsSummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const nodes = await getOwnerPresenceNodes();
        const primary = Array.isArray(nodes) ? nodes[0] : null;
        if (!active) return;
        if (!primary) {
          setNode(null);
          setAnalytics(null);
          return;
        }
        const summary = await getOwnerPresenceNodeAnalytics(primary.id);
        if (!active) return;
        setNode(primary);
        setAnalytics(summary);
      } catch (loadError) {
        if (!active) return;
        setNode(null);
        setAnalytics(null);
        setError(loadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const scanHits = useMemo(() => {
    const events = analytics?.recent_events || [];
    return events.filter((event) => ['qr_scanned', 'qr_viewed', 'nfc_scanned'].includes(event.event_type)).length;
  }, [analytics]);

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading analytics..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Analytics</p>
        <h1 className="mt-3 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
          {errorState.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{errorState.description}</p>
      </AnuSurfacePanel>
    );
  }

  if (!node) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <EmptyState icon={UserRound} title="No Presence node available" description="Analytics appear after an owner account has a Presence node attached." />
      </AnuSurfacePanel>
    );
  }

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">Signals</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Audience signals
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Privacy-conscious activity for the public Presence: views, enquiries, scan activity, top sources, and recent events. Real signals only; no invented charts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnuChip tone="accent">{node.display_name}</AnuChip>
            <AnuChip tone="muted">Real events only</AnuChip>
          </div>
        </div>
      </AnuSurfacePanel>

      {!analytics ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState icon={BarChart3} title="No signals yet" description="Public visits, enquiries, QR views, and NFC source activity will appear here after the Presence receives real activity." />
        </AnuSurfacePanel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={Eye} label="Views" value={analytics.total_views || 0} />
            <Metric icon={Inbox} label="Enquiries" value={analytics.total_enquiries || 0} />
            <Metric icon={BarChart3} label="Conversion" value={`${analytics.conversion_rate || 0}%`} />
            <Metric icon={QrCode} label="Recent scan events" value={scanHits} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Top sources</p>
              {analytics.top_sources?.length ? (
                <div className="mt-4 space-y-3">
                  {analytics.top_sources.map((source, index) => (
                    <div key={`${source.source_code || source.source_type || 'source'}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                      <span className="text-[#f6d4cb]/86">{source.source_code || source.source_type || 'unknown source'}</span>
                      <span className="text-[#fff7f2]">{source.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#f6d4cb]/64">No QR or NFC source activity yet.</p>
              )}
            </AnuSurfacePanel>

            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Recent activity</p>
              {analytics.recent_events?.length ? (
                <div className="mt-4 space-y-3">
                  {analytics.recent_events.slice(0, 12).map((event) => (
                    <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <p className="text-sm text-[#fff7f2]">{eventLabel(event.event_type)}</p>
                      <p className="mt-1 text-xs text-[#f6d4cb]/54">{event.created_at ? new Date(event.created_at).toLocaleString() : 'Time not recorded'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#f6d4cb]/64">No recent events captured yet.</p>
              )}
            </AnuSurfacePanel>
          </div>

          {analytics.top_links?.length ? (
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Top links</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analytics.top_links.map((link, index) => (
                  <div key={`${link.url || link.label || 'link'}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-sm text-[#fff7f2]">{link.label || link.url || 'Link'}</p>
                    <p className="mt-1 text-xs text-[#f6d4cb]/54">{link.count} clicks</p>
                  </div>
                ))}
              </div>
            </AnuSurfacePanel>
          ) : null}

          <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
            <p className="flex items-center gap-2 text-sm leading-6 text-[#f6d4cb]/68">
              <RadioTower className="h-4 w-4" />
              Anonymous scan activity is shown as source signals. Named contacts are only created after a submitted enquiry, quote request, or manual owner/admin entry.
            </p>
          </AnuSurfacePanel>
        </>
      )}
    </div>
  );
}
