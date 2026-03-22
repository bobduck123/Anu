import { FalakMapSandboxHome } from '@/components/maps/FalakMapSandboxHome';
import { SandboxAccessBoundary } from '@/ui-system/anu/SandboxAccessBoundary';

export default function SandboxMapsPage() {
  return (
    <SandboxAccessBoundary returnTo="/sandbox/maps">
      <FalakMapSandboxHome />
    </SandboxAccessBoundary>
  );
}
