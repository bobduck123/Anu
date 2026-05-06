'use client';

import { useEffect } from 'react';
import { capturePresenceSourceHit, getAnonymousPresenceSessionId } from '@/lib/api/presence';

export function PresenceSourceTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceCode = params.get('nfc') || params.get('source');
    if (!sourceCode) return;
    const key = `presence_source_hit:${slug}:${sourceCode}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    void capturePresenceSourceHit(slug, {
      source_code: sourceCode,
      source_url: `${window.location.pathname}${window.location.search}`,
      anonymous_session_id: getAnonymousPresenceSessionId(),
    });
  }, [slug]);
  return null;
}
