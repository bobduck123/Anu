import type { ReactNode } from 'react';
import { PresenceStudioShell } from '@/components/presence/PresenceStudioShell';

export default function PresenceAppLayout({ children }: { children: ReactNode }) {
  return <PresenceStudioShell>{children}</PresenceStudioShell>;
}
