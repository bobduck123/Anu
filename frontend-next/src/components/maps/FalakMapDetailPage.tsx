'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getEducationMap, MapResource } from '@/lib/api/educationMaps';
import { FalakMapViewer } from './FalakMapViewer';

interface FalakMapDetailPageProps {
  topicKey: string;
}

export function FalakMapDetailPage({ topicKey }: FalakMapDetailPageProps) {
  const [map, setMap] = useState<MapResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMap = () => {
    setLoading(true);
    setError(null);
    getEducationMap(topicKey)
      .then((response) => {
        setMap(response);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load map.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMap();
  }, [topicKey]);

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
        <Link
          href={`/admin/maps?topic=${encodeURIComponent(topicKey)}`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
        >
          Open admin tools
        </Link>
      </div>

      <FalakMapViewer map={map} loading={loading} error={error} onRetry={loadMap} />
    </div>
  );
}
