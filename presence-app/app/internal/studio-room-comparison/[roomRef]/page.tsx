import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioRoomRealRoomComparison } from "@/components/presence-studio/StudioRoomRealRoomComparison";
import { isStudioRoomInternalPreviewEnabled } from "@/lib/presence/studio-room/previewGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Room comparison",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioRoomRealRoomComparisonPage({
  params,
}: {
  params: Promise<{ roomRef: string }>;
}) {
  if (!isStudioRoomInternalPreviewEnabled()) notFound();
  const { roomRef } = await params;
  return <StudioRoomRealRoomComparison roomRef={roomRef} />;
}
