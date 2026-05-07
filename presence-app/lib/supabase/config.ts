export const SUPABASE_MISSING_MESSAGE =
  "Presence Studio authentication is not configured for this environment.";

export function getSupabasePublicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isPublicSignupEnabled() {
  return process.env.NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS === "true";
}

export function studioContactHref() {
  const value = process.env.NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT?.trim();
  return value || "mailto:hello@presence.studio";
}
