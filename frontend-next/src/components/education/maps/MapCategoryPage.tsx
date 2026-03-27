'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { educationMapsApi } from '@/lib/api/educationMaps';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { ErrorState } from '@/ui-system/states/ErrorState';

interface MapCategoryPageProps {
  topicKey: string;
  categoryKey: string;
}

export function MapCategoryPage({ topicKey, categoryKey }: MapCategoryPageProps) {
  const categoryQuery = useQuery({
    queryKey: ['education-map-category', topicKey, categoryKey],
    queryFn: () => educationMapsApi.getCategoryView(topicKey, categoryKey),
  });

  if (categoryQuery.isLoading) {
    return <LoadingState message="Loading category view..." />;
  }

  if (categoryQuery.error || !categoryQuery.data) {
    return (
      <ErrorState
        title="Category view unavailable"
        message={categoryQuery.error instanceof Error ? categoryQuery.error.message : 'Unable to load category view'}
      />
    );
  }

  return (
    <section className="edu-card overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--edu-accent)]">Category view</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{categoryQuery.data.category.label}</h1>
        {categoryQuery.data.category.description && (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{categoryQuery.data.category.description}</p>
        )}
      </div>
      <div className="grid gap-4 p-6 md:grid-cols-2">
        {categoryQuery.data.nodes.map((node) => (
          <article key={node.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{node.entityType}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{node.label}</h2>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                {Math.round(node.metrics.importance * 100)}
              </span>
            </div>
            {node.summary && <p className="mt-3 text-sm leading-6 text-slate-600">{node.summary}</p>}
            <div className="mt-4 flex items-center justify-between">
              <Link
                href={`/education/resource-library/maps/${topicKey}`}
                className="text-sm font-semibold text-[var(--edu-accent)] hover:text-[var(--edu-forest)]"
              >
                Open full constellation
              </Link>
              <span className="text-sm text-slate-500">Evidence {Math.round(node.metrics.evidence * 100)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
