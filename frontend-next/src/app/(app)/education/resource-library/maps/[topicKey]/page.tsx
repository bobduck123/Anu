import { EduHubShell } from '@/components/education/hub/EduHubShell';
import { MapResourcePage } from '@/components/education/maps/MapResourcePage';

export default async function EducationMapDetailPage({
  params,
}: {
  params: Promise<{ topicKey: string }>;
}) {
  const { topicKey } = await params;

  return (
    <EduHubShell>
      <MapResourcePage topicKey={topicKey} />
    </EduHubShell>
  );
}
