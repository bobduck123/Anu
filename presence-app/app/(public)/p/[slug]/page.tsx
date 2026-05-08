import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicNode } from "@/lib/api/public";
import PortfolioRenderer from "@/components/portfolio/PortfolioRenderer";
import { canonicalPublicUrl } from "@/lib/presence/url";

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
  return <PortfolioRenderer node={node} />;
}
