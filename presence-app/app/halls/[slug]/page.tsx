import type { Metadata } from "next";
import { HallDetailClient } from "@/components/presence/halls/HallDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} | Presence Hall`,
    description: "A Presence Hall — a shared digital gathering space.",
  };
}

export default async function HallDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HallDetailClient slug={slug} />;
}
