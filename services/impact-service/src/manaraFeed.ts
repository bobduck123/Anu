export type ManaraFeedMode = 'placeholder' | 'live';

export interface ManaraFeedState {
  configuredMode: ManaraFeedMode;
  activeMode: ManaraFeedMode;
  backend: 'placeholder' | 'prisma';
  dbBacked: boolean;
}

export function resolveManaraFeedMode(
  rawValue: string | undefined,
  nodeEnv: string
): ManaraFeedMode {
  const normalized = (rawValue ?? '').trim().toLowerCase();
  if (normalized === 'placeholder' || normalized === 'live') {
    return normalized;
  }

  return nodeEnv === 'production' ? 'placeholder' : 'live';
}

export function resolveManaraFeedState(options: {
  configuredMode: ManaraFeedMode;
  hasPrisma: boolean;
}): ManaraFeedState {
  const activeMode = options.hasPrisma ? options.configuredMode : 'placeholder';
  const backend = activeMode === 'live' ? 'prisma' : 'placeholder';

  return {
    configuredMode: options.configuredMode,
    activeMode,
    backend,
    dbBacked: backend === 'prisma'
  };
}
