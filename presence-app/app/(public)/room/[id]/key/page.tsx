import { notFound, redirect } from "next/navigation";
import { resolveRoomEntry } from "@/lib/api/presenceGraph";

export const metadata = {
  title: "Enter Room | Presence",
  description: "Open a published Presence Room.",
};

export default async function PublicRoomEntryByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roomId = Number(id);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    notFound();
  }

  const entry = await resolveRoomEntry(roomId).catch(() => notFound());
  redirect(`/presence/${entry.room.slug}`);
}
