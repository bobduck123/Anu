import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PresenceNodeAdminTable } from '@/components/presence/PresenceControlComponents';
import { AnuPageHero } from '@/ui-system/anu/surfacePrimitives';

export default async function OrganisationPresencePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolved = await params;

  return (
    <div className="space-y-8">
      <AnuPageHero
        eyebrow="Organisation Presence"
        title={`Presence for organisation ${resolved.id}`}
        description="Use the tenant and organisation filters in the registry to isolate this organisation's Presence Nodes."
        actions={
          <Link href="/control/presence" className="inline-flex items-center gap-2 rounded-md border border-white/16 px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />
            Presence registry
          </Link>
        }
      />
      <PresenceNodeAdminTable />
    </div>
  );
}

