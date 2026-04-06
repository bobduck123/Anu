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
import {
  buildImpactCelestialPacket,
  buildMemeticCelestialPacket,
} from '@/components/maps/celestial/celestialPacketAdapter';
import { mapResourceToUniversePacket } from '@/components/maps/educationMapUniverseAdapter';
import { buildCanonicalUniversePacket } from '@/components/maps/universe/packetBuilders';
import { getGlobalUniverseDemoPacket } from '@/components/maps/universe/fallbackPackets';
import { universePresentationTerms } from '@/components/maps/universe/presentationTerms';
import type { UniversePacket } from '@/components/maps/universe/types';
import { loadCommunityUniverseData } from '@/lib/community/loadCommunityUniverse';
import { useAuth } from '@/contexts/AuthContext';
import { impactApi } from '@/lib/api/endpoints';
import floraFaunaApi from '@/lib/api/floraFaunaApi';

const LEFT_THOUGHT_TOPIC_KEY = 'left-thought-graph-atlas';

const INITIAL_COMMUNITY_PACKET = buildCommunityUniversePacket(generateMockPosts(18, 20260319), {
  mode: 'demo',
  sourceSummary: 'Deterministic local packet / 18 demo community traces',
  fallbackMessage: 'Using bundled read-only community traces while live services initialise.',
});
const INITIAL_IMPACT_PACKET = buildImpactCelestialPacket(null, {
  mode: 'demo',
  sourceSummary: 'Deterministic local packet / impact outcomes demo',
  fallbackMessage: 'Using bundled deterministic impact outcomes while live impact services initialise.',
});
const INITIAL_MEMETIC_PACKET = buildMemeticCelestialPacket(null, {
  mode: 'demo',
  sourceSummary: 'Deterministic local packet / memetic artifacts demo',
  fallbackMessage: 'Using bundled deterministic memetic artifacts while live memetics services initialise.',
});

