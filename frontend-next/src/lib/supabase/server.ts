import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, warnMissingSupabaseConfig } from './config';

type NoopServerSupabaseClient = {
  auth: {
    getUser: () => Promise<{ data: { user: SupabaseUser | null }; error: null }>;
    getSession: () => Promise<{ data: { session: null }; error: null }>;
  };
};

/**
 * Creates a Supabase client for server-side operations.
 *
 * IMPORTANT: With Fluid compute, don't put this client in a global variable.
 * Always create a new client within each function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  if (!isSupabaseConfigured()) {
    warnMissingSupabaseConfig('server_client');

    const noopClient: NoopServerSupabaseClient = {
      auth: {
        async getUser() {
          return { data: { user: null }, error: null };
        },
        async getSession() {
          return { data: { session: null }, error: null };
        },
      },
    };

    return noopClient;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
