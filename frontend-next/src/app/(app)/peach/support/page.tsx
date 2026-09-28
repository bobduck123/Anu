import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PeachSupportIntentForm } from '@/components/peach/PeachSupportIntentForm';
import { getPeachFieldBySlug } from '@/lib/peach/readModel';

export const metadata: Metadata = {
  title: 'Support Intent | PEACH | ANU',
  description: 'Manual non-payment PEACH support intent.',
  robots: { index: false, follow: false },
};

export default function PeachSupportPage() {
  const field = getPeachFieldBySlug('studying-ourselves');

  if (!field) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#fbf7f1] px-4 py-16 text-[#24160f] md:px-8">
      <div className="mx-auto max-w-4xl">
        <PeachSupportIntentForm field={field} />
      </div>
    </main>
  );
}
