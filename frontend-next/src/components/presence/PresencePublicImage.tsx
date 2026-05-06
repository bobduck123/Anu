'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';

interface PresencePublicImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  loading?: 'eager' | 'lazy';
}

export function PresencePublicImage({
  src,
  alt = '',
  className = '',
  fallbackClassName,
  fallbackLabel = 'Image pending',
  loading = 'lazy',
}: PresencePublicImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={fallbackClassName || className}>
        <span className="px-4 text-center text-xs uppercase tracking-[0.16em] opacity-60">{fallbackLabel}</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}
