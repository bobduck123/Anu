import { MoodBoardDetailClient } from "@/components/presence/graph/MoodBoardDetailClient";

export const metadata = {
  title: "Mood Board | Presence",
};

export default async function MoodBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MoodBoardDetailClient boardId={Number(id)} />;
}

