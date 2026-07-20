// fetchDemoOrPublicNode — wraps the real public node fetch.
// Order: real backend → demo fixture (this layer is removable).
//
// The real backend response always wins. Demo fixtures only fill in for
// the six Presence DNA demo slugs that don't yet exist in the backend.
// When the backend persists these slugs as real PresenceNodes, the
// demo branch silently retires.

import { fetchPublicNode } from "@/lib/api/public";
import type { PresenceNode } from "@/lib/api/types";
import { canonicalPublicUrl } from "@/lib/presence/url";
import { demoProfileForSlug } from "./profiles";
import { isDemoProfileFallbackDisabled } from "@/lib/presence/feature";
import { canUsePublicDemoProfileFallback } from "@/lib/presence/publicContainment";

export async function fetchDemoOrPublicNode(slug: string): Promise<PresenceNode> {
  try {
    return await fetchPublicNode(slug);
  } catch (err) {
    if (isDemoProfileFallbackDisabled() || !canUsePublicDemoProfileFallback(slug)) {
      throw err;
    }
    const demo = demoProfileForSlug(slug);
    if (demo) {
      // Attach the canonical public URL the same way the backend would,
      // so downstream code (metadata, JSON-LD, share tools) keeps
      // working unchanged.
      return {
        ...demo,
        public_url: canonicalPublicUrl(demo.slug),
        seo: {
          title: demo.display_name,
          description: demo.headline ?? demo.short_bio ?? "",
          canonical_url: canonicalPublicUrl(demo.slug),
          image: demo.hero_image_url ?? demo.cover_image_url ?? null,
        },
      };
    }
    throw err;
  }
}

export function isDemoSlug(slug: string): boolean {
  return demoProfileForSlug(slug) !== null;
}
