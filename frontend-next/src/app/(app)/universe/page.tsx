'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import {
  getEducationMapsBlockingMessage,
  getEducationMap,
  getEducationMapsFallbackMessage,
  isEducationMapsBlockingAuthError,
  listEducationMaps,
  MapResource,
  shouldUseEducationMapsFallback,
} from '@/lib/api/educationMaps';
import { generateMockPosts } from '@/data/adapters/communityAdapter';
import {
  getFallbackEducationMap,
  listFallbackEducationMapResources,
} from '@/lib/maps/fallbackMapData';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { FalakMapViewer } from '@/components/maps/FalakMapViewer';
import { buildCommunityUniversePacket } from '@/components/maps/communityUniverseAdapter';
import { mapResourceToUniversePacket } from '@/components/maps/educationMapUniverseAdapter';
import { buildCanonicalUniversePacket } from '@/components/maps/universe/packetBuilders';
import { getGlobalUniverseDemoPacket } from '@/components/maps/universe/fallbackPackets';
import { universePresentationTerms } from '@/components/maps/universe/presentationTerms';
import type { UniversePacket } from '@/components/maps/universe/types';
import { loadCommunityUniverseData } from '@/lib/community/loadCommunityUniverse';
import { useAuth } from '@/contexts/AuthContext';

const LEFT_THOUGHT_TOPIC_KEY = 'left-thought-graph-atlas';

const INITIAL_COMMUNITY_PACKET = buildCommunityUniversePacket(generateMockPosts(18, 20260319), {
  mode: 'demo',
  sourceSummary: 'Deterministic local packet / 18 demo community traces',
  fallbackMessage: 'Using bundled read-only community traces while live services initialise.',
});

