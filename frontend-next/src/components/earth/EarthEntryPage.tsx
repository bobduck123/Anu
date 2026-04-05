'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { getEarthSummary, getUniversePacket, type EarthSummaryResponse, type UniversePacket } from '@/lib/api/earthHeavenApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const STAR_COLORS: Record<string, string> = {
  amber: '#e0b115',
  sea: '#7c413c',
  teal: '#7c413c',
  slate: '#f6d4cb',
  fern: '#665700',
  coral: '#f6d4cb',
  sky: '#f6d4cb',
  sand: '#f6d4cb',
};

function EarthSkyLayer({
  packet,
  dynamicEnabled,
}: {
  packet: UniversePacket | null;
  dynamicEnabled: boolean;
}) {
  if (!dynamicEnabled || !packet) {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 20% 15%, rgba(246,212,203,0.06), transparent 35%), radial-gradient(circle at 82% 8%, rgba(246,212,203,0.08), transparent 32%), linear-gradient(180deg, rgba(30,2,39,0.03), rgba(30,2,39,0.01) 30%, rgba(246,212,203,0) 70%)',
        }}
      />
    );
  }

  const stars = packet.objects.stars.slice(0, 90);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-[color:rgba(124,65,60,0.1)] via-transparent to-transparent" />
      {stars.map((star) => {
        const x = ((star.x + 100) / 200) * 100;
        const y = ((star.y + 100) / 200) * 100;
        const size = Math.max(1.5, Math.min(6, star.mass * 2.8));
        return (
          <span
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: Math.max(0.2, Math.min(0.65, star.brightness)),
              backgroundColor: STAR_COLORS[star.colorKey] || '#f6d4cb',
              boxShadow: `0 0 ${Math.max(2, size * 2)}px rgba(246,212,203,0.45)`,
            }}
          />
        );
      })}
    </div>
  );
}

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:rgba(246,212,203,0.7)] bg-[color:rgba(246,212,203,0.8)] px-4 py-3 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-[#7c413c]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#1e0227]">{value}</p>
    </div>
  );
}

