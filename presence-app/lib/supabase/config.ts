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

/**
 * Public signup gate.
 *
 * Default behaviour for Presence is **public signup enabled** so that the
 * normal user flow (sign up → verify email → guided onboarding → private draft
 * Presence in Studio) works on a fresh deploy without requiring an env var.
 *
 * Operators can disable signups in two equivalent ways:
 *   - set NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS to "false" / "0" / "no" / "off"
 *   - set NEXT_PUBLIC_PRESENCE_INVITE_ONLY to "true"
 *
 * Anything else (unset, "true", "1", any other value) keeps signups open.
 *
 * NEXT_PUBLIC_* values are baked at build time on Vercel — change requires a
 * redeploy.
 */
export function isPublicSignupEnabled() {
  const inviteOnly = (process.env.NEXT_PUBLIC_PRESENCE_INVITE_ONLY ?? "").trim().toLowerCase();
  if (inviteOnly === "true" || inviteOnly === "1" || inviteOnly === "yes") {
    return false;
  }
  const allow = (process.env.NEXT_PUBLIC_PRESENCE_ALLOW_SIGNUPS ?? "").trim().toLowerCase();
  if (allow === "false" || allow === "0" || allow === "no" || allow === "off") {
    return false;
  }
  return true;
}

/**
 * Email verification gate.
 *
 * Default is non-blocking for current local/staging testing. Production can
 * recover the stricter flow by setting this env var to "true" and configuring
 * Supabase Site URL, redirect URLs, and the Confirm signup template.
 */
export function isEmailVerificationRequired() {
  const value = (
    process.env.NEXT_PUBLIC_PRESENCE_REQUIRE_EMAIL_VERIFICATION ?? ""
  )
    .trim()
    .toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

export function studioContactHref() {
  const value = process.env.NEXT_PUBLIC_PRESENCE_STUDIO_CONTACT?.trim();
  return value || "mailto:hello@presence.studio";
}
