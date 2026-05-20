import { RoomKeyEntry } from "@/components/presence/graph/RoomKeyEntry";

export const metadata = {
  title: "Enter Room | Presence",
  description: "Open a Presence Room from an NFC, QR, badge, sticker, poster, or direct share.",
};

export default async function RoomKeyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RoomKeyEntry token={token} />;
}

