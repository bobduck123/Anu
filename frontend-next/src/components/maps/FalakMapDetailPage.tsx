'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  getEducationMap,
  getEducationMapsFallbackMessage,
  MapResource,
  shouldUseEducationMapsFallback,
} from '@/lib/api/educationMaps';
import { getFallbackEducationMap } from '@/lib/maps/fallbackMapData';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { useAuth } from '@/contexts/AuthContext';
import { FalakMapViewer } from './FalakMapViewer';

interface FalakMapDetailPageProps {
  topicKey: string;
}

export function FalakMapDetailPage({ topicKey }: FalakMapDetailPageProps) {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [map, setMap] = useState<MapResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  const loadMap = useCallback(() => {
    setLoading(true);
    setError(null);
    setFallbackActive(false);
    setFallbackMessage(null);
    getEducationMap(topicKey)
      .then((response) => {
        setMap(response);
      })
      .catch((err) => {
        if (shouldUseEducationMapsFallback(err)) {
          const fallbackMap = getFallbackEducationMap(topicKey);
          if (fallbackMap) {
            console.warn('Education map detail unavailable from API, using bundled read-only fallback.');
            setMap(fallbackMap);
            setFallbackActive(true);
            setFallbackMessage(getEducationMapsFallbackMessage(err));
            return;
          }
        }

        const actionableError = toActionableSurfaceError({
          area: 'Education universe',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education/maps',
          fallbackLabel: 'Back to library',
        });
        setError(actionableError.detail);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [topicKey]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadMap();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, loadMap]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/education/maps"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
        {!fallbackActive ? (
          <Link
            href={`/admin/maps?topic=${encodeURIComponent(topicKey)}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
          >
            Open admin tools
          </Link>
        ) : null}
      </div>

      {fallbackActive ? (
        <div className="mb-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          {fallbackMessage ?? 'The hosted frontend is using bundled read-only universe packet data because the live universe request did not succeed.'}
        </div>
      ) : null}

      <FalakMapViewer
        map={map}
        loading={loading}
        error={error}
        onRetry={loadMap}
        eyebrowLabel={fallbackActive ? 'Read-only learning universe' : undefined}
        showAdminLink={!fallbackActive}
      />
    </div>
  );
}
