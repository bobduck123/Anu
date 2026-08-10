import type { Metadata } from 'next';
import { PeachConsentRequestForm } from '@/components/peach/PeachConsentRequestForm';

export const metadata: Metadata = {
  title: 'Consent Request | PEACH | ANU',
  description: 'Manual PEACH consent export or withdrawal request.',
  robots: { index: false, follow: false },
};

export default function PeachConsentRequestPage() {
  return (
    <main className="min-h-screen bg-[#fbf7f1] px-4 py-16 text-[#24160f] md:px-8">
      <div className="mx-auto max-w-4xl">
        <PeachConsentRequestForm />
      </div>
    </main>
  );
}
