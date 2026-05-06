import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicNode } from "@/lib/api/public";
import PortfolioRenderer from "@/components/portfolio/PortfolioRenderer";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const node = await fetchPublicNode(slug);
    return {
      title: node.seo?.title ?? node.display_name,
      description: node.seo?.description ?? node.headline ?? undefined,
      openGraph: {
        title: node.seo?.title ?? node.display_name,
        description: node.seo?.description ?? node.headline ?? undefined,
        images: node.seo?.image ? [node.seo.image] : undefined,
        url: node.seo?.canonical_url,
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
