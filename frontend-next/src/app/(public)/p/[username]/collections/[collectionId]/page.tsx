import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { fetchPublicPresenceCollection } from '@/lib/api/presence';
import { PresenceCollectionDetail } from '@/components/presence/PresenceNodeRenderer';

type CollectionDetailParams = { username: string; collectionId: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000')
    .replace(/^([^h])/, 'https://$1')
    .replace(/\/+$/, '');
}

function stripHtml(value?: string | null) {
  return (value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({ params }: { params: Promise<CollectionDetailParams> | CollectionDetailParams }): Promise<Metadata> {
  const resolved = await params;
  const detail = await fetchPublicPresenceCollection(resolved.username, resolved.collectionId, { server: true });
  if (!detail) {
    return {
      title: 'Collection not found',
      robots: { index: false, follow: false },
    };
  }

  const title = `${detail.collection.title} - ${detail.node.display_name}`;
  const description = stripHtml(detail.collection.description || detail.node.headline).slice(0, 180);
  const canonical = `${siteUrl()}/p/${encodeURIComponent(detail.node.slug)}/collections/${encodeURIComponent(String(detail.collection.id || resolved.collectionId))}`;
  const image = detail.collection.cover_image_url || detail.works[0]?.image_url || detail.node.cover_image_url || detail.node.profile_image_url || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [{ url: image }] : undefined,
      type: 'article',
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicPresenceCollectionDetailPage({ params }: { params: Promise<CollectionDetailParams> | CollectionDetailParams }) {
  const resolved = await params;
  const detail = await fetchPublicPresenceCollection(resolved.username, resolved.collectionId, { server: true });
  if (!detail) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f1e8] text-stone-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/p/${encodeURIComponent(detail.node.slug)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" />
          Back to {detail.node.display_name}
        </Link>
        <div className="mt-8">
          <PresenceCollectionDetail node={detail.node} collection={detail.collection} works={detail.works} />
        </div>
      </div>
    </main>
  );
}
