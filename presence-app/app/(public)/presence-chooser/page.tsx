import type { Metadata } from "next";
import PresenceWorldChooser from "@/components/presence/world/chooser/PresenceWorldChooser";

export const metadata: Metadata = {
  title: "Presence — Choose your world",
  description: "Visual preview of every Presence engagement dynamic — chamber walk, orbit constellation, object tableau, portal cascade — plus atmosphere and motion options. Pick what you'll feel like before you build it.",
};

export default function PresenceChooserPage() {
  return <PresenceWorldChooser />;
}
