import { PathClient } from "@/components/presence/graph/PathClient";

export const metadata = {
  title: "Path From Mood Board | Presence",
};

export default async function PathFromMoodBoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return <PathClient mode={{ type: "mood_board", id: Number(boardId) }} />;
}

