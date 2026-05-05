'use client';

import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';

export default function NotFound() {
  const tenant = useTenant();
  const site = tenant.siteManifest;

  return (
    <main className="min-h-screen bg-background px-4 pb-20 pt-28 text-foreground md:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <SearchX className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{site.siteName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Page not found</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This public route is not published for this site. Use the site navigation or contact route to continue.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
              <Link
                href={site.contact.publicContactUrl}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

