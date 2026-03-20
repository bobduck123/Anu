const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

function getSupabasePublicEnv(env?: NodeJS.ProcessEnv): {
  url: string;
  anonKey: string;
} {
  if (env) {
    return {
      url: env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '',
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
    };
  }

  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
    };
  }

  return {
    url: PUBLIC_SUPABASE_URL,
    anonKey: PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured(env?: NodeJS.ProcessEnv): boolean {
  const { url, anonKey } = getSupabasePublicEnv(env);
  return Boolean(url && anonKey);
}

export const SUPABASE_MISSING_MESSAGE = 'Supabase auth is not configured for this environment.';

export class SupabaseConfigurationError extends Error {
  context: string;

  constructor(context: string) {
    super(SUPABASE_MISSING_MESSAGE);
    this.name = 'SupabaseConfigurationError';
    this.context = context;
  }
}

function isHostedBrowserRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const host = window.location.hostname.trim().toLowerCase();
  return !(
    host === 'localhost'
    || host === '127.0.0.1'
    || host === '0.0.0.0'
    || host.endsWith('.local')
  );
}

export function requiresStrictSupabaseConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'test') {
    return false;
  }

  if (env.VERCEL === '1') {
    return true;
  }

  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === 'production' || vercelEnv === 'preview') {
    return true;
  }

  return isHostedBrowserRuntime();
}

export function allowSupabaseAnonymousFallback(env: NodeJS.ProcessEnv = process.env): boolean {
  return !requiresStrictSupabaseConfig(env);
}

export function isSupabaseConfigurationError(error: unknown): error is SupabaseConfigurationError {
  return error instanceof SupabaseConfigurationError;
}

const warnedSupabaseContexts = new Set<string>();

export function warnMissingSupabaseConfig(context: string, env: NodeJS.ProcessEnv = process.env): void {
  const key = `${env.NODE_ENV ?? 'unknown'}:${context}`;
  if (warnedSupabaseContexts.has(key)) {
    return;
  }

  warnedSupabaseContexts.add(key);

  if (requiresStrictSupabaseConfig(env)) {
    console.error(`[supabase] ${SUPABASE_MISSING_MESSAGE} Context: ${context}. Hosted auth is blocked until env vars are restored.`);
    return;
  }

  console.warn(`[supabase] ${SUPABASE_MISSING_MESSAGE} Context: ${context}. Local auth will run in anonymous fallback mode.`);
}
