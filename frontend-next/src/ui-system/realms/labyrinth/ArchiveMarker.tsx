import type { CSSProperties } from 'react';
import type { LabyrinthState } from '@/app/(app)/governance/model-registry/modelRegistryPresentation';
import { StateSeal } from './StateSeal';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface ArchiveMarkerProps {
  title: string;
  eyebrow: string;
  summary: string;
  shapeLabel: string;
  versionLabel: string;
  state: LabyrinthState;
  stateReason: string;
  lane: number;
  depth: number;
  towerHeight: number;
  active?: boolean;
  dialogId?: string;
  onClick: () => void;
  onHover?: () => void;
}

export function ArchiveMarker({
  title,
  eyebrow,
  summary,
  shapeLabel,
  versionLabel,
  state,
  stateReason,
  lane,
  depth,
  towerHeight,
  active = false,
  dialogId,
  onClick,
  onHover,
}: ArchiveMarkerProps) {
  const style = {
    '--anu-archive-lane': lane,
    '--anu-archive-depth': depth,
    '--anu-archive-height': `${towerHeight}rem`,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onClick}
      onFocus={onHover}
      onMouseEnter={onHover}
      className={joinClasses('anu-labyrinth-marker text-left', active && 'anu-labyrinth-marker-active')}
      aria-pressed={active}
      aria-expanded={active}
      aria-haspopup="dialog"
      aria-controls={dialogId}
      style={style}
    >
      <span className="anu-labyrinth-marker__mass" aria-hidden="true">
        <span className="anu-labyrinth-marker__tower" />
        <span className="anu-labyrinth-marker__roof" />
      </span>

      <span className="anu-labyrinth-marker__label">
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-[#f6d4cb]/74">{eyebrow}</span>
            <span
              className="mt-2 block text-xl text-[#f6d4cb]"
              style={{ fontFamily: 'var(--anu-type-display)' }}
            >
              {title}
            </span>
          </span>
          <StateSeal state={state} />
        </span>

        <span className="mt-3 block text-sm leading-6 text-[#f6d4cb]/78">{summary}</span>

        <span className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-3 py-1 text-[#f6d4cb]/82">
            {versionLabel}
          </span>
          <span className="rounded-full border border-[#f6d4cb]/18 bg-[#f6d4cb]/8 px-3 py-1 text-[#f6d4cb]">
            {shapeLabel}
          </span>
        </span>

        <span className="mt-4 block text-xs leading-5 text-[#f6d4cb]/68">{stateReason}</span>
      </span>
    </button>
  );
}
