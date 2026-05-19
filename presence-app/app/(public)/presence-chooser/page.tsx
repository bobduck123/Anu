import type { Metadata } from "next";
import PresenceStudio from "@/components/presence/studio/PresenceStudio";

export const metadata: Metadata = {
  title: "Presence Studio — Set the direction",
  description: "Presence is the frame. The client is the world. Five short stages to set the direction for a Presence — the place visitors enter, how they move through it, and how they reach you. Nothing is published until you say so.",
};

export default function PresenceStudioPage() {
  return <PresenceStudio />;
}
