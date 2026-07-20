import type { Metadata } from "next";
import { HallsIndexClient } from "@/components/presence/halls/HallsIndexClient";

export const metadata: Metadata = {
  title: "Halls | Presence",
  description: "Halls are where we gather. Shared digital meeting spaces — Town Halls, Salons, Market Halls, Listening Halls.",
};

export default function HallsIndexPage() {
  return <HallsIndexClient />;
}
