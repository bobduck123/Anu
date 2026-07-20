import { StudioPassesClient } from "@/components/presence/graph/StudioPassesClient";

export default function StudioPassesPage({ params }: { params: Promise<{ id: string }> }) {
  return <StudioPassesClient params={params} />;
}

