import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PeachFieldView } from '@/components/peach/PeachFieldView';
import { getPeachFieldBySlug, toPublicPeachFieldResponse } from '@/lib/peach/readModel';

type FieldPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: FieldPageProps): Promise<Metadata> {
  const { slug } = await params;
  const field = getPeachFieldBySlug(slug);

  if (!field) {
    return {
      title: 'PEACH Field | ANU',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${field.title} | PEACH | ANU`,
    description: field.shortDescription,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PeachFieldDetailPage({ params }: FieldPageProps) {
  const { slug } = await params;
  const field = getPeachFieldBySlug(slug);

  if (!field) {
    notFound();
  }

  const response = toPublicPeachFieldResponse(field);
  return <PeachFieldView orchard={response.orchard} field={response.field} />;
}
