import type { Metadata } from "next";
import PresenceDraftPreviewPage from "@/components/studio/editor/PresenceDraftPreviewPage";

export const metadata: Metadata = {
  title: "Draft preview",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioPresenceDraftPreviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PresenceDraftPreviewPage roomId={Number(id)} />;
}
