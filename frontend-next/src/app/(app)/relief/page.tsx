'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { HeartHandshake, ShieldCheck, Sparkles, TentTree, Users, Wallet, Waypoints } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ReliefIntakeForm from '@/components/relief/ReliefIntakeForm';
import { reliefApi, type ReliefRequestRecord } from '@/lib/api/endpoints';
import {
  AnuActionLink,
  AnuChip,
  AnuInstrumentationCard,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { EarthFieldShell } from '@/ui-system/realms/earth/EarthFieldShell';
import { EarthNavPill } from '@/ui-system/realms/earth/EarthNavPill';
import { EarthObjectMarker } from '@/ui-system/realms/earth/EarthObjectMarker';
import { EarthRisingPanel } from '@/ui-system/realms/earth/EarthRisingPanel';

const EarthTerrainBackdrop = dynamicImport(
  () => import('@/ui-system/realms/earth/EarthTerrainBackdrop').then((module) => module.EarthTerrainBackdrop),
  { ssr: false },
);

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
        ].filter(Boolean),
        style: RELIEF_FIELD_POSITIONS[index],
        request,
      })),
    [requests],
  );

  const terrainMarkers = useMemo(
    () =>
      requests
        .filter((request) => typeof request.lat === 'number' && typeof request.lng === 'number')
        .map((request) => ({ lat: request.lat as number, lng: request.lng as number })),
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
      {terrainMarkers.length > 0 ? <EarthTerrainBackdrop markers={terrainMarkers} /> : null}
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Care lane notes</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
            <p>Purpose: {selectedRequestMarker.request.purpose}</p>
            <p>Queue estimate: {selectedRequestMarker.request.queue_position_estimate ?? 'Pending'}</p>
            <p>Status: {selectedRequestMarker.request.status}</p>
          </div>
        </AnuSurfacePanel>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <Link href="/impact" className="anu-earth-top-link">
            Follow care capacity upward
          </Link>
          <Link href="/transparency" className="anu-earth-top-link">
            Cross-check public trust
          </Link>
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Route notes</p>
          <p className="mt-4 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{selectedStation.detail}</p>
        </AnuSurfacePanel>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <Link href={isAuthenticated ? '/impact' : '/auth'} className="anu-earth-top-link">
            {isAuthenticated ? 'Open impact bridge' : 'Sign in to request support'}
          </Link>
          <Link href="/transparency" className="anu-earth-top-link">
            Open transparency
          </Link>
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Protected intake</p>
            <h2 className="mt-3 text-3xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Sign in to enter the care lane.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Care posture</p>
          <p className="mt-4 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
            Relief should feel careful and accountable. The request stays private, the broader trust surface stays public, and the route relationships remain clear.
          </p>
        </AnuSurfacePanel>
      </div>

      {isAuthenticated ? (
        <section>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Your requests</p>
              <h2 className="mt-2 text-3xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Track private queue state
              </h2>
              <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
                Status, amount, and purpose remain visible to you without exposing your case to the public layer.
              </p>
            </div>
          </div>

          {error ? (
            <AnuSurfacePanel tone="quiet" className="mt-5 p-5 text-[#e0b115]">
              <p className="text-sm">{error}</p>
            </AnuSurfacePanel>
          ) : null}

          <div className="mt-5 space-y-3">
            {requests.map((req) => (
              <AnuSurfacePanel key={req.id} tone="soft" className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">Request #{req.id}</p>
                    <p className="mt-1 text-sm text-[color:rgba(246,212,203,0.82)]">Purpose: {req.purpose}</p>
                  </div>
                  <span className="rounded-full border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.84)]">
                    {req.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Amount requested: <strong className="font-mono-data text-[var(--color-foreground)]">{moneyLabel(req.amount_requested_cents)}</strong>
                  </div>
                  {req.queue_position_estimate ? (
                    <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
                      Queue estimate: <strong className="font-mono-data text-[var(--color-foreground)]">{req.queue_position_estimate}</strong>
                    </div>
                  ) : null}
                </div>
              </AnuSurfacePanel>
            ))}
            {!requests.length ? (
              <AnuSurfacePanel tone="quiet" className="p-5">
                <p className="text-sm text-[color:rgba(246,212,203,0.82)]">No requests yet.</p>
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
      <div className="mx-auto w-full max-w-[96rem]">
        <EarthFieldShell
          eyebrow="Earth bridge / relief"
          title="The Commons"
          description="Private care stays grounded, queue visibility stays protected, and the wider trust routes remain readable without turning relief into a spectacle."
          actions={
            <div className="anu-earth-top-links">
              <Link href={isAuthenticated ? '/impact' : '/auth'} className="anu-earth-top-link">
                {isAuthenticated ? 'Open impact bridge' : 'Sign in to request support'}
              </Link>
              <Link href="/transparency" className="anu-earth-top-link">
                Public transparency
              </Link>
              <Link href="/memberships" className="anu-earth-top-link">
                Commons memberships
              </Link>
            </div>
          }
          metrics={
            <div className="anu-earth-hud-lines">
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Visibility</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">private intake</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Review</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">consent-based care lane</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Route state</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{isAuthenticated ? `${requests.length} visible requests` : 'sign-in gated'}</span>
              </div>
            </div>
          }
          field={field}
          risingPanel={risingPanel}
          nav={
            <EarthNavPill
              items={[
                { href: '/actions', label: 'Actions', icon: TentTree },
                { href: '/events', label: 'Events', icon: Users },
                { href: '/relief', label: 'Relief', active: true, icon: HeartHandshake },
                { href: '/impact', label: 'Impact', icon: Waypoints },
              ]}
            />
          }
          utility={utility}
        />
      </div>
    </div>
  );
}
