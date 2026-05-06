import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PresenceNodeEditor } from '@/components/presence/PresenceControlComponents';
import { AnuPageHero } from '@/ui-system/anu/surfacePrimitives';

export default async function EditPresenceNodePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolved = await params;
  const nodeId = Number(resolved.id);

  return (
    <div className="space-y-8">
      <AnuPageHero
        eyebrow="Presence Nodes"
        title="Edit Presence Node"
        description="Update public content, links, services, portfolio items, and publishing state."
        actions={
          <Link href={`/control/presence/${nodeId}`} className="inline-flex items-center gap-2 rounded-md border border-white/16 px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />
            Detail
          </Link>
        }
      />
      <PresenceNodeEditor nodeId={nodeId} />
    </div>
  );
}

