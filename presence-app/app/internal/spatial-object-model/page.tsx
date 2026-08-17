import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpatialObjectArranger } from "@/components/presence-spatial/SpatialObjectArranger";
import { isSpatialInternalProofEnabled } from "@/lib/presence/spatial/internalGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Internal Spatial Object Arranger",
  robots: { index: false, follow: false },
};

export default function InternalSpatialObjectModelPage() {
  if (!isSpatialInternalProofEnabled()) notFound();
  return <SpatialObjectArranger />;
}
