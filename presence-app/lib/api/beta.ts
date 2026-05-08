import { ownerFetch } from "./client";

export interface BetaApplicationInput {
  display_name: string;
  desired_slug?: string | null;
  presence_type?: string | null;
  primary_purpose?: string | null;
  primary_cta?: string | null;
  template_direction?: string | null;
  visual_mood?: string | null;
  location_label?: string | null;
  headline?: string | null;
  description?: string | null;
  beta_mode?: "setup_request" | "studio_assisted" | "draft_self_build";
}

export interface BetaApplicationResult {
  id: number;
  display_name: string | null;
  desired_slug: string | null;
  presence_type: string | null;
  primary_purpose: string | null;
  primary_cta: string | null;
  template_direction: string | null;
  visual_mood: string | null;
  status: string;
  beta_mode: string;
  created_at: string | null;
}

/**
 * Persist a public-beta setup request server-side. Requires a verified
 * Supabase access token. The endpoint stores intent only; it does NOT
 * create a PresenceNode and does NOT assign ownership.
 */
export function submitBetaApplication(
  token: string,
  payload: BetaApplicationInput,
): Promise<BetaApplicationResult> {
  return ownerFetch<BetaApplicationResult>(
    "/api/presence/beta/applications",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ── v1.1: Safe self-service draft creation ─────────────────────────────────

export interface BetaStartResult {
  id: number;
  slug: string;
  display_name: string;
  status: string;          // always "draft"
  visibility: string;      // always "private"
  display_mode: string;
  visual_mood: string | null;
  theme_config?: { beta_intent?: Record<string, unknown> };
  public_url?: string;
}

/**
 * Create one DRAFT, PRIVATE, UNPUBLISHED Presence for the calling user.
 * Used by /beta/onboarding when the user chooses self-build mode.
 *
 * Throws PresenceApiError with `code === "duplicate_slug"` (409) or
 * `code === "duplicate_starter"` (409) when the user already has a Presence.
 */
export function startBetaPresence(
  token: string,
  payload: BetaApplicationInput,
): Promise<BetaStartResult> {
  return ownerFetch<BetaStartResult>(
    "/api/presence/owner/beta/start",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
