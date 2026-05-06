import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PresenceNodeControlDetail } from '@/components/presence/PresenceControlComponents';
import { AnuPageHero } from '@/ui-system/anu/surfacePrimitives';

export default async function PresenceNodeDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolved = await params;
  const nodeId = Number(resolved.id);

  return (
    <div className="space-y-8">
      <AnuPageHero
        eyebrow="Presence Nodes"
        title="Node detail"
        description="Review publish state, analytics, public URL, and enquiry operations."
        actions={
          <Link href="/control/presence" className="inline-flex items-center gap-2 rounded-md border border-white/16 px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />
            Registry
          </Link>
        }
      />
      <PresenceNodeControlDetail nodeId={nodeId} />
    </div>
  );
}

