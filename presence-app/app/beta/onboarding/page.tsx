import { redirect } from "next/navigation";
import type { Metadata } from "next";

// /beta/onboarding is preserved as a backwards-compatible redirect to the
// canonical /onboarding wizard route. Old emails, links, and bookmarks
// continue to work; no language about "beta application review" remains.
export const metadata: Metadata = {
  title: "Onboarding — Presence",
  description: "Redirecting to /onboarding…",
};

export default function BetaOnboardingPage() {
  redirect("/onboarding");
}
