const DEFAULT_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const DEFAULT_ACTOR = 'anu-admin';
const ACTOR_STORAGE_KEY = 'falak-map-sandbox-actor';

export interface SandboxActorOption {
  id: string;
  label: string;
  description: string;
}

export const FALAK_SANDBOX_ACTORS: SandboxActorOption[] = [
  { id: '', label: 'Public', description: 'Read-only, no trusted sandbox actor header.' },
  { id: 'anu-admin', label: 'Admin', description: 'Tenant admin with full local sandbox edit access.' },
  { id: 'anu-curator', label: 'Curator', description: 'Curator edit path for content and graph updates.' },
  { id: 'anu-governor', label: 'Governor', description: 'Governor identity for policy and approval checks.' },
  { id: 'anu-public', label: 'Member', description: 'Seeded public member identity for non-admin tests.' },
];

export function isFalakMapSandbox(): boolean {
  return process.env.NEXT_PUBLIC_FALAK_MODE === 'map_sandbox';
}

export function getFalakSandboxTenantId(): string {
  return process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID?.trim() || DEFAULT_TENANT_ID;
}

export function getFalakRequestTenantId(): string | null {
  const hostedTenantId = process.env.NEXT_PUBLIC_FALAK_TENANT_ID?.trim();
  if (hostedTenantId) {
    return hostedTenantId;
  }

  return isFalakMapSandbox() ? getFalakSandboxTenantId() : null;
}

export function getFalakSandboxDefaultActor(): string {
  return process.env.NEXT_PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR?.trim() || DEFAULT_ACTOR;
}

export function getFalakSandboxActorIdentity(): string {
  if (typeof window === 'undefined') {
    return getFalakSandboxDefaultActor();
  }

  return localStorage.getItem(ACTOR_STORAGE_KEY) || getFalakSandboxDefaultActor();
}

export function setFalakSandboxActorIdentity(actorId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!actorId) {
    localStorage.removeItem(ACTOR_STORAGE_KEY);
    return;
  }

  localStorage.setItem(ACTOR_STORAGE_KEY, actorId);
}
