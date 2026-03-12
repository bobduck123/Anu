'use client';

import { useEffect, useMemo } from 'react';
import * as Sentry from '@sentry/react';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0');

let initialized = false;

export function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!dsn || initialized) return;

    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    });

    initialized = true;
  }, []);

  const content = useMemo(() => {
    if (!dsn) return <>{children}</>;
    return (
      <Sentry.ErrorBoundary fallback={<div>Something went wrong.</div>}>
        {children}
      </Sentry.ErrorBoundary>
    );
  }, [children]);

  return content;
}
