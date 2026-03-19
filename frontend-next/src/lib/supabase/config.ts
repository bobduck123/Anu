export function isSupabaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
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
