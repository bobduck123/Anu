'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { educationMapsApi } from '@/lib/api/educationMaps';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { ErrorState } from '@/ui-system/states/ErrorState';

interface MapEntityIndexPageProps {
  topicKey: string;
}

export function MapEntityIndexPage({ topicKey }: MapEntityIndexPageProps) {
  const entitiesQuery = useQuery({
    queryKey: ['education-map-entities', topicKey],
    queryFn: () => educationMapsApi.listEntities(topicKey),
  });

  if (entitiesQuery.isLoading) {
    return <LoadingState message="Loading entities..." />;
  }

  if (entitiesQuery.error || !entitiesQuery.data) {
    return (
      <ErrorState
        title="Entity index unavailable"
        message={entitiesQuery.error instanceof Error ? entitiesQuery.error.message : 'Unable to load entities'}
      />
    );
  }

  return (
    <section className="edu-card overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--edu-accent)]">All entities</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Resource library entity index</h1>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">Label</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">Importance</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">Evidence</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-600">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {entitiesQuery.data.map((entity) => (
              <tr key={entity.id}>
                <td className="px-6 py-4 font-medium text-slate-900">
                  <Link href={`/education/resource-library/maps/${topicKey}`} className="hover:text-[var(--edu-accent)]">
                    {entity.label}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-600">{entity.categoryKey ?? 'uncategorized'}</td>
                <td className="px-6 py-4 text-slate-600">{Math.round(entity.importance * 100)}</td>
                <td className="px-6 py-4 text-slate-600">{Math.round(entity.evidence * 100)}</td>
                <td className="px-6 py-4 text-slate-600">{Math.round(entity.confidence * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
