import { AnuUiLab } from '@/ui-system/anu/AnuUiLab';
import { SandboxAccessBoundary } from '@/ui-system/anu/SandboxAccessBoundary';

export default function SandboxUiLabPage() {
  return (
    <SandboxAccessBoundary returnTo="/sandbox/ui-lab">
      <AnuUiLab />
    </SandboxAccessBoundary>
  );
}
