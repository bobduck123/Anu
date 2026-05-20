import { PathClient } from "@/components/presence/graph/PathClient";

export const metadata = {
  title: "Path From Room | Presence",
};

export default async function PathFromRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <PathClient mode={{ type: "room", id: Number(roomId) }} />;
}

