'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface PresenceMediaUrlInputProps {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  alt?: string;
  helper?: string;
}

function mediaUrlStatus(value?: string | null): { tone: 'empty' | 'valid' | 'invalid'; label: string } {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { tone: 'empty', label: 'Optional URL' };
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    const isPublicHost =
      hostname &&
      !['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) &&
      !hostname.endsWith('.local') &&
      !hostname.endsWith('.internal');
    if (!['http:', 'https:'].includes(parsed.protocol) || !isPublicHost) {
      return { tone: 'invalid', label: 'Use a public http(s) URL' };
    }
    return { tone: 'valid', label: 'Previewable URL' };
  } catch {
    return { tone: 'invalid', label: 'Invalid URL' };
  }
}

export function PresenceMediaUrlInput({ label, value, onChange, alt, helper }: PresenceMediaUrlInputProps) {
  const [broken, setBroken] = useState(false);
  const status = useMemo(() => mediaUrlStatus(value), [value]);
  const trimmed = (value || '').trim();
  const showPreview = Boolean(trimmed) && status.tone === 'valid' && !broken;

  return (
    <label className="space-y-2 text-sm text-white/78">
      <span>{label}</span>
      <input
        value={value || ''}
        onChange={(event) => {
          setBroken(false);
          onChange(event.target.value);
        }}
        placeholder="https://images.example.com/portfolio/work.jpg"
        className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none"
      />
      <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
          {showPreview ? (
            <img src={trimmed} alt={alt || label} className="h-full w-full object-cover" onError={() => setBroken(true)} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-xs text-white/46">
              <ImageIcon className="h-5 w-5" />
              <span>{broken ? 'Image unavailable' : 'No preview'}</span>
            </div>
          )}
        </div>
        <div>
          <span
            className={`inline-flex rounded-md border px-2.5 py-1 text-xs ${
              status.tone === 'valid'
                ? 'border-emerald-200/30 bg-emerald-500/10 text-emerald-100'
                : status.tone === 'invalid'
                  ? 'border-red-200/30 bg-red-500/10 text-red-100'
                  : 'border-white/12 bg-white/[0.05] text-white/58'
            }`}
          >
            {status.label}
          </span>
          <p className="mt-2 text-xs leading-5 text-white/54">
            {helper || 'Alpha media uses hosted image URLs. Use Supabase Storage, Cloudinary, Imgix, or another public image host; native upload comes later.'}
          </p>
        </div>
      </div>
    </label>
  );
}
