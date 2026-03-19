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

const warnedSupabaseContexts = new Set<string>();

export function warnMissingSupabaseConfig(context: string, env: NodeJS.ProcessEnv = process.env): void {
  const key = `${env.NODE_ENV ?? 'unknown'}:${context}`;
  if (warnedSupabaseContexts.has(key)) {
    return;
  }

  warnedSupabaseContexts.add(key);

  if (env.NODE_ENV === 'production') {
    console.error(`[supabase] ${SUPABASE_MISSING_MESSAGE} Context: ${context}. Hosted auth will degrade until env vars are restored.`);
    return;
  }

  console.warn(`[supabase] ${SUPABASE_MISSING_MESSAGE} Context: ${context}. Local auth will run in anonymous fallback mode.`);
}
