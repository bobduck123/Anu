import { EduHubShell } from '@/components/education/hub/EduHubShell';
import { MapEntityIndexPage } from '@/components/education/maps/MapEntityIndexPage';

export default async function EducationMapEntityIndexRoute({
  params,
}: {
  params: Promise<{ topicKey: string }>;
}) {
  const { topicKey } = await params;

  return (
    <EduHubShell>
      <MapEntityIndexPage topicKey={topicKey} />
    </EduHubShell>
  );
}
