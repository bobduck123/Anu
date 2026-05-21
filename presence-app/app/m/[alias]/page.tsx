import type { Metadata } from "next";
import { MaskClient } from "@/components/presence/garden/MaskClient";

export async function generateMetadata({ params }: { params: Promise<{ alias: string }> }): Promise<Metadata> {
  const { alias } = await params;
  return {
    title: `@${alias} | Presence Mask`,
    description: `An Observer Mask in the Presence Gardens.`,
  };
}

export default async function MaskPage({ params }: { params: Promise<{ alias: string }> }) {
  const { alias } = await params;
  return <MaskClient alias={alias} />;
}
