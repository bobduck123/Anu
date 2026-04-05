import { AnuUiLab } from '@/ui-system/anu/AnuUiLab';
import { SandboxAccessBoundary } from '@/ui-system/anu/SandboxAccessBoundary';

export default function LabRoutePage() {
  return (
    <SandboxAccessBoundary returnTo="/lab">
      <AnuUiLab />
    </SandboxAccessBoundary>
  );
}