export default function UniversePage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const initialFallbackMaps = listFallbackEducationMapResources({ status: 'published' });
  const seededMaps = initialFallbackMaps.length > 0 ? initialFallbackMaps : listFallbackEducationMapResources();

  const [maps, setMaps] = useState<MapResource[]>(seededMaps);
  const [communityPacket, setCommunityPacket] = useState<UniversePacket | null>(INITIAL_COMMUNITY_PACKET);
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState<boolean>(seededMaps.length > 0 || Boolean(INITIAL_COMMUNITY_PACKET.fallbackState?.active));
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(
    seededMaps.length > 0 || INITIAL_COMMUNITY_PACKET.fallbackState?.active
      ? 'Using bundled read-only universe packets while live services initialise.'
      : null,
  );

  const loadUniverse = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFallbackActive(false);
    setFallbackMessage(null);
    const communityLoad = loadCommunityUniverseData();

    try {
      const definitions = await listEducationMaps();
      const preferredDefinitions =
        definitions.filter((definition) => definition.status === 'published').length > 0
          ? definitions.filter((definition) => definition.status === 'published')
          : definitions;
      const targets = preferredDefinitions.slice(0, 10);

      const loadedResults = await Promise.allSettled(
        targets.map(async (definition) => {
          try {
            return {
              map: await getEducationMap(definition.topicKey),
              fallbackMessage: null,
            };
          } catch (reason) {
            if (shouldUseEducationMapsFallback(reason, { authenticated: isAuthenticated })) {
              const fallback = getFallbackEducationMap(definition.topicKey);
              if (fallback) {
                return {
                  map: fallback,
                  fallbackMessage: getEducationMapsFallbackMessage(reason),
                };
              }
            }

            throw reason;
          }
        }),
      );

      const loadedMaps: MapResource[] = [];
      const fallbackReasons: string[] = [];
      const hardFailures: unknown[] = [];

      loadedResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          loadedMaps.push(result.value.map);
          if (result.value.fallbackMessage) {
            fallbackReasons.push(result.value.fallbackMessage);
          }
          return;
        }

        hardFailures.push(result.reason);
      });

      if (loadedMaps.length < 1) {
        throw hardFailures[0] ?? new Error('No Manara learning universes are available yet.');
      }

      setMaps(loadedMaps);

      const communityData = await communityLoad;
      const nextCommunityPacket =
        communityData.posts.length > 0
          ? buildCommunityUniversePacket(communityData.posts, {
              mode: 'live',
              sourceSummary: `${communityData.posts.length} live community traces / ${communityData.trustedNewsMeta.count} trusted news / shared packet`,
            })
          : buildCommunityUniversePacket(generateMockPosts(18, 20260319), {
              mode: communityData.loadError ? 'read_only' : 'demo',
              sourceSummary: 'Deterministic local packet / 18 demo community traces',
              fallbackMessage:
                communityData.loadError ??
                'No public community traces are available yet. Using a deterministic local packet to keep the shared universe inspectable.',
            });

      setCommunityPacket(nextCommunityPacket);

      const nextFallbackMessage =
        fallbackReasons[0] ??
        communityData.loadError ??
        (hardFailures.length > 0 ? 'Some universe slices could not be loaded and were omitted.' : null);
      const nextFallbackActive =
        fallbackReasons.length > 0 ||
        hardFailures.length > 0 ||
        Boolean(nextCommunityPacket.fallbackState?.active);

      if (nextFallbackActive) {
        setFallbackActive(true);
        setFallbackMessage(nextFallbackMessage);
      }
    } catch (reason) {
      const fallbackMaps = listFallbackEducationMapResources({ status: 'published' });
      const hasFallbackMaps = fallbackMaps.length > 0;
      const communityData = await communityLoad.catch(() => null);

      if (isEducationMapsBlockingAuthError(reason, { authenticated: isAuthenticated })) {
        setError(getEducationMapsBlockingMessage(reason));
      } else if (shouldUseEducationMapsFallback(reason, { authenticated: isAuthenticated }) || hasFallbackMaps) {
        const recoveryMaps = hasFallbackMaps ? fallbackMaps : listFallbackEducationMapResources();
        setMaps(recoveryMaps);
        setCommunityPacket(
          communityData && communityData.posts.length > 0
            ? buildCommunityUniversePacket(communityData.posts, {
                mode: 'live',
                sourceSummary: `${communityData.posts.length} live community traces / ${communityData.trustedNewsMeta.count} trusted news / shared packet`,
              })
            : INITIAL_COMMUNITY_PACKET,
        );
        setFallbackActive(true);
        setFallbackMessage(
          shouldUseEducationMapsFallback(reason, { authenticated: isAuthenticated })
            ? getEducationMapsFallbackMessage(reason)
            : communityData?.loadError ?? 'Live universe services are unavailable. Using bundled read-only universe packets.',
        );
      } else {
        const actionableError = toActionableSurfaceError({
          area: 'Universe view',
          rawMessage: reason instanceof Error ? reason.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Open education fallback',
        });
        setError(`${actionableError.headline}. ${actionableError.detail}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void loadUniverse();
  }, [authLoading, isAuthenticated, loadUniverse]);

  useEffect(() => {
    if (selectedTopicKey === 'all') {
      return;
    }

    if (
      selectedTopicKey !== communityPacket?.domain.key &&
      !maps.some((resource) => resource.definition.topicKey === selectedTopicKey)
    ) {
      setSelectedTopicKey('all');
    }
  }, [communityPacket?.domain.key, maps, selectedTopicKey]);

  const packetsByTopicKey = useMemo(
    () => {
      const packets = maps.map((resource) => [
        resource.definition.topicKey,
        mapResourceToUniversePacket(resource, {
          surface: selectedTopicKey === 'all' ? 'universe' : 'education',
        }),
      ] as const);

      if (communityPacket) {
        packets.push([communityPacket.domain.key, communityPacket] as const);
      }

      return new Map(packets);
    },
    [communityPacket, maps, selectedTopicKey],
  );

  const displayMap = useMemo(() => {
    if (selectedTopicKey === 'all' || selectedTopicKey === communityPacket?.domain.key) {
      return null;
    }

    return maps.find((resource) => resource.definition.topicKey === selectedTopicKey) ?? null;
  }, [communityPacket?.domain.key, maps, selectedTopicKey]);
  const displayPacket = useMemo(() => {
    if (selectedTopicKey === 'all') {
      if (fallbackActive && packetsByTopicKey.size < 1) {
        return getGlobalUniverseDemoPacket();
      }

      const mergedPacket = buildCanonicalUniversePacket(Array.from(packetsByTopicKey.values()));
      return mergedPacket ?? getGlobalUniverseDemoPacket();
    }

    return packetsByTopicKey.get(selectedTopicKey) ?? null;
  }, [fallbackActive, packetsByTopicKey, selectedTopicKey]);

  const topicOptions = useMemo(
    () => {
      const educationTopics = maps
        .map((resource) => resource.definition)
        .sort((left, right) => left.title.localeCompare(right.title));

      if (!communityPacket) {
        return educationTopics;
      }

      return [
        ...educationTopics,
        {
          id: communityPacket.id,
          title: communityPacket.title,
          topicKey: communityPacket.domain.key,
        },
      ];
    },
    [communityPacket, maps],
  );
  const communityTopicKey = communityPacket?.domain.key ?? null;
  const isLeftThoughtScope = selectedTopicKey === LEFT_THOUGHT_TOPIC_KEY;
  const leftThoughtSourceCoverage = useMemo(() => {
    if (!isLeftThoughtScope || !displayPacket) {
      return null;
    }

    const sepLinkedStars = displayPacket.stars.filter((star) =>
      star.explainer.sources.some((source) => source.domain === 'plato.stanford.edu'),
    ).length;

    return {
      totalStars: displayPacket.stars.length,
      sepLinkedStars,
      relations: displayPacket.relations?.length ?? 0,
    };
  }, [displayPacket, isLeftThoughtScope]);

  const viewerEyebrowLabel =
    selectedTopicKey === 'all'
      ? 'Manara shared universe'
      : selectedTopicKey === communityTopicKey
        ? universePresentationTerms.communityUniverse
        : isLeftThoughtScope
          ? 'ANU left-thought universe'
          : 'Manara domain universe';
  const viewerTitlePrefix =
    selectedTopicKey === 'all'
      ? 'Universe'
      : selectedTopicKey === communityTopicKey
        ? 'Community'
        : isLeftThoughtScope
          ? 'Left Thought'
          : 'Domain';

  return (
    <div className="h-full">
      <FalakMapViewer
        immersive
        map={displayMap}
        packet={displayPacket}
        loading={loading}
        error={error}
        onRetry={() => void loadUniverse()}
        eyebrowLabel={viewerEyebrowLabel}
        titlePrefix={viewerTitlePrefix}
        showAdminLink={selectedTopicKey !== 'all' && !fallbackActive && Boolean(displayPacket?.packetMeta?.adminTopicKey)}
        headerActions={
          <div className="space-y-3 text-xs text-slate-200">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <label className="manara-glass-chip rounded-[1rem] border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-slate-400">Universe scope</span>
                <select
                  value={selectedTopicKey}
                  onChange={(event) => setSelectedTopicKey(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                >
                  <option value="all">All available domains</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.id} value={topic.topicKey}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void loadUniverse()}
                className="manara-glass-chip inline-flex min-h-10 items-center justify-center gap-2 border border-white/20 bg-white/6 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100 transition-colors hover:bg-white/12"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {`Refresh ${universePresentationTerms.universe.toLowerCase()}`}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="manara-glass-chip inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                {packetsByTopicKey.size} source {universePresentationTerms.domain.toLowerCase()}s loaded
              </span>
              <span className="manara-glass-chip inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-1">
                {`${universePresentationTerms.universe} scope: ${selectedTopicKey === 'all' ? 'cross-domain' : selectedTopicKey}`}
              </span>
              {isLeftThoughtScope && leftThoughtSourceCoverage ? (
                <span className="manara-glass-chip inline-flex items-center gap-2 border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                  Left Thought Phase A+ fallback · {leftThoughtSourceCoverage.totalStars} stars · {leftThoughtSourceCoverage.relations} relations · SEP linked {leftThoughtSourceCoverage.sepLinkedStars}/{leftThoughtSourceCoverage.totalStars}
                </span>
              ) : null}
            </div>

            {fallbackActive ? (
              <p className="rounded-lg border border-amber-300/35 bg-amber-300/12 px-3 py-2 text-[11px] leading-5 text-amber-100">
                {fallbackMessage ??
                  'Live universe APIs are partially unavailable. This view is using bundled read-only universe packets where needed.'}
              </p>
            ) : null}
          </div>
        }
        footerActions={
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-xl border border-slate-700 px-3 py-1">{`${universePresentationTerms.universe} renderer: QuantumCanvas`}</span>
            <span className="rounded-xl border border-slate-700 px-3 py-1">{`${universePresentationTerms.explainer}: floating inspector`}</span>
            <span className="rounded-xl border border-slate-700 px-3 py-1">{`Source-linked ${universePresentationTerms.stars.toLowerCase()}: enabled`}</span>
          </div>
        }
      />
    </div>
  );
}
