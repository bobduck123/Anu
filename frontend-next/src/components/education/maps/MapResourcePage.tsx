'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, LibraryBig } from 'lucide-react';
import { educationMapsApi } from '@/lib/api/educationMaps';
import { MapResourceWorkspace } from './MapResourceWorkspace';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { ErrorState } from '@/ui-system/states/ErrorState';

interface MapResourcePageProps {
  topicKey: string;
}

export function MapResourcePage({ topicKey }: MapResourcePageProps) {
  const resourceQuery = useQuery({
    queryKey: ['education-map', topicKey],
    queryFn: () => educationMapsApi.getMap(topicKey),
  });

  if (resourceQuery.isLoading) {
    return <LoadingState message="Loading knowledge constellation..." />;
  }

  if (resourceQuery.error || !resourceQuery.data) {
    return (
      <ErrorState
        title="Map unavailable"
        message={resourceQuery.error instanceof Error ? resourceQuery.error.message : 'Unable to load this map resource'}
      />
    );
  }

  const resource = resourceQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/education/resource-library/maps/${resource.definition.topicKey}/all-entities`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--edu-accent)]/30 hover:text-[var(--edu-accent)]"
        >
          <LayoutGrid className="h-4 w-4" />
          All entities
        </Link>
        {resource.categories.slice(0, 4).map((category) => (
          <Link
            key={category.key}
            href={`/education/resource-library/maps/${resource.definition.topicKey}/categories/${category.key}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--edu-accent)]/30 hover:text-[var(--edu-accent)]"
          >
            <LibraryBig className="h-4 w-4" />
            {category.label}
          </Link>
        ))}
      </div>

      <MapResourceWorkspace resource={resource} />
    </div>
  );
}
