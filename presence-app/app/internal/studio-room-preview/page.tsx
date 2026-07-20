import { notFound } from "next/navigation";
import { StudioRoomPreviewComparison } from "@/components/presence-studio/StudioRoomPreviewComparison";
import { isStudioRoomInternalPreviewEnabled } from "@/lib/presence/studio-room/previewGate";
import { buildStudioRoomPreviewSnapshot } from "@/lib/presence/studio-room/previewSnapshot";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Internal Studio Room Preview",
  robots: { index: false, follow: false },
};

export default function InternalStudioRoomPreviewPage() {
  if (!isStudioRoomInternalPreviewEnabled()) notFound();
  return <StudioRoomPreviewComparison snapshot={buildStudioRoomPreviewSnapshot()} />;
}
