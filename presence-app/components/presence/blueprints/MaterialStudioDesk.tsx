"use client";

// MaterialStudioDesk — Pass 4: the carpenter's room as a navigable
// RoomGraph.
//
// Five chambers (Workbench → Shelf → Pathway → Appreciation →
// Commission), each with its own exits. The user walks the studio with
// forward / left / right / back.

import { useMemo } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import type { RoomWorld } from "@/lib/presence/world/types";
import { buildRoomGraph } from "@/lib/presence/world/buildGraph";
import RoomGraphRenderer from "@/components/presence/world/engine/RoomGraphRenderer";
import { StudioSlot } from "@/components/presence/world/engine/slotRenderers";
import { makePortalRenderer } from "@/components/presence/world/engine/objectRenderers";

interface MaterialStudioDeskProps {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  world: RoomWorld;
  ctaLabel: string;
}

export default function MaterialStudioDesk({ node, theme, world }: MaterialStudioDeskProps) {
  const graph = useMemo(() => buildRoomGraph(node, world, node.display_name), [node, world]);
  const renderPortal = useMemo(() => makePortalRenderer(node), [node]);

  return (
    <RoomGraphRenderer
      graph={graph}
      renderSlot={StudioSlot}
      renderPortal={renderPortal}
      theme={theme}
      worldLabel={node.display_name}
      worldEyebrow="A working studio surface"
      atmosphere="warm_material"
      shellClassName="presence-engine-studio"
    />
  );
}
