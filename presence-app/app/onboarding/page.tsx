import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presence Studio - Set the direction",
  description:
    "Redirecting to the public Presence Studio setup flow. Nothing is published until you say so.",
};

export default function OnboardingPage() {
  redirect("/presence-chooser");
}
