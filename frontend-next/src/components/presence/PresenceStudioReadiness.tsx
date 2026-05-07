import { AlertCircle, CheckCircle2, Circle, type LucideIcon } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import type { PresenceCollection, PresenceNode, PresenceWork } from '@/lib/api/presence';
import { hasRenderableRichText } from './presenceStudioOwnerUtils';

export interface PresenceReadinessItem {
  id: string;
  label: string;
  description: string;
  ready: boolean;
  actionHref?: string;
  actionLabel?: string;
  manual?: boolean;
}

export interface PresenceReadinessSummary {
  items: PresenceReadinessItem[];
  readyCount: number;
  totalCount: number;
  score: number;
  label: string;
  missing: PresenceReadinessItem[];
}

interface BuildReadinessInput {
  node: PresenceNode;
  works?: PresenceWork[];
  collections?: PresenceCollection[];
  publicHref?: string;
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function hasPlaceholderText(value: string | null | undefined) {
  const plain = (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!plain) return false;
  return ['lorem', 'placeholder', 'todo', 'coming soon', 'test copy', 'sample text'].some((needle) => plain.includes(needle));
}

function visibleWorks(works: PresenceWork[] = []) {
  return works.filter((work) => work.is_visible !== false);
}

function visibleCollections(collections: PresenceCollection[] = []) {
  return collections.filter((collection) => collection.is_visible !== false);
}

export function buildPresenceStudioReadiness({
  node,
  works = node.works || [],
  collections = node.collections || [],
  publicHref,
}: BuildReadinessInput): PresenceReadinessSummary {
  const publicUrl = publicHref || node.public_url || (node.slug ? `/p/${node.slug}` : '');
  const workRows = visibleWorks(works);
  const collectionRows = visibleCollections(collections);
  const statementReady = hasRenderableRichText(node.bio) || hasRenderableRichText(node.practice_statement) || hasRenderableRichText(node.curatorial_statement);
  const hasMedia = hasText(node.cover_image_url) || hasText(node.profile_image_url) || hasText(node.landing_background_url);
  const placeholderDetected = [
    node.display_name,
    node.headline,
    node.bio,
    node.practice_statement,
    node.curatorial_statement,
    ...workRows.map((work) => `${work.title || ''} ${work.description || ''}`),
    ...collectionRows.map((collection) => `${collection.title || ''} ${collection.description || ''}`),
  ].some(hasPlaceholderText);

  const items: PresenceReadinessItem[] = [
    {
      id: 'identity',
      label: 'Identity is clear',
      description: 'Display name and headline establish the public world quickly.',
      ready: hasText(node.display_name) && hasText(node.headline),
      actionHref: '/app/presence',
      actionLabel: 'Shape identity',
    },
    {
      id: 'statement',
      label: 'Statement or bio is present',
      description: 'The viewer can understand the practice, method, or public purpose.',
      ready: statementReady,
      actionHref: '/app/presence',
      actionLabel: 'Edit statements',
    },
    {
      id: 'media',
      label: 'Hero or profile media exists',
      description: 'At least one public image gives the Presence visual gravity.',
      ready: hasMedia,
      actionHref: '/app/presence',
      actionLabel: 'Add media URL',
    },
    {
      id: 'works',
      label: 'Selected works are strong enough',
      description: 'Three visible works or proof items is the minimum pilot target.',
      ready: workRows.length >= 3,
      actionHref: '/app/works',
      actionLabel: 'Prepare works',
    },
    {
      id: 'collections',
      label: 'A body of work is named',
      description: 'At least one visible collection gives the public page a curated room, series, or dossier.',
      ready: collectionRows.length >= 1,
      actionHref: '/app/collections',
      actionLabel: 'Shape collections',
    },
    {
      id: 'enquiry',
      label: 'Enquiry path is available',
      description: 'Visitors can begin a conversation from the public Presence.',
      ready: Boolean(node.slug),
      actionHref: '/app/enquiries',
      actionLabel: 'Review enquiries',
    },
    {
      id: 'qr',
      label: 'Physical-world bridge is ready',
      description: 'The canonical public route can generate QR and NFC source links.',
      ready: Boolean(node.slug && publicUrl),
      actionHref: '/app/qr-nfc',
      actionLabel: 'Open QR / NFC',
    },
    {
      id: 'preview',
      label: 'Public preview is available',
      description: 'The owner can review the published output before sharing widely.',
      ready: Boolean(publicUrl),
      actionHref: publicUrl || undefined,
      actionLabel: 'Preview public page',
    },
    {
      id: 'publish',
      label: 'Publication state is known',
      description: 'The Studio can tell whether the public page is live or still private.',
      ready: hasText(node.status),
      actionHref: '/app/settings',
      actionLabel: 'Review launch state',
    },
    {
      id: 'placeholder',
      label: 'No obvious placeholder language',
      description: 'Pilot pages should not launch with lorem ipsum, TODO text, or sample copy.',
      ready: !placeholderDetected,
      actionHref: '/app/presence',
      actionLabel: 'Review copy',
      manual: true,
    },
  ];

  const readyCount = items.filter((item) => item.ready).length;
  const totalCount = items.length;
  const score = Math.round((readyCount / totalCount) * 100);
  const label =
    score >= 90
      ? 'Pilot-ready with final human review'
      : score >= 70
        ? 'Close, but needs studio work'
        : 'Needs preparation before launch';

  return {
    items,
    readyCount,
    totalCount,
    score,
    label,
    missing: items.filter((item) => !item.ready),
  };
}

function ReadinessIcon({ item }: { item: PresenceReadinessItem }) {
  const Icon: LucideIcon = item.ready ? CheckCircle2 : item.manual ? AlertCircle : Circle;
  return <Icon className={item.ready ? 'h-4 w-4 text-emerald-200' : item.manual ? 'h-4 w-4 text-amber-200' : 'h-4 w-4 text-[#f6d4cb]/48'} />;
}

export function PresenceStudioReadinessCard({
  summary,
  compact = false,
}: {
  summary: PresenceReadinessSummary;
  compact?: boolean;
}) {
  return (
    <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#f6d4cb]/62">Launch readiness</p>
          <h2 className="mt-3 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {summary.score}% ready
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#f6d4cb]/76">{summary.label}</p>
        </div>
        <AnuChip tone={summary.score >= 90 ? 'accent' : 'muted'}>
          {summary.readyCount}/{summary.totalCount} checks
        </AnuChip>
      </div>

      <div className={compact ? 'mt-4 grid gap-2' : 'mt-5 grid gap-3 md:grid-cols-2'}>
        {summary.items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-start gap-3">
              <ReadinessIcon item={item} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#fff7f2]">{item.label}</p>
                {!compact ? <p className="mt-1 text-xs leading-5 text-[#f6d4cb]/62">{item.description}</p> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AnuSurfacePanel>
  );
}
