import { createBrowserClient } from '@supabase/ssr';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  allowSupabaseAnonymousFallback,
  getSupabasePublicEnv,
  isSupabaseConfigured,
  SupabaseConfigurationError,
  SUPABASE_MISSING_MESSAGE,
  warnMissingSupabaseConfig,
} from './config';

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;
type AuthSubscription = { unsubscribe: () => void };

type NoopBrowserSupabaseClient = {
  auth: {
    getUser: () => Promise<{ data: { user: SupabaseUser | null }; error: null }>;
    getSession: () => Promise<{ data: { session: null }; error: null }>;
    onAuthStateChange: (
      callback: (event: string, session: null) => void,
    ) => { data: { subscription: AuthSubscription } };
    signInWithPassword: (_credentials: { email: string; password: string }) => Promise<{
      data: { user: SupabaseUser | null; session: null };
      error: Error;
    }>;
    signUp: (_credentials: {
      email: string;
      password: string;
      options?: Record<string, unknown>;
    }) => Promise<{
      data: { user: SupabaseUser | null; session: null };
      error: Error;
    }>;
    signOut: () => Promise<{ error: null }>;
  };
};

let warnedMissingConfig = false;

function warnMissingConfigOnce() {
  if (!warnedMissingConfig) {
    warnedMissingConfig = true;
    warnMissingSupabaseConfig('browser_client');
  }
}

function createNoopBrowserClient(): NoopBrowserSupabaseClient {
  warnMissingConfigOnce();

  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange(callback) {
        callback('SIGNED_OUT', null);
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
      async signInWithPassword() {
        return {
          data: { user: null, session: null },
          error: new Error(SUPABASE_MISSING_MESSAGE),
        };
      },
      async signUp() {
        return {
          data: { user: null, session: null },
          error: new Error(SUPABASE_MISSING_MESSAGE),
        };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}

export function createClient(): BrowserSupabaseClient | NoopBrowserSupabaseClient {
  if (!isSupabaseConfigured()) {
    warnMissingSupabaseConfig('browser_client');
    if (!allowSupabaseAnonymousFallback()) {
      throw new SupabaseConfigurationError('browser_client');
    }

    return createNoopBrowserClient();
  }

  const { url, anonKey } = getSupabasePublicEnv();

  return createBrowserClient(url, anonKey);
}
