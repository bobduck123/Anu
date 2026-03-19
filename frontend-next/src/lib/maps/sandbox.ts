const DEFAULT_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const DEFAULT_ACTOR = 'anu-admin';
const ACTOR_STORAGE_KEY = 'falak-map-sandbox-actor';
const PUBLIC_FALAK_MODE = process.env.NEXT_PUBLIC_FALAK_MODE || '';
const PUBLIC_FALAK_SANDBOX_TENANT_ID = process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID?.trim() || '';
const PUBLIC_FALAK_TENANT_ID = process.env.NEXT_PUBLIC_FALAK_TENANT_ID?.trim() || '';
const PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR = process.env.NEXT_PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR?.trim() || '';

export type FalakTenantConfiguration =
  | { mode: 'hosted'; tenantId: string }
  | { mode: 'sandbox'; tenantId: string }
  | { mode: 'missing'; tenantId: null };

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

function getFalakPublicEnv(env?: NodeJS.ProcessEnv): {
  mode: string;
  sandboxTenantId: string;
  hostedTenantId: string;
  sandboxDefaultActor: string;
} {
  if (env) {
    return {
      mode: env.NEXT_PUBLIC_FALAK_MODE || '',
      sandboxTenantId: env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID?.trim() || '',
      hostedTenantId: env.NEXT_PUBLIC_FALAK_TENANT_ID?.trim() || '',
      sandboxDefaultActor: env.NEXT_PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR?.trim() || '',
    };
  }

  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
    return {
      mode: process.env.NEXT_PUBLIC_FALAK_MODE || '',
      sandboxTenantId: process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID?.trim() || '',
      hostedTenantId: process.env.NEXT_PUBLIC_FALAK_TENANT_ID?.trim() || '',
      sandboxDefaultActor: process.env.NEXT_PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR?.trim() || '',
    };
  }

  return {
    mode: PUBLIC_FALAK_MODE,
    sandboxTenantId: PUBLIC_FALAK_SANDBOX_TENANT_ID,
    hostedTenantId: PUBLIC_FALAK_TENANT_ID,
    sandboxDefaultActor: PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR,
  };
}

export function isFalakMapSandbox(env?: NodeJS.ProcessEnv): boolean {
  return getFalakPublicEnv(env).mode === 'map_sandbox';
}

export function getFalakSandboxTenantId(env?: NodeJS.ProcessEnv): string {
  return getFalakPublicEnv(env).sandboxTenantId || DEFAULT_TENANT_ID;
}

export function getFalakRequestTenantId(env?: NodeJS.ProcessEnv): string | null {
  const { hostedTenantId } = getFalakPublicEnv(env);
  if (hostedTenantId) {
    return hostedTenantId;
  }

  return isFalakMapSandbox(env) ? getFalakSandboxTenantId(env) : null;
}

export function getFalakTenantConfiguration(env?: NodeJS.ProcessEnv): FalakTenantConfiguration {
  const { hostedTenantId } = getFalakPublicEnv(env);
  if (hostedTenantId) {
    return { mode: 'hosted', tenantId: hostedTenantId };
  }

  if (isFalakMapSandbox(env)) {
    return { mode: 'sandbox', tenantId: getFalakSandboxTenantId(env) };
  }

  return { mode: 'missing', tenantId: null };
}

export function getFalakSandboxDefaultActor(env?: NodeJS.ProcessEnv): string {
  return getFalakPublicEnv(env).sandboxDefaultActor || DEFAULT_ACTOR;
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
