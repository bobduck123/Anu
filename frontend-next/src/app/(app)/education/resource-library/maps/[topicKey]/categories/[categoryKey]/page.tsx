import { EduHubShell } from '@/components/education/hub/EduHubShell';
import { MapCategoryPage } from '@/components/education/maps/MapCategoryPage';

export default async function EducationMapCategoryRoute({
  params,
}: {
  params: Promise<{ topicKey: string; categoryKey: string }>;
}) {
  const { topicKey, categoryKey } = await params;

  return (
    <EduHubShell>
      <MapCategoryPage topicKey={topicKey} categoryKey={categoryKey} />
    </EduHubShell>
  );
}
