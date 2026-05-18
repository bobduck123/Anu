import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicNode } from "@/lib/api/public";
import PortfolioRenderer from "@/components/portfolio/PortfolioRenderer";
import { canonicalPublicUrl } from "@/lib/presence/url";
import type { PresenceNode } from "@/lib/api/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const node = await fetchPublicNode(slug);
    const canonicalUrl = canonicalPublicUrl(node.slug);
    return {
      title: node.seo?.title ?? node.display_name,
      description: node.seo?.description ?? node.headline ?? undefined,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: node.seo?.title ?? node.display_name,
        description: node.seo?.description ?? node.headline ?? undefined,
        images: node.seo?.image ? [node.seo.image] : undefined,
        url: canonicalUrl,
        type: "profile",
      },
    };
  } catch {
    return { title: "Profile" };
  }
}

export default async function PortfolioPage({ params }: Props) {
  const { slug } = await params;
  let node;
  try {
    node = await fetchPublicNode(slug);
  } catch {
    notFound();
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(presenceStructuredData(node)) }}
      />
      <PortfolioRenderer node={node} />
    </>
  );
}

function presenceStructuredData(node: PresenceNode) {
  const url = canonicalPublicUrl(node.slug);
  const isOrg =
    node.room_type === "organisation" ||
    node.node_type === "organisation" ||
    node.node_type === "venue";
  return {
    "@context": "https://schema.org",
    "@type": isOrg ? "Organization" : "Person",
    name: node.display_name,
    url,
    description: node.seo?.description ?? node.short_bio ?? node.bio ?? node.headline ?? undefined,
    image: node.seo?.image ?? node.social_preview_image_url ?? node.hero_image_url ?? node.cover_image_url ?? node.profile_image_url ?? undefined,
    address: node.location_label ? { "@type": "PostalAddress", addressLocality: node.location_label } : undefined,
    sameAs: (node.links ?? []).filter((link) => link.is_visible !== false).map((link) => link.url),
  };
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
