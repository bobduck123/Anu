import type { ReactNode } from 'react';
import type { LabyrinthState } from '@/app/(app)/governance/model-registry/modelRegistryPresentation';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const stateClassMap: Record<LabyrinthState, string> = {
  active: 'anu-state-seal anu-state-seal-active',
  contested: 'anu-state-seal anu-state-seal-contested',
  deprecated: 'anu-state-seal anu-state-seal-deprecated',
  dormant: 'anu-state-seal anu-state-seal-dormant',
  experimental: 'anu-state-seal anu-state-seal-experimental',
};

function stateLabel(value: LabyrinthState): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface StateSealProps {
  state: LabyrinthState;
  children?: ReactNode;
  className?: string;
}

export function StateSeal({ state, children, className }: StateSealProps) {
  return (
    <span className={joinClasses(stateClassMap[state], className)}>
      <span>{children ?? stateLabel(state)}</span>
    </span>
  );
}
