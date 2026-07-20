import { MoodBoardsClient } from "@/components/presence/graph/MoodBoardsClient";

export const metadata = {
  title: "Mood Boards | Presence",
  description: "Mood Boards are maps of taste for Rooms, references, and future Paths.",
};

export default function MoodBoardsPage() {
  return <MoodBoardsClient />;
}

