import { redirect } from 'next/navigation';

interface EducationResourceLibraryCategoryCompatPageProps {
  params: Promise<{ topicKey: string; categoryKey: string }>;
}

export default async function EducationResourceLibraryCategoryCompatPage({
  params,
}: EducationResourceLibraryCategoryCompatPageProps) {
  const { topicKey, categoryKey } = await params;
  redirect(`/education/maps/${encodeURIComponent(topicKey)}?category=${encodeURIComponent(categoryKey)}`);
}
