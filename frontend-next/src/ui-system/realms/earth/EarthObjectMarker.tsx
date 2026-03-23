import type { CSSProperties } from 'react';

export type EarthObjectKind = 'camp' | 'parcel' | 'gathering' | 'market' | 'care' | 'outcome';

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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={joinClasses('anu-earth-marker', `anu-earth-marker-${kind}`, active && 'anu-earth-marker-active')}
      style={style}
      aria-pressed={active}
    >
      <span className="anu-earth-marker-pulse" aria-hidden="true" />
      <span className="anu-earth-marker-core" aria-hidden="true" />
      <div className="anu-earth-marker-hud">
        <p className="anu-earth-marker-kind">{kind}</p>
        <h3 className="anu-earth-marker-title">{title}</h3>
        <p className="anu-earth-marker-summary">{summary}</p>
        <p className="anu-earth-marker-meta">{meta}</p>

        {badges.length > 0 ? (
          <div className="anu-earth-marker-badge-row">
            {badges.map((badge, index) => (
              <span key={`${badge}-${index}`} className="anu-earth-marker-badge">
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
