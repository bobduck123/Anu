'use client';

import { UniverseScene } from './universe/UniverseScene';
import type { UniversePacket } from './universe/types';

interface EducationMapUniverseSceneProps {
  packet: UniversePacket;
  activeNodeId: string | null;
  compareNodeIds: string[];
  visibleNodeIds: string[];
  immersive?: boolean;
  onSelectNodeId: (nodeId: string) => void;
}

export function EducationMapUniverseScene({
  packet,
  activeNodeId,
  compareNodeIds,
  visibleNodeIds,
  immersive = false,
  onSelectNodeId,
}: EducationMapUniverseSceneProps) {
  return (
    <UniverseScene
      packet={packet}
      activeStarId={activeNodeId}
      compareStarIds={compareNodeIds}
      visibleStarIds={visibleNodeIds}
      immersive={immersive}
      onSelectStarId={onSelectNodeId}
    />
  );
}
