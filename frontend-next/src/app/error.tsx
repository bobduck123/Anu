'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tenant = useTenant();

  useEffect(() => {
    console.error('Public route error boundary', {
      site: tenant.siteManifest.siteKey,
      digest: error.digest,
    });
  }, [error.digest, tenant.siteManifest.siteKey]);

  return (
    <main className="min-h-screen bg-background px-4 pb-20 pt-28 text-foreground md:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{tenant.siteManifest.siteName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">This route is temporarily unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The site shell is still available. Retry the route, or use the contact page if the problem continues.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

