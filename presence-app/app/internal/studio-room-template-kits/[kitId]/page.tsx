import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioRoomTemplateKitPreview } from "@/components/presence-studio/StudioRoomTemplateKitPreview";
import { getTemplateKitById } from "@/lib/presence/studio-room/templateKits";
import { isStudioRoomInternalPreviewEnabled } from "@/lib/presence/studio-room/previewGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Room TemplateKit Preview",
  robots: { index: false, follow: false },
};

export default async function StudioRoomTemplateKitPreviewPage({
  params,
}: {
  params: Promise<{ kitId: string }>;
}) {
  if (!isStudioRoomInternalPreviewEnabled()) notFound();
  const { kitId } = await params;
  const kit = getTemplateKitById(kitId);
  if (!kit) notFound();
  return <StudioRoomTemplateKitPreview kit={kit} />;
}
