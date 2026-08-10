import type { Metadata } from 'next';
import { PeachStewardWorkspace } from '@/components/peach/PeachStewardWorkspace';

export const metadata: Metadata = {
  title: 'PEACH Control | ANU',
  description: 'PEACH steward review workspace for controlled internal pilot rehearsal.',
  robots: { index: false, follow: false },
};

export default function ControlPeachPage() {
  return <PeachStewardWorkspace />;
}
