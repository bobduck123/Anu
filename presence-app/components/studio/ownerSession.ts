"use client";

import { createClient } from "@/lib/supabase/client";

export const AUTH_REQUIRED_MESSAGE = "Sign in required.";

export async function resolveOwnerSessionToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
