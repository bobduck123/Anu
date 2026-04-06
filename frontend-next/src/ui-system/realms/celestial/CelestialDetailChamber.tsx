import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { CelestialNodeBubble } from './CelestialNodeBubble';

interface CelestialDetailChamberProps {
  eyebrow: string;
  title: string;
  summary: ReactNode;
  tags?: readonly string[];
  detail?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}

export function CelestialDetailChamber({
  eyebrow,
  title,
  summary,
  tags = [],
  detail,
  actions,
  onClose,
}: CelestialDetailChamberProps) {
  return (
    <div className="fixed inset-0 z-[16] flex items-end justify-center bg-[color:rgba(30,2,39,0.72)] px-4 pb-6 pt-16 md:items-center md:px-6">
      <div className="w-full max-w-3xl">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(30,2,39,0.45)] text-[var(--color-foreground)] transition hover:bg-[color:rgba(246,212,203,0.08)]"
            aria-label="Close chamber"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <CelestialNodeBubble
          eyebrow={eyebrow}
          title={title}
          summary={summary}
          tags={tags}
          detail={detail}
          actions={actions}
          variant="chamber"
          className="max-h-[78dvh] overflow-y-auto"
        />
      </div>
    </div>
  );
}

