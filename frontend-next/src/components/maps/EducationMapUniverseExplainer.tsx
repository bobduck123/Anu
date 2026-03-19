'use client';

import { UniverseExplainer } from './universe/UniverseExplainer';
import type { UniverseStar } from './universe/types';

interface EducationMapUniverseExplainerProps {
  star: UniverseStar | null;
  onClose?: () => void;
  className?: string;
}

export function EducationMapUniverseExplainer({
  star,
  onClose,
  className,
}: EducationMapUniverseExplainerProps) {
  return <UniverseExplainer star={star} onClose={onClose} className={className} />;
}
