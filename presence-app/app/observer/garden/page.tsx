import { GardenHomeClient } from "@/components/presence/garden/GardenHomeClient";

export const metadata = {
  title: "Garden | Presence",
  description: "Your Garden grows from Rooms, Halls, Paths, and people you share space with.",
};

export default function ObserverGardenPage() {
  return <GardenHomeClient />;
}
