import { redirect } from 'next/navigation';

interface EducationResourceLibraryMapCompatPageProps {
  params: Promise<{ topicKey: string }>;
}

export default async function EducationResourceLibraryMapCompatPage({
  params,
}: EducationResourceLibraryMapCompatPageProps) {
  const { topicKey } = await params;
  redirect(`/education/maps/${encodeURIComponent(topicKey)}`);
}
