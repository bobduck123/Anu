import type { PresenceNode } from '@/lib/api/presence';

interface PresenceOwnerErrorPresentation {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === 'string' ? maybeCode : null;
}

export function getPresenceStudioPublicHref(node: Pick<PresenceNode, 'slug' | 'public_url'>) {
  const explicit = typeof node.public_url === 'string' ? node.public_url.trim() : '';
  if (explicit) {
    return explicit;
  }
  return `/p/${encodeURIComponent(node.slug)}`;
}

export function describeOwnerPresenceError(error: unknown): PresenceOwnerErrorPresentation {
  switch (errorCode(error)) {
    case 'unauthorized':
      return {
        title: 'Sign in required',
        description: 'Sign in to load the Presence Studio owner console for your node.',
        actionHref: '/auth',
        actionLabel: 'Sign in',
      };
    case 'forbidden':
      return {
        title: 'Owner access unavailable',
        description: 'This account can sign in, but it does not currently have access to a Presence owner node.',
      };
    case 'not_found':
      return {
        title: 'Owner node not found',
        description: 'The requested Presence node is no longer available from this owner console.',
      };
    default:
      return {
        title: 'Presence data unavailable',
        description: error instanceof Error ? error.message : 'The owner console could not load Presence data right now.',
      };
  }
}

export function hasRenderableRichText(value: string | null | undefined) {
  if (!value) {
    return false;
  }
  const plain = value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  return plain.length > 0;
}
