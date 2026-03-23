import type { ReactNode } from 'react';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface EmbeddedInstrumentPanelProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}

export function EmbeddedInstrumentPanel({
  label,
  value,
  detail,
  className,
}: EmbeddedInstrumentPanelProps) {
  return (
    <div className={joinClasses('anu-labyrinth-instrument', className)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#cbb792]/74">{label}</p>
      <div className="mt-2 text-lg font-semibold text-[#f8ecd2]">{value}</div>
      {detail ? <p className="mt-2 text-xs leading-5 text-[#d8ccb6]/74">{detail}</p> : null}
    </div>
  );
}