export default function UniversePage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const initialFallbackMaps = listFallbackEducationMapResources({ status: 'published' });
  const seededMaps = initialFallbackMaps.length > 0 ? initialFallbackMaps : listFallbackEducationMapResources();

  const [maps, setMaps] = useState<MapResource[]>(seededMaps);
  const [communityPacket, setCommunityPacket] = useState<UniversePacket | null>(INITIAL_COMMUNITY_PACKET);
  const [impactPacket, setImpactPacket] = useState<UniversePacket | null>(INITIAL_IMPACT_PACKET);
  const [memeticPacket, setMemeticPacket] = useState<UniversePacket | null>(INITIAL_MEMETIC_PACKET);
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState<boolean>(
    seededMaps.length > 0 ||
      Boolean(INITIAL_COMMUNITY_PACKET.fallbackState?.active) ||
      Boolean(INITIAL_IMPACT_PACKET.fallbackState?.active) ||
      Boolean(INITIAL_MEMETIC_PACKET.fallbackState?.active),
  );
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(
    seededMaps.length > 0 ||
      INITIAL_COMMUNITY_PACKET.fallbackState?.active ||
      INITIAL_IMPACT_PACKET.fallbackState?.active ||
      INITIAL_MEMETIC_PACKET.fallbackState?.active
      ? 'Using bundled read-only universe packets while live services initialise.'
      : null,
  );

  const loadUniverse = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFallbackActive(false);
    setFallbackMessage(null);
    const communityLoad = loadCommunityUniverseData();
    const impactLoad = impactApi.summary().catch(() => null);
    const memeticLoad = Promise.allSettled([
      floraFaunaApi.getFeed(),
      floraFaunaApi.listChannels(6),
      floraFaunaApi.listPools(4),
    ]);

    const resolveSupplementalPackets = async () => {
      const [impactData, memeticResults] = await Promise.all([impactLoad, memeticLoad]);
      const [feedResult, channelsResult, poolsResult] = memeticResults;

      const feed = feedResult.status === 'fulfilled' ? feedResult.value.feed : [];
      const channels = channelsResult.status === 'fulfilled' ? channelsResult.value.channels : [];
      const pools = poolsResult.status === 'fulfilled' ? poolsResult.value.pools : [];
      const memeticAnyLive = feed.length > 0;
      const memeticAnyInput =
        feedResult.status === 'fulfilled' || channelsResult.status === 'fulfilled' || poolsResult.status === 'fulfilled';

      const nextImpactPacket = buildImpactCelestialPacket(impactData, {
        mode: impactData ? 'live' : 'read_only',
        sourceSummary: impactData
          ? 'Live impact outcomes / shared celestial packet'
          : 'Fallback impact outcomes / shared celestial packet',
      });
      const nextMemeticPacket = buildMemeticCelestialPacket(
        {
          feed,
          channels,
          pools,
        },
        {
          mode: memeticAnyLive ? 'live' : memeticAnyInput ? 'read_only' : 'demo',
          sourceSummary: memeticAnyLive
            ? `${feed.length} live memetic artifacts / shared celestial packet`
            : 'Fallback memetic artifacts / shared celestial packet',
        },
      );

      const fallbackReasons: string[] = [];
      if (nextImpactPacket.fallbackState?.active) {
        fallbackReasons.push(nextImpactPacket.fallbackState.message);
      }
      if (nextMemeticPacket.fallbackState?.active) {
        fallbackReasons.push(nextMemeticPacket.fallbackState.message);
      }

      return {
        impactPacket: nextImpactPacket,
        memeticPacket: nextMemeticPacket,
        fallbackReasons,
        fallbackActive: fallbackReasons.length > 0,
      };
    };

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

      const supplemental = await resolveSupplementalPackets();
      setCommunityPacket(nextCommunityPacket);
      setImpactPacket(supplemental.impactPacket);
      setMemeticPacket(supplemental.memeticPacket);

      const nextFallbackMessage =
        fallbackReasons[0] ??
        communityData.loadError ??
        supplemental.fallbackReasons[0] ??
        (hardFailures.length > 0 ? 'Some universe slices could not be loaded and were omitted.' : null);
      const nextFallbackActive =
        fallbackReasons.length > 0 ||
        hardFailures.length > 0 ||
        Boolean(nextCommunityPacket.fallbackState?.active) ||
        supplemental.fallbackActive;

      if (nextFallbackActive) {
        setFallbackActive(true);
        setFallbackMessage(nextFallbackMessage);
      }
    } catch (reason) {
      const fallbackMaps = listFallbackEducationMapResources({ status: 'published' });
      const hasFallbackMaps = fallbackMaps.length > 0;
      const communityData = await communityLoad.catch(() => null);
      const supplemental = await resolveSupplementalPackets();
      setImpactPacket(supplemental.impactPacket);
      setMemeticPacket(supplemental.memeticPacket);

      if (isEducationMapsBlockingAuthError(reason, { authenticated: isAuthenticated })) {
        setError(getEducationMapsBlockingMessage(reason));
        if (supplemental.fallbackActive) {
          setFallbackActive(true);
          setFallbackMessage(supplemental.fallbackReasons[0] ?? null);
        }
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
            : communityData?.loadError ??
                supplemental.fallbackReasons[0] ??
                'Live universe services are unavailable. Using bundled read-only universe packets.',
        );
      } else {
        const actionableError = toActionableSurfaceError({
          area: 'Universe view',
          rawMessage: reason instanceof Error ? reason.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Open education fallback',
        });
        setError(`${actionableError.headline}. ${actionableError.detail}`);
        if (supplemental.fallbackActive) {
          setFallbackActive(true);
          setFallbackMessage(supplemental.fallbackReasons[0] ?? null);
        }
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

    const supplementalKeys = [communityPacket?.domain.key, impactPacket?.domain.key, memeticPacket?.domain.key].filter(
      (value): value is string => Boolean(value),
    );

    if (
      !supplementalKeys.includes(selectedTopicKey) &&
      !maps.some((resource) => resource.definition.topicKey === selectedTopicKey)
    ) {
      setSelectedTopicKey('all');
    }
  }, [communityPacket?.domain.key, impactPacket?.domain.key, maps, memeticPacket?.domain.key, selectedTopicKey]);

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
      if (impactPacket) {
        packets.push([impactPacket.domain.key, impactPacket] as const);
      }
      if (memeticPacket) {
        packets.push([memeticPacket.domain.key, memeticPacket] as const);
      }

      return new Map(packets);
    },
    [communityPacket, impactPacket, maps, memeticPacket, selectedTopicKey],
  );

  const displayMap = useMemo(() => {
    const packetTopicKeys = [communityPacket?.domain.key, impactPacket?.domain.key, memeticPacket?.domain.key].filter(
      (value): value is string => Boolean(value),
    );
    if (selectedTopicKey === 'all' || packetTopicKeys.includes(selectedTopicKey)) {
      return null;
    }

    return maps.find((resource) => resource.definition.topicKey === selectedTopicKey) ?? null;
  }, [communityPacket?.domain.key, impactPacket?.domain.key, maps, memeticPacket?.domain.key, selectedTopicKey]);
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

      const supplementalTopics = [communityPacket, impactPacket, memeticPacket]
        .filter((packet): packet is UniversePacket => Boolean(packet))
        .map((packet) => ({
          id: packet.id,
          title: packet.title,
          topicKey: packet.domain.key,
        }));

      return [
        ...educationTopics,
        ...supplementalTopics,
      ];
    },
    [communityPacket, impactPacket, maps, memeticPacket],
  );
  const communityTopicKey = communityPacket?.domain.key ?? null;
  const impactTopicKey = impactPacket?.domain.key ?? null;
  const memeticTopicKey = memeticPacket?.domain.key ?? null;
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
        : selectedTopicKey === impactTopicKey
          ? 'Impact consequence universe'
          : selectedTopicKey === memeticTopicKey
            ? 'Memetic artifact universe'
        : isLeftThoughtScope
          ? 'ANU left-thought universe'
          : 'Manara domain universe';
  const viewerTitlePrefix =
    selectedTopicKey === 'all'
      ? 'Universe'
      : selectedTopicKey === communityTopicKey
        ? 'Community'
        : selectedTopicKey === impactTopicKey
          ? 'Impact'
          : selectedTopicKey === memeticTopicKey
            ? 'Memetics'
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
          <div className="space-y-3 text-xs text-[color:rgba(246,212,203,0.84)]">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <label className="manara-glass-chip rounded-[1rem] border border-[color:rgba(246,212,203,0.15)] bg-[color:rgba(30,2,39,0.3)] px-3 py-2 text-sm text-[color:rgba(246,212,203,0.92)]">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.64)]">Universe scope</span>
                <select
                  value={selectedTopicKey}
                  onChange={(event) => setSelectedTopicKey(event.target.value)}
                  className="w-full bg-transparent text-sm text-[var(--color-foreground)] outline-none"
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
                className="manara-glass-chip inline-flex min-h-10 items-center justify-center gap-2 border border-[color:rgba(246,212,203,0.2)] bg-[color:rgba(246,212,203,0.06)] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.12)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {`Refresh ${universePresentationTerms.universe.toLowerCase()}`}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="manara-glass-chip inline-flex items-center gap-2 border border-[color:rgba(246,212,203,0.15)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-[#7c413c]" />
                {packetsByTopicKey.size} source {universePresentationTerms.domain.toLowerCase()}s loaded
              </span>
              <span className="manara-glass-chip inline-flex items-center gap-2 border border-[color:rgba(246,212,203,0.15)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1">
                {`${universePresentationTerms.universe} scope: ${selectedTopicKey === 'all' ? 'cross-domain' : selectedTopicKey}`}
              </span>
              {isLeftThoughtScope && leftThoughtSourceCoverage ? (
                <span className="manara-glass-chip inline-flex items-center gap-2 border border-[color:rgba(124,65,60,0.35)] bg-[color:rgba(124,65,60,0.1)] px-3 py-1 text-[#7c413c]">
                  Left Thought Phase A+ fallback · {leftThoughtSourceCoverage.totalStars} stars · {leftThoughtSourceCoverage.relations} relations · SEP linked {leftThoughtSourceCoverage.sepLinkedStars}/{leftThoughtSourceCoverage.totalStars}
                </span>
              ) : null}
            </div>

            {fallbackActive ? (
              <p className="rounded-lg border border-[color:rgba(224,177,21,0.35)] bg-[color:rgba(224,177,21,0.12)] px-3 py-2 text-[11px] leading-5 text-[#e0b115]">
                {fallbackMessage ??
                  'Live universe APIs are partially unavailable. This view is using bundled read-only universe packets where needed.'}
              </p>
            ) : null}
          </div>
        }
        footerActions={
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:rgba(246,212,203,0.76)]">
            <span className="rounded-xl border border-[#1e0227] px-3 py-1">{`${universePresentationTerms.universe} renderer: QuantumCanvas`}</span>
            <span className="rounded-xl border border-[#1e0227] px-3 py-1">{`${universePresentationTerms.explainer}: floating inspector`}</span>
            <span className="rounded-xl border border-[#1e0227] px-3 py-1">{`Source-linked ${universePresentationTerms.stars.toLowerCase()}: enabled`}</span>
          </div>
        }
      />
    </div>
  );
}
