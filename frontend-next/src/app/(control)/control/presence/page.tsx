import Link from 'next/link';
import { Plus, UserRound } from 'lucide-react';
import { PresenceNodeAdminTable } from '@/components/presence/PresenceControlComponents';
import { AnuPageHero, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';

export default function ControlPresencePage() {
  return (
    <div className="space-y-8">
      <AnuPageHero
        eyebrow="Presence Nodes"
        title="Digital business cards and portfolio nodes"
        description="Create, publish, and monitor public Presence Nodes with tenant-aware control-plane permissions."
        actions={
          <Link href="/control/presence/new" className="inline-flex items-center gap-2 rounded-md bg-[#e0b115] px-4 py-2 text-sm font-semibold text-[#1e0227]">
            <Plus className="h-4 w-4" />
            New node
          </Link>
        }
      />

      <AnuSurfacePanel tone="soft" className="p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <UserRound className="h-4 w-4 text-[#e0b115]" />
          Node registry
        </div>
        <PresenceNodeAdminTable />
      </AnuSurfacePanel>
    </div>
  );
}

