import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding — Presence",
  description:
    "Shape your first Presence. Seven calm questions and we generate a private draft you can customise in Studio.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
