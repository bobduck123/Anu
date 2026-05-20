import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublicEnv,
  SUPABASE_MISSING_MESSAGE,
} from "@/lib/supabase/config";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  const useE2EAuthMock = process.env.NEXT_PUBLIC_ENABLE_E2E_AUTH_MOCK === "true";

  if (useE2EAuthMock && typeof window !== "undefined") {
    return createMockBrowserClient();
  }

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
        async verifyOtp(_credentials?: unknown) {
          return { data: { user: null, session: null }, error };
        },
        async resend(_credentials?: unknown) {
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

function createMockBrowserClient() {
  const mockUser = {
    id: "presence-e2e-user",
    email: "observer@example.test",
    email_confirmed_at: "2026-05-20T00:00:00.000Z",
    confirmed_at: "2026-05-20T00:00:00.000Z",
    user_metadata: {},
  };
  const error = { message: SUPABASE_MISSING_MESSAGE };

  return {
    auth: {
      async getSession() {
        const token = window.localStorage.getItem("presence:e2e:access_token");
        return {
          data: {
            session: token
              ? {
                  access_token: token,
                  user: mockUser,
                }
              : null,
          },
          error: null,
        };
      },
      async getUser() {
        const token = window.localStorage.getItem("presence:e2e:access_token");
        return {
          data: {
            user: token ? mockUser : null,
          },
          error: null,
        };
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
      async signOut() {
        window.localStorage.removeItem("presence:e2e:access_token");
        return { error: null };
      },
      async signInWithPassword(_credentials?: unknown) {
        return { data: { user: mockUser, session: null }, error };
      },
      async signUp(_credentials?: unknown) {
        return { data: { user: mockUser, session: null }, error };
      },
      async verifyOtp(_credentials?: unknown) {
        return { data: { user: mockUser, session: null }, error };
      },
      async resend(_credentials?: unknown) {
        return { data: null, error };
      },
      async resetPasswordForEmail(_email?: string, _options?: unknown) {
        return { data: null, error };
      },
      async updateUser(_attributes?: unknown) {
        return { data: { user: mockUser }, error: null };
      },
    },
  };
}
