'use client';

import { useEffect, useMemo, useState } from 'react';
import { HeartHandshake, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ReliefIntakeForm from '@/components/relief/ReliefIntakeForm';
import { reliefApi, type ReliefRequestRecord } from '@/lib/api/endpoints';
import {
  AnuActionLink,
  AnuChip,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { AnuProcessPanel, AnuRouteBridgePanel } from '@/ui-system/anu/coordinationPrimitives';
import { EarthFieldShell } from '@/ui-system/realms/earth/EarthFieldShell';
import { EarthNavPill } from '@/ui-system/realms/earth/EarthNavPill';
import { EarthObjectMarker } from '@/ui-system/realms/earth/EarthObjectMarker';
import { EarthRisingPanel } from '@/ui-system/realms/earth/EarthRisingPanel';

const RELIEF_FIELD_POSITIONS = [
  { top: '20%', left: '20%' },
  { top: '26%', left: '54%' },
  { top: '48%', left: '78%' },
  { top: '64%', left: '32%' },
  { top: '76%', left: '68%' },
] as const;

const careStations = [
  {
    id: 'intake',
    title: 'Private intake',
    summary: 'Only the information needed for fair case review should enter the route.',
    meta: 'Entry to care lane',
    detail: 'Requests begin privately. The route protects personal detail while still making the care process readable.',
    badges: ['Protected', 'Consent first'],
  },
  {
    id: 'review',
    title: 'Consent review',
    summary: 'Case handling moves through consent-aware review rather than opaque private judgment.',
    meta: 'Steward lane',
    detail: 'Case handling depends on explicit consent and review posture, not a hidden discretionary queue.',
    badges: ['Review', 'Case worker'],
  },
  {
    id: 'queue',
    title: 'Queue visibility',
    summary: 'Members should be able to track queue position without exposing the request publicly.',
    meta: 'Protected status',
    detail: 'Queue visibility is a private trust mechanism: enough visibility to orient the member, not enough exposure to turn care into spectacle.',
    badges: ['Private', 'Status visible'],
  },
  {
    id: 'trust',
    title: 'Public trust',
    summary: 'Relief remains linked to transparency and impact even when the case details stay private.',
    meta: 'Commons accountability',
    detail: 'The request stays private, but the wider commons should still understand the trust posture and care capacity around it.',
    badges: ['Transparency', 'Impact'],
  },
] as const;

function moneyLabel(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

export default function ReliefPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<ReliefRequestRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>('intake');

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    reliefApi
      .myRequests()
      .then(setRequests)
      .catch((err) => setError(err.message || 'Failed to load requests'));
  }, [authLoading, isAuthenticated]);

  const openRequests = useMemo(
    () => requests.filter((request) => !['approved', 'rejected', 'disbursed'].includes(request.status)).length,
    [requests],
  );

  const requestMarkers = useMemo(
    () =>
      requests.slice(0, RELIEF_FIELD_POSITIONS.length).map((request, index) => ({
        id: `request-${request.id ?? index}`,
        title: `Request #${request.id ?? index + 1}`,
        summary: `Purpose: ${request.purpose}`,
        meta: `Status: ${request.status}`,
        detail: request.description || 'No additional description was provided for this request.',
        badges: [
          moneyLabel(request.amount_requested_cents),
          request.urgency,
          request.queue_position_estimate ? `Queue ${request.queue_position_estimate}` : 'Queue pending',
        ],
        style: RELIEF_FIELD_POSITIONS[index],
        request,
      })),
    [requests],
  );

  useEffect(() => {
    if (!isAuthenticated || requestMarkers.length === 0) {
      setSelectedKey((current) => current || 'intake');
      return;
    }

    const visible = requestMarkers.some((marker) => marker.id === selectedKey);
    if (!visible) {
      setSelectedKey(requestMarkers[0]?.id ?? 'intake');
    }
  }, [isAuthenticated, requestMarkers, selectedKey]);

  const selectedRequestMarker = requestMarkers.find((marker) => marker.id === selectedKey) ?? null;
  const selectedStation = careStations.find((station) => station.id === selectedKey) ?? careStations[0];

  const field = (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-5">
        <div className="rounded-full border border-white/10 bg-black/16 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#e5d2aa]/84 backdrop-blur-md">
          Care stays grounded, private, and visible to the member who needs it.
        </div>
      </div>

      {isAuthenticated && requestMarkers.length > 0 ? (
        requestMarkers.map((marker) => (
          <EarthObjectMarker
            key={marker.id}
            kind="care"
            title={marker.title}
            summary={marker.summary}
            meta={marker.meta}
            badges={marker.badges}
            active={selectedKey === marker.id}
            style={marker.style}
            onSelect={() => setSelectedKey(marker.id)}
          />
        ))
      ) : (
        careStations.map((station, index) => (
          <EarthObjectMarker
            key={station.id}
            kind="care"
            title={station.title}
            summary={station.summary}
            meta={station.meta}
            badges={station.badges}
            active={selectedKey === station.id}
            style={RELIEF_FIELD_POSITIONS[index]}
            onSelect={() => setSelectedKey(station.id)}
          />
        ))
      )}
    </div>
  );

  const fieldAside = (
    <>
      <AnuProcessPanel
        eyebrow="Grounded care"
        title="How the care lane stays accountable"
        description="Relief should stay grounded and urgent without turning private requests into public spectacle."
        steps={[
          {
            title: 'Private intake',
            detail: 'Only the information needed for review enters the route.',
          },
          {
            title: 'Consent-based review',
            detail: 'Requests move through review and case-worker follow-up instead of opaque routing.',
          },
          {
            title: 'Queue visibility',
            detail: 'Members can track request status and approximate queue position without exposing the case publicly.',
          },
        ]}
      />

      <AnuRouteBridgePanel
        eyebrow="Connected routes"
        title="Relief stays inside the wider commons loop"
        description="Care requests do not live in isolation. These nearby routes explain funding, trust, contribution, and public state around relief."
        links={[
          {
            href: '/impact',
            label: 'Impact bridge',
            detail: 'Follow how contribution, streaks, pool state, and participation connect to care capacity.',
            icon: Sparkles,
            tone: 'signal',
          },
          {
            href: '/transparency',
            label: 'Transparency ledger',
            detail: 'Read public totals, pool balances, and relief-capacity state without exposing individual requests.',
            icon: ShieldCheck,
          },
          {
            href: '/memberships',
            label: 'Commons memberships',
            detail: 'Evaluate how recurring contribution supports the care infrastructure behind this route.',
            icon: Wallet,
            tone: 'accent',
          },
          {
            href: '/community',
            label: 'Community commons',
            detail: 'Return to public commons when the question is context rather than a private case.',
            icon: HeartHandshake,
          },
        ]}
      />
    </>
  );

  const risingPanel = selectedRequestMarker ? (
    <EarthRisingPanel
      eyebrow="Grounded care request"
      title={selectedRequestMarker.title}
      summary={
        <div className="space-y-3">
          <p>{selectedRequestMarker.summary}</p>
          <p>{selectedRequestMarker.detail}</p>
        </div>
      }
      badges={
        <>
          <AnuChip tone="accent" icon={HeartHandshake}>
            {moneyLabel(selectedRequestMarker.request.amount_requested_cents)}
          </AnuChip>
          <AnuChip tone="muted" icon={ShieldCheck}>
            {selectedRequestMarker.request.status}
          </AnuChip>
        </>
      }
      primary={
        <div className="grid gap-4 md:grid-cols-2">
          <AnuInstrumentationCard
            label="Queue position"
            value={String(selectedRequestMarker.request.queue_position_estimate ?? 'Pending')}
            detail="Members should be able to track rough position without exposing the request publicly."
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Urgency"
            value={selectedRequestMarker.request.urgency}
            detail="Urgency remains visible to the member and the review lane."
            tone={selectedRequestMarker.request.urgency === 'high' ? 'warning' : 'steady'}
          />
        </div>
      }
      secondary={
        <AnuSurfacePanel tone="quiet" className="px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Care lane notes</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-200/82">
            <p>Purpose: {selectedRequestMarker.request.purpose}</p>
            <p>Queue estimate: {selectedRequestMarker.request.queue_position_estimate ?? 'Pending'}</p>
            <p>Status: {selectedRequestMarker.request.status}</p>
          </div>
        </AnuSurfacePanel>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <AnuActionLink href="/impact" tone="secondary">
            Follow care capacity upward
          </AnuActionLink>
          <AnuActionLink href="/transparency" tone="ghost">
            Cross-check public trust
          </AnuActionLink>
        </div>
      }
    />
  ) : (
    <EarthRisingPanel
      eyebrow="Grounded care route"
      title={selectedStation.title}
      summary={<p>{selectedStation.detail}</p>}
      badges={
        <>
          {selectedStation.badges.map((badge) => (
            <AnuChip key={badge} tone="muted">
              {badge}
            </AnuChip>
          ))}
        </>
      }
      primary={
        <AnuInstrumentationCard
          label="Care posture"
          value={selectedStation.meta}
          detail={selectedStation.summary}
          tone="signal"
        />
      }
      secondary={
        <AnuSurfacePanel tone="quiet" className="px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Route notes</p>
          <p className="mt-4 text-sm leading-6 text-slate-200/82">{selectedStation.detail}</p>
        </AnuSurfacePanel>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <AnuActionLink href={isAuthenticated ? '/impact' : '/auth'} tone="secondary">
            {isAuthenticated ? 'Open impact bridge' : 'Sign in to request support'}
          </AnuActionLink>
          <AnuActionLink href="/transparency" tone="ghost">
            Open transparency
          </AnuActionLink>
        </div>
      }
    />
  );

  const utility = (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <AnuInstrumentationCard
          label="Requests visible"
          value={isAuthenticated ? String(requests.length) : '--'}
          detail="Signed-in members can track their requests privately."
          icon={HeartHandshake}
          tone="signal"
        />
        <AnuInstrumentationCard
          label="Open cases"
          value={isAuthenticated ? String(openRequests) : '--'}
          detail="Active requests stay visible without moving them into the public layer."
          icon={ShieldCheck}
        />
        <AnuInstrumentationCard
          label="Trust surface"
          value="Transparency linked"
          detail="Relief remains connected to public trust and impact rather than becoming a hidden silo."
          icon={Wallet}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        {isAuthenticated ? (
          <ReliefIntakeForm />
        ) : (
          <AnuSurfacePanel tone="soft" className="p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Protected intake</p>
            <h2 className="mt-3 text-3xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Sign in to enter the care lane.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-300/82">
              Relief requests and case updates require authentication because request details are private by default.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <AnuActionLink href="/auth" tone="primary">
                Sign in
              </AnuActionLink>
              <AnuActionLink href="/contact" tone="ghost">
                Contact routing surface
              </AnuActionLink>
            </div>
          </AnuSurfacePanel>
        )}

        <AnuSurfacePanel tone="quiet" className="p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Care posture</p>
          <p className="mt-4 text-sm leading-6 text-slate-300/84">
            Relief should feel careful and accountable. The request stays private, the broader trust surface stays public, and the route relationships remain clear.
          </p>
        </AnuSurfacePanel>
      </div>

      {isAuthenticated ? (
        <section>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Your requests</p>
              <h2 className="mt-2 text-3xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Track private queue state
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300/82">
                Status, amount, and purpose remain visible to you without exposing your case to the public layer.
              </p>
            </div>
          </div>

          {error ? (
            <AnuSurfacePanel tone="quiet" className="mt-5 p-5 text-amber-200">
              <p className="text-sm">{error}</p>
            </AnuSurfacePanel>
          ) : null}

          <div className="mt-5 space-y-3">
            {requests.map((req) => (
              <AnuSurfacePanel key={req.id} tone="soft" className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Request #{req.id}</p>
                    <p className="mt-1 text-sm text-slate-300/82">Purpose: {req.purpose}</p>
                  </div>
                  <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-200">
                    {req.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300/84">
                    Amount requested: <strong className="font-mono-data text-white">{moneyLabel(req.amount_requested_cents)}</strong>
                  </div>
                  {req.queue_position_estimate ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300/84">
                      Queue estimate: <strong className="font-mono-data text-white">{req.queue_position_estimate}</strong>
                    </div>
                  ) : null}
                </div>
              </AnuSurfacePanel>
            ))}
            {!requests.length ? (
              <AnuSurfacePanel tone="quiet" className="p-5">
                <p className="text-sm text-slate-300/82">No requests yet.</p>
              </AnuSurfacePanel>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-20 pt-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <EarthFieldShell
          eyebrow="Earth bridge / relief"
          title="Ground private care in a visible route."
          description="Relief is a grounded care lane inside the wider commons. Requests stay private, queue visibility stays protected, and the surrounding trust and impact routes remain explicit."
          actions={
            isAuthenticated ? (
              <>
                <AnuActionLink href="/impact" tone="primary" iconRight={Sparkles}>
                  Open impact bridge
                </AnuActionLink>
                <AnuActionLink href="/transparency" tone="secondary" iconRight={ShieldCheck}>
                  Public transparency
                </AnuActionLink>
              </>
            ) : (
              <>
                <AnuActionLink href="/auth" tone="primary" iconRight={Sparkles}>
                  Sign in to request support
                </AnuActionLink>
                <AnuActionLink href="/transparency" tone="secondary" iconRight={ShieldCheck}>
                  Open transparency
                </AnuActionLink>
              </>
            )
          }
          metrics={
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <AnuHeroMetric label="Visibility" value="Private intake" detail="Request details stay protected even while the route remains legible." />
              <AnuHeroMetric label="Review model" value="Consent-based" detail="Case handling depends on consent and review rather than hidden discretionary routing." />
              <AnuHeroMetric label="Route state" value={isAuthenticated ? `${requests.length} requests` : 'Sign-in gated'} detail="Signed-in members can track queue state; public visitors can still understand the route." />
            </div>
          }
          field={field}
          fieldAside={fieldAside}
          risingPanel={risingPanel}
          nav={
            <EarthNavPill
              items={[
                { href: '/actions', label: 'Actions' },
                { href: '/events', label: 'Events' },
                { href: '/relief', label: 'Relief', active: true },
                { href: '/impact', label: 'Impact' },
              ]}
            />
          }
          utility={utility}
        />
      </div>
    </div>
  );
}
