import type { ReactNode } from 'react';
import { UniverseScene } from '@/components/maps/universe/UniverseScene';
import type { UniversePacket } from '@/components/maps/universe/types';

interface CelestialStarfieldShellProps {
  packet: UniversePacket;
  activeStarId: string | null;
  visibleStarIds?: string[];
  onSelectStarId: (starId: string) => void;
  topChrome?: ReactNode;
  bottomChrome?: ReactNode;
  bubble?: ReactNode;
  tunnel?: ReactNode;
}

export function CelestialStarfieldShell({
  packet,
  activeStarId,
  visibleStarIds,
  onSelectStarId,
  topChrome,
  bottomChrome,
  bubble,
  tunnel,
}: CelestialStarfieldShellProps) {
  return (
    <div className="fixed inset-0 z-[5] overflow-hidden bg-[#1e0227]" style={{ isolation: 'isolate' }}>
      <UniverseScene
        packet={packet}
        activeStarId={activeStarId}
        visibleStarIds={visibleStarIds}
        immersive
        onSelectStarId={onSelectStarId}
      />

      {topChrome ? (
        <div className="pointer-events-none absolute inset-x-3 top-4 z-10 flex justify-center md:left-[17rem] md:right-6">
          <div className="pointer-events-auto w-full max-w-6xl">{topChrome}</div>
        </div>
      ) : null}

      {bottomChrome ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-5 z-10 flex justify-center md:left-[17rem] md:right-6">
          <div className="pointer-events-auto w-full max-w-6xl">{bottomChrome}</div>
        </div>
      ) : null}

      {bubble ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-24 z-[12] flex justify-center md:left-[17rem] md:right-6 md:justify-end">
          <div className="pointer-events-auto w-full max-w-2xl">{bubble}</div>
        </div>
      ) : null}

      {tunnel}
    </div>
  );
}
