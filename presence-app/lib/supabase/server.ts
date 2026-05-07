import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublicEnv,
  SUPABASE_MISSING_MESSAGE,
} from "@/lib/supabase/config";

export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = { message: SUPABASE_MISSING_MESSAGE };
    return {
      auth: {
        async getSession() {
          return { data: { session: null }, error: null };
        },
        async exchangeCodeForSession(_code?: string) {
          return { data: { session: null }, error };
        },
        async signOut() {
          return { error: null };
        },
      },
    };
  }

  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
