'use client';

import Link from 'next/link';
import { ArrowRight, Compass, Mail, ShieldCheck } from 'lucide-react';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';

export default function AboutPage() {
  const tenant = useTenant();
  const site = tenant.siteManifest;

  return (
    <main className="min-h-screen bg-background px-4 pb-20 pt-24 text-foreground md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-3xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Public white-label site
          </p>
          <h1 className="text-4xl font-semibold tracking-normal md:text-5xl">{site.siteName}</h1>
          <p className="text-base leading-7 text-muted-foreground md:text-lg">{site.tagline}</p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Community',
              body: 'Public pages stay focused on participation, programs, and shared cultural context.',
              icon: Compass,
            },
            {
              title: 'Trust',
              body: 'Published records and transparency routes keep site state inspectable without exposing private data.',
              icon: ShieldCheck,
            },
            {
              title: 'Contact',
              body: site.contact.email || 'Use the public contact route for site questions and operational follow-up.',
              icon: Mail,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-lg border border-border bg-card p-5 shadow-sm"
              >
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Public routes</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {site.navItems.map((item) => (
              <Link
                key={`${item.href}:${item.label}`}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

