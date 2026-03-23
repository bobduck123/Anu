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
  active?: boolean;
  dialogId?: string;
  onClick: () => void;
}

export function ArchiveMarker({
  title,
  eyebrow,
  summary,
  shapeLabel,
  versionLabel,
  state,
  stateReason,
  active = false,
  dialogId,
  onClick,
}: ArchiveMarkerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={joinClasses('anu-labyrinth-marker text-left', active && 'anu-labyrinth-marker-active')}
      aria-pressed={active}
      aria-expanded={active}
      aria-haspopup="dialog"
      aria-controls={dialogId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#cbb792]/74">{eyebrow}</p>
          <h3 className="mt-2 text-xl text-[#f8ecd2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {title}
          </h3>
        </div>
        <StateSeal state={state} />
      </div>

      <p className="mt-3 text-sm leading-6 text-[#ded1bc]/78">{summary}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[#e9dcc4]/82">{versionLabel}</span>
        <span className="rounded-full border border-[#d3b37c]/18 bg-[#d3b37c]/8 px-3 py-1 text-[#f2ddb0]">{shapeLabel}</span>
      </div>

      <p className="mt-4 text-xs leading-5 text-[#b8ab96]/68">{stateReason}</p>
    </button>
  );
}
