"use client";

// GalleryRoom — Pass 4: the painter's room as a navigable RoomGraph.
//
// Five chambers (Threshold → Wall → Wall text → Commission → Notes),
// each with its own exits. No vertical scroll narrative — the user
// walks the room with forward / left / right / back.

import { useMemo } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import type { RoomWorld } from "@/lib/presence/world/types";
import { buildRoomGraph } from "@/lib/presence/world/buildGraph";
import RoomGraphRenderer from "@/components/presence/world/engine/RoomGraphRenderer";
import { GallerySlot } from "@/components/presence/world/engine/slotRenderers";
import { makePortalRenderer } from "@/components/presence/world/engine/objectRenderers";

interface GalleryRoomProps {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  world: RoomWorld;
  ctaLabel: string;
}

export default function GalleryRoom({ node, theme, world }: GalleryRoomProps) {
  const graph = useMemo(() => buildRoomGraph(node, world, node.display_name), [node, world]);
  const renderPortal = useMemo(() => makePortalRenderer(node), [node]);

  return (
    <RoomGraphRenderer
      graph={graph}
      renderSlot={GallerySlot}
      renderPortal={renderPortal}
      theme={theme}
      worldLabel={node.display_name}
      worldEyebrow="A quiet gallery"
      atmosphere="quiet_gallery"
      shellClassName="presence-engine-gallery"
    />
  );
}
