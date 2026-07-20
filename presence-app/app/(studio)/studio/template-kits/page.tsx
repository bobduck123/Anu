import type { Metadata } from "next";
import { TemplateKitStarter } from "@/components/studio/template-kits/TemplateKitStarter";
import { isStudioRoomInternalPreviewEnabled } from "@/lib/presence/studio-room/previewGate";
import { listOwnerCreatableTemplateKits } from "@/lib/presence/studio-room/templateDrafts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start from a TemplateKit",
  robots: { index: false, follow: false },
};

export default function StudioTemplateKitsPage() {
  return (
    <TemplateKitStarter
      kits={listOwnerCreatableTemplateKits()}
      internalPreviewEnabled={isStudioRoomInternalPreviewEnabled()}
    />
  );
}
