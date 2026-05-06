import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { fetchPublicPresenceWork } from '@/lib/api/presence';
import { PresenceWorkDetail } from '@/components/presence/PresenceNodeRenderer';

type WorkDetailParams = { username: string; workId: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000')
    .replace(/^([^h])/, 'https://$1')
    .replace(/\/+$/, '');
}

function stripHtml(value?: string | null) {
  return (value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({ params }: { params: Promise<WorkDetailParams> | WorkDetailParams }): Promise<Metadata> {
  const resolved = await params;
  const detail = await fetchPublicPresenceWork(resolved.username, resolved.workId, { server: true });
  if (!detail) {
    return {
      title: 'Work not found',
      robots: { index: false, follow: false },
    };
  }

  const title = `${detail.work.title} - ${detail.node.display_name}`;
  const description = stripHtml(detail.work.description || detail.node.headline).slice(0, 180);
  const canonical = `${siteUrl()}/p/${encodeURIComponent(detail.node.slug)}/works/${encodeURIComponent(String(detail.work.id || resolved.workId))}`;
  const image = detail.work.image_url || detail.work.thumbnail_url || detail.node.cover_image_url || detail.node.profile_image_url || undefined;

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

export default async function PublicPresenceWorkDetailPage({ params }: { params: Promise<WorkDetailParams> | WorkDetailParams }) {
  const resolved = await params;
  const detail = await fetchPublicPresenceWork(resolved.username, resolved.workId, { server: true });
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
          <PresenceWorkDetail node={detail.node} work={detail.work} />
        </div>
      </div>
    </main>
  );
}
