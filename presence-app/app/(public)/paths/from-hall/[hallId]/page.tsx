import { PathClient } from "@/components/presence/graph/PathClient";

export const metadata = {
  title: "Path From Hall | Presence",
  description: "A Path that begins from a Presence Hall.",
};

export default async function PathFromHallPage({ params }: { params: Promise<{ hallId: string }> }) {
  const { hallId } = await params;
  return <PathClient mode={{ type: "hall", id: Number(hallId) }} />;
}
