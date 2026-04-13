import Link from 'next/link';
import { Activity, Building2 } from 'lucide-react';
import {
  AnuControlLink,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

export default function ControlHomePage() {
  return (
    <div className="space-y-6">
      <AnuPageHero
        eyebrow="Control plane"
        title="Operator control routes"
        description="Use the control route family for tenant management and runtime diagnostics on approved control hosts."
        actions={
          <>
            <AnuControlLink href="/control/tenants" tone="active" iconLeft={Building2}>
              Open tenants
            </AnuControlLink>
            <AnuControlLink href="/control/runtime-health" tone="default" iconLeft={Activity}>
              Open runtime health
            </AnuControlLink>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <AnuSurfacePanel tone="soft" className="p-5">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Tenant stewardship</h2>
          <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.84)]">
            Provision and review tenant nodes from the dedicated control host route.
          </p>
          <Link href="/control/tenants" className="mt-4 inline-flex text-sm text-[var(--color-foreground)] underline-offset-2 hover:underline">
            Go to /control/tenants
          </Link>
        </AnuSurfacePanel>
        <AnuSurfacePanel tone="soft" className="p-5">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Runtime contracts</h2>
          <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.84)]">
            Verify core and impact health endpoints from the same control route family.
          </p>
          <Link href="/control/runtime-health" className="mt-4 inline-flex text-sm text-[var(--color-foreground)] underline-offset-2 hover:underline">
            Go to /control/runtime-health
          </Link>
        </AnuSurfacePanel>
      </div>
    </div>
  );
}
