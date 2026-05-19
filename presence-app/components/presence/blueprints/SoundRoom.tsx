"use client";

// SoundRoom — Pass 4: the DJ's room as a navigable RoomGraph.
//
// Five chambers (Threshold → Booth → Signal wall → Archive → Booking),
// each with its own exits. Audio plays inline in the booth; the user
// walks through the room with forward / left / right / back.

import { useMemo } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import type { RoomWorld } from "@/lib/presence/world/types";
import { buildRoomGraph } from "@/lib/presence/world/buildGraph";
import RoomGraphRenderer from "@/components/presence/world/engine/RoomGraphRenderer";
import { SoundSlot } from "@/components/presence/world/engine/slotRenderers";
import { makePortalRenderer } from "@/components/presence/world/engine/objectRenderers";

interface SoundRoomProps {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  world: RoomWorld;
  ctaLabel: string;
}

export default function SoundRoom({ node, theme, world }: SoundRoomProps) {
  const graph = useMemo(() => buildRoomGraph(node, world, node.display_name), [node, world]);
  const renderPortal = useMemo(() => makePortalRenderer(node), [node]);

  return (
    <RoomGraphRenderer
      graph={graph}
      renderSlot={SoundSlot}
      renderPortal={renderPortal}
      theme={theme}
      worldLabel={node.display_name}
      worldEyebrow="Nocturnal signal room"
      atmosphere="nocturnal"
      shellClassName="presence-engine-sound"
    />
  );
}
