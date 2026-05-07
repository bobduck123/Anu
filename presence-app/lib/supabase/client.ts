import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublicEnv,
  SUPABASE_MISSING_MESSAGE,
} from "@/lib/supabase/config";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = { message: SUPABASE_MISSING_MESSAGE };
    return {
      auth: {
        async getSession() {
          return { data: { session: null }, error: null };
        },
        async getUser() {
          return { data: { user: null }, error: null };
        },
        onAuthStateChange() {
          return {
            data: {
              subscription: {
                unsubscribe() {},
              },
            },
          };
        },
        async signInWithPassword(_credentials?: unknown) {
          return { data: { user: null, session: null }, error };
        },
        async signUp(_credentials?: unknown) {
          return { data: { user: null, session: null }, error };
        },
        async signOut() {
          return { error: null };
        },
        async resetPasswordForEmail(_email?: string, _options?: unknown) {
          return { data: null, error };
        },
        async updateUser(_attributes?: unknown) {
          return { data: { user: null }, error };
        },
      },
    };
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
  );
}
