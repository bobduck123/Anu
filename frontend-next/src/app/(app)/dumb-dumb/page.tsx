'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { dumbDumbApi, type DumbDumbHubPayload } from '@/lib/api/dumbDumbApi';
import { demoHubPayload } from '@/lib/dumbDumb';
import { DumbDumbHubScreen } from '@/components/dumb-dumb/DumbDumbHubScreen';

export default function DumbDumbHubPage() {
  const [data, setData] = useState<DumbDumbHubPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    dumbDumbApi
      .hub(true)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(demoHubPayload);
      });
    dumbDumbApi.track({
      event_name: 'dumb_dumb_frontpage_view',
      entity_id: 'hub',
      entity_type: 'dumb_dumb',
      props: { surface: 'hub' },
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  return <DumbDumbHubScreen data={data} />;
}
