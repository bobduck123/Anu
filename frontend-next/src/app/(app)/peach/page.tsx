import type { Metadata } from 'next';
import { PeachFieldView } from '@/components/peach/PeachFieldView';
import { getActivePeachFieldResponse } from '@/lib/peach/readModel';

export const metadata: Metadata = {
  title: 'PEACH | ANU',
  description: 'PEACH as an ANU collective-cultural vertical.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PeachPage() {
  const { orchard, field } = getActivePeachFieldResponse();
  return <PeachFieldView orchard={orchard} field={field} />;
}
