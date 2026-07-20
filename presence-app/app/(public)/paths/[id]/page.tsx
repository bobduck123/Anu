import { PathClient } from "@/components/presence/graph/PathClient";

export const metadata = {
  title: "Path | Presence",
  description: "Choose a direction through Presence Rooms.",
};

export default async function PathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PathClient mode={{ type: "id", id: Number(id) }} />;
}

