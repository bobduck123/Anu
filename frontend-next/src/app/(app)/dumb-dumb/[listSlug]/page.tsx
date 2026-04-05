'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DumbDumbListScreen } from '@/components/dumb-dumb/DumbDumbListScreen';
import { dumbDumbApi, type DumbDumbList } from '@/lib/api/dumbDumbApi';
import { demoLists } from '@/lib/dumbDumb';

export default function DumbDumbListPage() {
  const params = useParams<{ listSlug: string }>();
  const listSlug = params.listSlug;
  const [list, setList] = useState<DumbDumbList | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dumbDumbApi
      .getList(listSlug)
      .then((payload) => {
        if (!cancelled) setList(payload);
      })
      .catch(() => {
        const fallback = demoLists.find((row) => row.slug === listSlug) || null;
        if (!cancelled) {
          if (fallback) setList(fallback);
          else setMissing(true);
        }
      });
    dumbDumbApi.track({
      event_name: 'dumb_dumb_list_view',
      entity_id: listSlug,
      entity_type: 'dumb_dumb_list',
      props: { list_slug: listSlug },
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [listSlug]);

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-foreground)] px-6 py-8 text-center">
          <h1 className="text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            List not found
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-earth-medium)]">
            This Dumb Dumb list is not public, inactive, or does not exist.
          </p>
          <Link
            href="/dumb-dumb"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-institutional)] px-5 py-2.5 text-sm font-medium text-[var(--color-foreground)]"
          >
            Back to hub
          </Link>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  return <DumbDumbListScreen list={list} />;
}
