import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicPresenceNode } from '@/lib/api/presence';
import { PresenceNodeRenderer } from '@/components/presence/PresenceNodeRenderer';

type PublicPresenceParams = { username: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000')
    .replace(/^([^h])/, 'https://$1')
    .replace(/\/+$/, '');
}

function publicUrl(slug: string) {
  return `${siteUrl()}/p/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Promise<PublicPresenceParams> | PublicPresenceParams }): Promise<Metadata> {
  const resolved = await params;
  const node = await fetchPublicPresenceNode(resolved.username, { server: true });
  if (!node) {
    return {
      title: 'Presence Node not found',
      robots: { index: false, follow: false },
    };
  }

  const title = `${node.display_name} ${node.headline || ''}`.trim();
  const description = (node.bio || node.headline || `${node.display_name} Presence Node`).replace(/<[^>]*>/g, '').slice(0, 180);
  const canonical = publicUrl(node.slug);
  const image = node.cover_image_url || node.profile_image_url || undefined;

  return {
    title,
    description,
    robots: node.visibility === 'unlisted' ? { index: false, follow: false } : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [{ url: image }] : undefined,
      type: 'profile',
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicPresencePage({ params }: { params: Promise<PublicPresenceParams> | PublicPresenceParams }) {
  const resolved = await params;
  const node = await fetchPublicPresenceNode(resolved.username, { server: true });
  if (!node) {
    notFound();
  }

  const canonical = publicUrl(node.slug);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': node.node_type === 'organisation' ? 'Organization' : 'Person',
    name: node.display_name,
    description: (node.bio || node.headline || '').replace(/<[^>]*>/g, ''),
    url: canonical,
    image: node.profile_image_url || node.cover_image_url || undefined,
    jobTitle: node.headline || undefined,
    address: node.location_label || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <PresenceNodeRenderer node={node} publicUrl={canonical} />
    </>
  );
}
