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
        const hiddenReads = Number(window.localStorage.getItem("presence:e2e:hidden_session_reads") ?? "0");
        if (hiddenReads > 0) {
          window.localStorage.setItem("presence:e2e:hidden_session_reads", String(hiddenReads - 1));
          return { data: { session: null }, error: null };
        }
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
      onAuthStateChange(callback: (event: string, session: { user?: typeof mockUser } | null) => void) {
        const listener = (event: Event) => {
          const detail = event instanceof CustomEvent
            ? event.detail as { event?: string; session?: { user?: typeof mockUser } | null }
            : null;
          callback(detail?.event ?? "SIGNED_OUT", detail?.session ?? null);
        };
        window.addEventListener("presence:e2e:auth-state", listener);
        return {
          data: {
            subscription: {
              unsubscribe() {
                window.removeEventListener("presence:e2e:auth-state", listener);
              },
            },
          },
        };
      },
      async signOut() {
        window.localStorage.removeItem("presence:e2e:access_token");
        document.cookie = "presence_e2e_session=; Path=/; Max-Age=0; SameSite=Lax";
        window.dispatchEvent(new CustomEvent("presence:e2e:auth-state", { detail: { event: "SIGNED_OUT", session: null } }));
        return { error: null };
      },
      async signInWithPassword(_credentials?: unknown) {
        window.localStorage.setItem("presence:e2e:access_token", "owner-test-token");
        document.cookie = "presence_e2e_session=owner-test-token; Path=/; SameSite=Lax";
        const delayedReads = window.localStorage.getItem("presence:e2e:delay_session_reads_after_sign_in");
        if (delayedReads) {
          window.localStorage.setItem("presence:e2e:hidden_session_reads", delayedReads);
          window.localStorage.removeItem("presence:e2e:delay_session_reads_after_sign_in");
        }
        return {
          data: {
            user: mockUser,
            session: {
              access_token: "owner-test-token",
              user: mockUser,
            },
          },
          error: null,
        };
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
