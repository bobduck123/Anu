import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioRoomTemplateKitIndex } from "@/components/presence-studio/StudioRoomTemplateKitPreview";
import { isStudioRoomInternalPreviewEnabled } from "@/lib/presence/studio-room/previewGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Room TemplateKits",
  robots: { index: false, follow: false },
};

export default function StudioRoomTemplateKitIndexPage() {
  if (!isStudioRoomInternalPreviewEnabled()) notFound();
  return <StudioRoomTemplateKitIndex />;
}
