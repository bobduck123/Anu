'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { Copy, Download, QrCode, Share2 } from 'lucide-react';
import { capturePresenceEvent, presencePublicApiPath } from '@/lib/api/presence';

interface PresenceActionsProps {
  slug: string;
  displayName: string;
  publicUrl: string;
  tone?: 'dark' | 'light';
}

function actionClass(tone: 'dark' | 'light' = 'dark') {
  return tone === 'light'
    ? 'inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100'
    : 'inline-flex items-center gap-2 rounded-md border border-white/18 bg-white/[0.08] px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.14]';
}

export function PresenceShareButton({ slug, displayName, publicUrl, tone = 'dark' }: PresenceActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    await capturePresenceEvent(slug, 'social_clicked', { action: 'share' });
    if (navigator.share) {
      await navigator.share({ title: displayName, url: publicUrl }).catch(() => null);
      return;
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={actionClass(tone)}
      aria-label="Share Presence Node"
    >
      <Share2 className="h-4 w-4" />
      {copied ? 'Copied' : 'Share'}
    </button>
  );
}

export function PresenceVCardButton({ slug, tone = 'dark' }: Pick<PresenceActionsProps, 'slug' | 'tone'>) {
  const href = useMemo(() => presencePublicApiPath(slug, '/vcard'), [slug]);

  return (
    <a
      href={href}
      onClick={() => void capturePresenceEvent(slug, 'vcard_downloaded', { action: 'vcard_button' })}
      className={actionClass(tone)}
    >
      <Download className="h-4 w-4" />
      vCard
    </a>
  );
}

export function PresenceQRCode({ slug, publicUrl, tone = 'dark' }: Pick<PresenceActionsProps, 'slug' | 'publicUrl' | 'tone'>) {
  const [visible, setVisible] = useState(false);
  const src = useMemo(() => presencePublicApiPath(slug, '/qr'), [slug]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setVisible((current) => !current);
          void capturePresenceEvent(slug, 'qr_viewed', { action: 'toggle_qr' });
        }}
        className={actionClass(tone)}
      >
        <QrCode className="h-4 w-4" />
        QR
      </button>
      {visible ? (
        <div className={tone === 'light' ? 'rounded-lg border border-stone-300 bg-white p-3' : 'rounded-lg border border-white/14 bg-white/[0.08] p-3'}>
          <img src={src} alt={`QR code for ${publicUrl}`} className="h-36 w-36 rounded-md bg-white p-1" />
          <p className={tone === 'light' ? 'mt-2 break-all text-xs leading-5 text-stone-600' : 'mt-2 break-all text-xs leading-5 text-white/66'}>{publicUrl}</p>
        </div>
      ) : null}
    </div>
  );
}

export function PresenceCopyUrlButton({ publicUrl, tone = 'dark' }: Pick<PresenceActionsProps, 'publicUrl' | 'tone'>) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className={actionClass(tone)}
    >
      <Copy className="h-4 w-4" />
      {copied ? 'Copied' : 'Copy URL'}
    </button>
  );
}
