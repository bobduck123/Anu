import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PresenceTemplatesControlPanel } from '@/components/presence/PresenceControlComponents';
import { AnuPageHero } from '@/ui-system/anu/surfacePrimitives';

export default function PresenceTemplatesPage() {
  return (
    <div className="space-y-8">
      <AnuPageHero
        eyebrow="Presence templates"
        title="Template registry"
        description="Review active alpha templates used by Presence Node pages."
        actions={
          <Link href="/control/presence" className="inline-flex items-center gap-2 rounded-md border border-white/16 px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />
            Registry
          </Link>
        }
      />
      <PresenceTemplatesControlPanel />
    </div>
  );
}

