import type { ReactNode } from 'react';
import { EmbeddedInstrumentPanel } from './EmbeddedInstrumentPanel';

export interface ObservatoryStatItem {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

interface ObservatoryStatsRailProps {
  items: readonly ObservatoryStatItem[];
}

export function ObservatoryStatsRail({ items }: ObservatoryStatsRailProps) {
  return (
    <>
      {items.map((item) => (
        <EmbeddedInstrumentPanel key={item.label} label={item.label} value={item.value} detail={item.detail} />
      ))}
    </>
  );
}
