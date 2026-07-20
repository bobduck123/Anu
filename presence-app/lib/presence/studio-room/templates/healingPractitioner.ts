import type { ThemeTokens } from "../model.ts";
import { buildTemplateKit, makeMoodPreset } from "./shared.ts";

const theme: ThemeTokens = {
  background: "#eef3e8",
  surface: "#fbf7ef",
  text: "#1e2a1f",
  muted: "#61715d",
  accent: "#567d55",
  radius: "round",
  fontHeading: "Cormorant Garamond, Georgia, serif",
  fontBody: "Inter, system-ui, sans-serif",
  motion: "gentle",
  spacing: "comfortable",
};

export const healingPractitionerKit = buildTemplateKit({
  id: "healing-practitioner",
  name: "Healing Practitioner",
  description: "A soft, grounded room for practitioners, cultural workers, coaches, and community care providers.",
  intendedUserTypes: ["practitioner", "cultural worker", "wellness provider", "coach", "community care provider"],
  sourceSlug: "rooms-community-healer",
  sourceLabel: "Mara Lin / Community Healer",
  themeTokens: theme,
  moodPreset: makeMoodPreset("soft-practice", "Soft Practice", "Sage paper tones, gentle motion, and care-first structure.", theme),
  chamberTitles: {
    field: { title: "Welcome threshold", summary: "A gentle first read for people deciding whether this room feels safe.", type: "threshold", mobileLabel: "Welcome" },
    wall: { title: "Practice atmosphere", summary: "Images or simple cards that establish the tone of care.", type: "gallery", mobileLabel: "Tone" },
    studio: { title: "Approach", summary: "Practice scope, care principles, and what people can expect.", type: "story", mobileLabel: "Approach" },
    card: { title: "Booking invitation", summary: "A calm path to begin a conversation.", type: "invitation", mobileLabel: "Booking" },
    services: { title: "Ways to work together", summary: "Sessions, circles, programmes, and formats.", type: "services", mobileLabel: "Services" },
    proof: { title: "Reflections", summary: "Public testimonials or outcomes, shown without pressure.", type: "proof", mobileLabel: "Proof" },
    credentials: { title: "Training and scope", summary: "Public qualifications and trust boundaries.", type: "proof", mobileLabel: "Training" },
    contact: { title: "Contact", summary: "Public ways to reach the practitioner.", type: "contact", mobileLabel: "Contact" },
  },
  ensureChambers: [
    { id: "portal", type: "portal", title: "Links", summary: "Optional public links for booking, practice notes, or community resources.", objectLabel: "Add public resource link", objectType: "link-card" },
  ],
  ctaStrategy: {
    label: "Begin a conversation",
    target: "booking",
    primaryChamberId: "card",
    appearsEarlyOnMobile: true,
  },
  requiredFields: ["practice line", "scope or approach", "services", "public contact or booking CTA"],
  optionalFields: ["testimonials", "credentials", "community resources", "location note"],
  copyScaffolds: [
    { field: "hero_title", label: "Name", placeholder: "Your name or practice name", required: true },
    { field: "hero_subtitle", label: "Care line", placeholder: "Somatic practice for individuals and small circles", required: true },
    { field: "practice_statement", label: "Approach", placeholder: "Explain what is held, what is in scope, and how people begin.", required: true },
    { field: "services", label: "Ways to work", placeholder: "Sessions, circles, programmes, or guided support." },
  ],
  previewNotes: [
    "Uses reduced, calm interaction principles from the liquid glass kit without adding decorative runtime effects.",
  ],
});
