"use client";

import { createClient } from "@/lib/supabase/client";

export const AUTH_REQUIRED_MESSAGE = "Sign in required.";

const SESSION_HYDRATION_DELAYS_MS = [120, 320, 650];

export interface OwnerSessionResolutionOptions {
  waitForHydration?: boolean;
}

export async function resolveOwnerSessionToken(
  options: OwnerSessionResolutionOptions = {},
): Promise<string | null> {
  const supabase = createClient();
  const waitForHydration = options.waitForHydration !== false;
  const attempts = waitForHydration ? SESSION_HYDRATION_DELAYS_MS.length + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    const delay = SESSION_HYDRATION_DELAYS_MS[attempt];
    if (delay) await wait(delay);
  }

  return null;
}

export async function waitForPersistedOwnerSession(): Promise<string | null> {
  return resolveOwnerSessionToken({ waitForHydration: true });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
