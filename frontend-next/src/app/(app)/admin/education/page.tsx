import { EducationAdminDashboard } from '@/components/education/EducationAdminDashboard';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

export default function EducationAdminPage() {
  return (
    <EducationLayerShell>
      <EducationAdminDashboard />
    </EducationLayerShell>
  );
}
