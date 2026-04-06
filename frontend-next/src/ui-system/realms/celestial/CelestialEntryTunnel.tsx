import { CelestialTunnel } from './CelestialTunnel';
import type { CommunityCelestialIntent, CommunityCelestialIntentOption } from './communityCelestialPresentation';

interface CelestialEntryTunnelProps {
  intents: readonly CommunityCelestialIntentOption[];
  activeIntent: CommunityCelestialIntent;
  onSelectIntent: (intent: CommunityCelestialIntent) => void;
  onEnter: () => void;
  loading?: boolean;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}

export function CelestialEntryTunnel(props: CelestialEntryTunnelProps) {
  return <CelestialTunnel {...props} />;
}