export function EarthEntryPage() {
  const { user } = useAuth();
  const [nodeId, setNodeId] = useState(1);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadToken, setReloadToken] = useState(0);
  const [summary, setSummary] = useState<EarthSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skyPacket, setSkyPacket] = useState<UniversePacket | null>(null);
  const [skyFailed, setSkyFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const nextSummary = await getEarthSummary(nodeId);
        if (cancelled) return;
        setSummary(nextSummary);
        setLoadState('ready');
      } catch (error) {
        if (cancelled) return;
        setLoadState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load Earth summary');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [nodeId, reloadToken]);

  useEffect(() => {
    const fetchSky = async () => {
      if (!summary?.featureFlags.heavenUniverseEnabled || !summary.featureFlags.earthSkyEnabled) {
        setSkyPacket(null);
        setSkyFailed(false);
        return;
      }
      try {
        const packet = await getUniversePacket({
          node: nodeId,
          universeMode: 'mutual_aid',
          zoomLevel: 8,
          timeWindow: '30d',
          redactionLevel: 'public',
        });
        setSkyPacket(packet);
        setSkyFailed(false);
      } catch {
        setSkyPacket(null);
        setSkyFailed(true);
      }
    };
    fetchSky();
  }, [summary, nodeId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (summary?.liveNeeds || []).forEach((need) => set.add(need.category));
    return ['all', ...Array.from(set)];
  }, [summary]);

  const filteredNeeds = useMemo(() => {
    const items = summary?.liveNeeds || [];
    return items.filter((need) => {
      const matchesCategory = categoryFilter === 'all' || need.category === categoryFilter;
      const needle = query.trim().toLowerCase();
      const matchesQuery =
        !needle ||
        need.title.toLowerCase().includes(needle) ||
        need.description.toLowerCase().includes(needle) ||
        need.category.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [summary, categoryFilter, query]);

  if (loadState === 'loading' || loadState === 'idle') {
    return <div className="min-h-screen bg-[#f6d4cb] px-6 py-24 text-[#1e0227]">Loading Earth...</div>;
  }

  if (loadState === 'error' || !summary) {
    const actionableError = toActionableSurfaceError({
      area: 'Earth',
      rawMessage: errorMessage,
      fallbackHref: '/manara',
      fallbackLabel: 'Open Manara feed',
    });

    return (
      <div className="min-h-screen bg-[#f6d4cb] px-6 py-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#7c413c] bg-[var(--color-foreground)] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1e0227]">{actionableError.headline}</h1>
          <p className="mt-2 text-[#1e0227]">{actionableError.detail}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setLoadState('loading');
                setErrorMessage(null);
                setReloadToken((value) => value + 1);
              }}
              className="rounded-lg bg-[#1e0227] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[#1e0227]"
            >
              Retry
            </button>
            <Link
              href={actionableError.fallbackHref}
              className="rounded-lg border border-[#7c413c] px-4 py-2 text-sm font-medium text-[#1e0227] hover:bg-[#f6d4cb]"
            >
              {actionableError.fallbackLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const permissions = summary.permissions;
  const skyDynamicEnabled =
    summary.featureFlags.earthSkyEnabled &&
    summary.featureFlags.heavenUniverseEnabled &&
    !skyFailed &&
    !!skyPacket;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6d4cb] text-[#1e0227]">
      <EarthSkyLayer packet={skyPacket} dynamicEnabled={skyDynamicEnabled} />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <div className="rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.85)] p-4 shadow-sm backdrop-blur md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs uppercase tracking-wide text-[#7c413c]">Node</label>
              <select
                value={nodeId}
                onChange={(e) => {
                  setLoadState('loading');
                  setErrorMessage(null);
                  setNodeId(Number(e.target.value));
                }}
                className="rounded-lg border border-[#7c413c] bg-[var(--color-foreground)] px-3 py-2 text-sm"
              >
                <option value={1}>Node 1</option>
                <option value={2}>Node 2</option>
                <option value={3}>Node 3</option>
              </select>
              <span className="rounded-full bg-[#f6d4cb] px-3 py-1 text-xs font-medium text-[#1e0227]">
                Privacy: {permissions.canViewSensitiveNeeds ? 'trusted scope' : 'public scope'}
              </span>
              {summary.network.crisisMode.active ? (
                <span className="rounded-full bg-[#7c413c] px-3 py-1 text-xs font-medium text-[#7c413c]">Crisis active</span>
              ) : (
                <span className="rounded-full bg-[#665700] px-3 py-1 text-xs font-medium text-[#665700]">Normal mode</span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search needs"
                className="w-full rounded-lg border border-[#7c413c] bg-[var(--color-foreground)] px-3 py-2 text-sm sm:w-64"
              />
              <Link
                href="/relief"
                className="rounded-lg bg-[#7c413c] px-4 py-2 text-center text-sm font-medium text-[var(--color-foreground)] hover:bg-[#7c413c]"
              >
                Request Support
              </Link>
              <Link
                href="/actions"
                className="rounded-lg bg-[#665700] px-4 py-2 text-center text-sm font-medium text-[var(--color-foreground)] hover:bg-[#665700]"
              >
                Offer Support
              </Link>
              {summary.featureFlags.heavenUniverseEnabled && permissions.canEnterUniverse ? (
                <Link href="/heaven" className="rounded-lg border border-[#7c413c] bg-[#7c413c] px-4 py-2 text-center text-sm font-medium text-[#7c413c] hover:bg-[#7c413c]">
                  Enter Universe
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.9)] p-5 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#7c413c]">Earth Entry</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1e0227]">Reciprocal support, grounded operations, auditable action.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#1e0227]">
                Earth is stable even when Heaven is unavailable. This view stays operational-first, with calm context and clear routing signals.
              </p>
              {!permissions.authenticated ? (
                <p className="mt-3 rounded-lg border border-[#e0b115] bg-[#e0b115] px-3 py-2 text-sm text-[#e0b115]">
                  You are viewing public scope. Sign in to view your footprint and trusted responder details.
                </p>
              ) : (
                <p className="mt-3 rounded-lg border border-[#7c413c] bg-[#7c413c] px-3 py-2 text-sm text-[#7c413c]">
                  Signed in as {user?.pseudonym || user?.username || permissions.role}. Your access scope is {permissions.role}.
                </p>
              )}
              {skyFailed ? (
                <p className="mt-2 text-xs text-[#7c413c]">
                  Universe data is currently unreachable. Earth continues in calm fallback sky mode.
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Badge label="Fulfillment Rate (30d)" value={`${summary.hero.fulfillmentRate30d.toFixed(1)}%`} />
              <Badge label="Median Response Time" value={formatHours(summary.hero.medianResponseHours)} />
              <Badge label="Active Responders Nearby" value={`${summary.hero.activeRespondersNearby}`} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.9)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#7c413c]">Network Status</p>
            <p className="mt-3 text-sm text-[#1e0227]">Relief reserve runway: <span className="font-semibold">{summary.network.reliefReserveRunwayMonths.toFixed(2)} months</span></p>
            <p className="mt-2 text-sm text-[#1e0227]">Coverage gap index: <span className="font-semibold">{summary.network.coverageGapIndex.toFixed(3)}</span></p>
            <p className="mt-2 text-sm text-[#1e0227]">
              Crisis mode: <span className={`font-semibold ${summary.network.crisisMode.active ? 'text-[#7c413c]' : 'text-[#665700]'}`}>{summary.network.crisisMode.active ? 'active' : 'normal'}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.9)] p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-[#7c413c]">Live Needs</p>
              <span className="rounded-full bg-[#f6d4cb] px-2 py-1 text-xs text-[#1e0227]">Intake moderated</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="ml-auto rounded-md border border-[#7c413c] bg-[var(--color-foreground)] px-2 py-1 text-xs"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 space-y-2">
              {filteredNeeds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#7c413c] p-4 text-sm text-[#1e0227]">No urgent needs right now.</div>
              ) : (
                filteredNeeds.slice(0, 10).map((need) => (
                  <div key={need.id} className="rounded-lg border border-[#f6d4cb] bg-[var(--color-foreground)] px-3 py-2">
                    <p className="text-sm font-medium text-[#1e0227]">{need.title}</p>
                    <p className="text-xs text-[#1e0227]">{need.category} • {need.severity} • {need.status}</p>
                    <p className="mt-1 text-xs text-[#7c413c]">{need.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.9)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#7c413c]">Recently Fulfilled</p>
            <div className="mt-3 space-y-2">
              {summary.recentlyFulfilled.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#7c413c] p-3 text-sm text-[#1e0227]">No fulfilled items in this window yet.</div>
              ) : (
                summary.recentlyFulfilled.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#f6d4cb] bg-[var(--color-foreground)] px-3 py-2">
                    <p className="text-sm font-medium text-[#1e0227]">{item.title}</p>
                    <p className="text-xs text-[#1e0227]">{item.category} • {item.severity}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.9)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#7c413c]">Your Footprint</p>
            {!summary.footprint ? (
              <div className="mt-3 rounded-lg border border-dashed border-[#7c413c] p-3 text-sm text-[#1e0227]">
                Sign in to view your multi-vector contribution footprint.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Badge label="Time" value={summary.footprint.time_units.toFixed(1)} />
                <Badge label="Goods" value={summary.footprint.goods_units.toFixed(1)} />
                <Badge label="Skills" value={summary.footprint.skills_units.toFixed(1)} />
                <Badge label="Logistics" value={summary.footprint.logistics_units.toFixed(1)} />
                <Badge label="Verification" value={summary.footprint.verification_units.toFixed(1)} />
                <Badge label="Impact Credits" value={summary.footprint.impact_credits.toFixed(1)} />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.9)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#7c413c]">Education</p>
            <div className="mt-3 space-y-2">
              {summary.educationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-[#f6d4cb] bg-[var(--color-foreground)] px-3 py-2 text-sm text-[#1e0227] hover:border-[#7c413c] hover:text-[#1e0227]"
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[color:rgba(246,212,203,0.8)] bg-[color:rgba(246,212,203,0.9)] p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#7c413c]">Microcosms Near You</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.microcosms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#7c413c] p-3 text-sm text-[#1e0227]">No microcosms found for this node.</div>
            ) : (
              summary.microcosms.slice(0, 9).map((micro) => (
                <div key={micro.id} className="rounded-lg border border-[#f6d4cb] bg-[var(--color-foreground)] px-3 py-3">
                  <p className="text-sm font-semibold text-[#1e0227]">{micro.name}</p>
                  <p className="mt-1 text-xs text-[#1e0227]">{micro.description || 'Community support microcosm'}</p>
                  <p className="mt-2 text-xs text-[#7c413c]">
                    {micro.active_needs} active needs • {micro.active_offers} active offers • {micro.fulfilled_30d} fulfilled (30d)
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-md bg-[#1e0227] px-2 py-1 text-xs font-medium text-[var(--color-foreground)] hover:bg-[#1e0227]">Join</button>
                    <button className="rounded-md border border-[#7c413c] px-2 py-1 text-xs font-medium text-[#1e0227] hover:bg-[#f6d4cb]">Start Similar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
