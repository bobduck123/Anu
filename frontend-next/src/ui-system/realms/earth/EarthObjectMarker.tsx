import type { CSSProperties } from 'react';
import { Box, HeartHandshake, Sparkles, Store, TentTree, Users } from 'lucide-react';

export type EarthObjectKind = 'camp' | 'parcel' | 'gathering' | 'market' | 'care' | 'outcome';

const iconMap = {
  camp: TentTree,
  parcel: Box,
  gathering: Users,
  market: Store,
  care: HeartHandshake,
  outcome: Sparkles,
} satisfies Record<EarthObjectKind, typeof TentTree>;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface EarthObjectMarkerProps {
  kind: EarthObjectKind;
  title: string;
  summary: string;
  meta: string;
  badges?: readonly string[];
  active?: boolean;
  style?: CSSProperties;
  onSelect: () => void;
}

export function EarthObjectMarker({
  kind,
  title,
  summary,
  meta,
  badges = [],
  active = false,
  style,
  onSelect,
}: EarthObjectMarkerProps) {
  const Icon = iconMap[kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={joinClasses('anu-earth-marker', `anu-earth-marker-${kind}`, active && 'anu-earth-marker-active')}
      style={style}
      aria-pressed={active}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/62">{kind}</p>
          <h3 className="mt-2 text-lg text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {title}
          </h3>
        </div>
        <span className="anu-earth-marker-icon">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-200/78">{summary}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#eed7a8]/88">{meta}</p>

      {badges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge, index) => (
            <span key={`${badge}-${index}`} className="anu-earth-marker-badge">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
