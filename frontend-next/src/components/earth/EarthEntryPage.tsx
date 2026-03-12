'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { getEarthSummary, getUniversePacket, type EarthSummaryResponse, type UniversePacket } from '@/lib/api/earthHeavenApi';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const STAR_COLORS: Record<string, string> = {
  amber: '#f59e0b',
  sea: '#0ea5e9',
  teal: '#14b8a6',
  slate: '#94a3b8',
  fern: '#22c55e',
  coral: '#fb7185',
  sky: '#60a5fa',
  sand: '#f4c27b',
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
            'radial-gradient(circle at 20% 15%, rgba(167, 139, 250, 0.06), transparent 35%), radial-gradient(circle at 82% 8%, rgba(56, 189, 248, 0.08), transparent 32%), linear-gradient(180deg, rgba(12, 26, 43, 0.03), rgba(11, 20, 35, 0.01) 30%, rgba(255,255,255,0) 70%)',
        }}
      />
    );
  }

  const stars = packet.objects.stars.slice(0, 90);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-950/10 via-transparent to-transparent" />
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
              backgroundColor: STAR_COLORS[star.colorKey] || '#93c5fd',
              boxShadow: `0 0 ${Math.max(2, size * 2)}px rgba(147,197,253,0.45)`,
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
    <div className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
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
    return <div className="min-h-screen bg-slate-50 px-6 py-24 text-slate-600">Loading Earth...</div>;
  }

  if (loadState === 'error' || !summary) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Earth temporarily unavailable</h1>
          <p className="mt-2 text-slate-600">{errorMessage || 'Unable to load Earth dashboards.'}</p>
          <button
            onClick={() => {
              setLoadState('loading');
              setErrorMessage(null);
              setReloadToken((value) => value + 1);
            }}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Retry
          </button>
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
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <EarthSkyLayer packet={skyPacket} dynamicEnabled={skyDynamicEnabled} />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">Node</label>
              <select
                value={nodeId}
                onChange={(e) => {
                  setLoadState('loading');
                  setErrorMessage(null);
                  setNodeId(Number(e.target.value));
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value={1}>Node 1</option>
                <option value={2}>Node 2</option>
                <option value={3}>Node 3</option>
              </select>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Privacy: {permissions.canViewSensitiveNeeds ? 'trusted scope' : 'public scope'}
              </span>
              {summary.network.crisisMode.active ? (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">Crisis active</span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Normal mode</span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search needs"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-64"
              />
              <Link
                href="/relief"
                className="rounded-lg bg-rose-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-rose-500"
              >
                Request Support
              </Link>
              <Link
                href="/actions"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-600"
              >
                Offer Support
              </Link>
              {summary.featureFlags.heavenUniverseEnabled && permissions.canEnterUniverse ? (
                <Link href="/heaven" className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-center text-sm font-medium text-indigo-700 hover:bg-indigo-100">
                  Enter Universe
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Earth Entry</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Reciprocal support, grounded operations, auditable action.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                Earth is stable even when Heaven is unavailable. This view stays operational-first, with calm context and clear routing signals.
              </p>
              {!permissions.authenticated ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  You are viewing public scope. Sign in to view your footprint and trusted responder details.
                </p>
              ) : (
                <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                  Signed in as {user?.pseudonym || user?.username || permissions.role}. Your access scope is {permissions.role}.
                </p>
              )}
              {skyFailed ? (
                <p className="mt-2 text-xs text-slate-500">Universe packet unavailable. Earth is running in fallback sky mode.</p>
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
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Network Status</p>
            <p className="mt-3 text-sm text-slate-700">Relief reserve runway: <span className="font-semibold">{summary.network.reliefReserveRunwayMonths.toFixed(2)} months</span></p>
            <p className="mt-2 text-sm text-slate-700">Coverage gap index: <span className="font-semibold">{summary.network.coverageGapIndex.toFixed(3)}</span></p>
            <p className="mt-2 text-sm text-slate-700">
              Crisis mode: <span className={`font-semibold ${summary.network.crisisMode.active ? 'text-rose-700' : 'text-emerald-700'}`}>{summary.network.crisisMode.active ? 'active' : 'normal'}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Live Needs</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Intake moderated</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="ml-auto rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
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
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">No urgent needs right now.</div>
              ) : (
                filteredNeeds.slice(0, 10).map((need) => (
                  <div key={need.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{need.title}</p>
                    <p className="text-xs text-slate-600">{need.category} • {need.severity} • {need.status}</p>
                    <p className="mt-1 text-xs text-slate-500">{need.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Recently Fulfilled</p>
            <div className="mt-3 space-y-2">
              {summary.recentlyFulfilled.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">No fulfilled items in this window yet.</div>
              ) : (
                summary.recentlyFulfilled.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.category} • {item.severity}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Your Footprint</p>
            {!summary.footprint ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
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
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Education</p>
            <div className="mt-3 space-y-2">
              {summary.educationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900"
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Microcosms Near You</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.microcosms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">No microcosms found for this node.</div>
            ) : (
              summary.microcosms.slice(0, 9).map((micro) => (
                <div key={micro.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">{micro.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{micro.description || 'Community support microcosm'}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {micro.active_needs} active needs • {micro.active_offers} active offers • {micro.fulfilled_30d} fulfilled (30d)
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800">Join</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">Start Similar</button>
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
