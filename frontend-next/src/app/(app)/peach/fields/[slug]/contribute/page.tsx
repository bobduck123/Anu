import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PeachContributionForm } from '@/components/peach/PeachContributionForm';
import { getPeachFieldBySlug } from '@/lib/peach/readModel';

type ContributePageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'Contribute | PEACH | ANU',
  description: 'Private PEACH Gate 9 contribution intake.',
  robots: { index: false, follow: false },
};

export default async function PeachContributePage({ params }: ContributePageProps) {
  const { slug } = await params;
  const field = getPeachFieldBySlug(slug);

  if (!field) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#fbf7f1] px-4 py-16 text-[#24160f] md:px-8">
      <div className="mx-auto max-w-4xl">
        <PeachContributionForm field={field} />
      </div>
    </main>
  );
}
