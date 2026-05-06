import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PresenceNodeEditor } from '@/components/presence/PresenceControlComponents';
import { AnuPageHero } from '@/ui-system/anu/surfacePrimitives';

export default function NewPresenceNodePage() {
  return (
    <div className="space-y-8">
      <AnuPageHero
        eyebrow="Presence Nodes"
        title="Create Presence Node"
        description="Draft a mobile-first public card, portfolio, and enquiry surface."
        actions={
          <Link href="/control/presence" className="inline-flex items-center gap-2 rounded-md border border-white/16 px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />
      <PresenceNodeEditor />
    </div>
  );
}

