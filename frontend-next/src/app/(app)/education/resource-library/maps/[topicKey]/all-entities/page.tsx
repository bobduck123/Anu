import { redirect } from 'next/navigation';

interface EducationResourceLibraryEntitiesCompatPageProps {
  params: Promise<{ topicKey: string }>;
}

export default async function EducationResourceLibraryEntitiesCompatPage({
  params,
}: EducationResourceLibraryEntitiesCompatPageProps) {
  const { topicKey } = await params;
  redirect(`/education/maps/${encodeURIComponent(topicKey)}`);
}
