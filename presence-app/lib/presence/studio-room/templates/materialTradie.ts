import type { ThemeTokens } from "../model.ts";
import { buildTemplateKit, makeMoodPreset } from "./shared.ts";

const theme: ThemeTokens = {
  background: "#f2eadf",
  surface: "#fff8ec",
  text: "#24170f",
  muted: "#735f4a",
  accent: "#a85221",
  radius: "soft",
  fontHeading: "Inter Tight, Inter, system-ui, sans-serif",
  fontBody: "Inter, system-ui, sans-serif",
  motion: "gentle",
  spacing: "comfortable",
};

export const materialTradieKit = buildTemplateKit({
  id: "material-tradie-proof-card",
  name: "Material / Tradie Proof Card",
  description: "A practical trust-first room for tradies, makers, contractors, and hands-on service providers.",
  intendedUserTypes: ["tradie", "maker", "craftsperson", "contractor", "local service provider"],
  sourceSlug: "rooms-local-carpenter",
  sourceLabel: "Dave Carpentry / Local Carpenter",
  themeTokens: theme,
  moodPreset: makeMoodPreset("warm-proof-card", "Warm Proof Card", "Grounded timber warmth, practical proof, and clear quote action.", theme),
  chamberTitles: {
    field: { title: "Quick intro", summary: "What you do, where you work, and how fast people can act.", type: "threshold", mobileLabel: "Start" },
    wall: { title: "Work proof", summary: "Before, after, and recent proof of real work.", type: "gallery", mobileLabel: "Proof" },
    studio: { title: "How the work happens", summary: "Plain-language process and working style.", type: "story", mobileLabel: "Process" },
    card: { title: "Quote invitation", summary: "The direct path to quote or booking.", type: "invitation", mobileLabel: "Quote" },
    services: { title: "Services", summary: "Clear offers with price and timing where available.", type: "services", mobileLabel: "Services" },
    proof: { title: "Local trust", summary: "Testimonials and outcomes from real jobs.", type: "proof", mobileLabel: "Trust" },
    credentials: { title: "Credentials", summary: "Licences, insurance, and public trust markers.", type: "proof", mobileLabel: "Credentials" },
    contact: { title: "Contact", summary: "Public ways to request a quote.", type: "contact", mobileLabel: "Contact" },
  },
  ensureChambers: [
    { id: "portal", type: "portal", title: "Links", summary: "Optional public links for reviews, licence checks, or booking pages.", objectLabel: "Add public proof link", objectType: "link-card" },
  ],
  ctaStrategy: {
    label: "Get a quote",
    target: "quote",
    primaryChamberId: "card",
    appearsEarlyOnMobile: true,
  },
  requiredFields: ["service area", "public contact", "services", "proof image", "quote CTA"],
  optionalFields: ["licence", "insurance", "review link", "before/after caption"],
  copyScaffolds: [
    { field: "hero_title", label: "Promise", placeholder: "Quotes within 24 hours", required: true },
    { field: "hero_subtitle", label: "Service line", placeholder: "Decks, repairs, renovations, and local jobs", required: true },
    { field: "services", label: "Service cards", placeholder: "Name the job, price range, and timing.", required: true },
    { field: "credentials", label: "Trust markers", placeholder: "Licence, insurance, or professional registration." },
  ],
  previewNotes: [
    "Draws from material proof and object-card references: tactile surfaces, readable proof cards, no freeform layout.",
  ],
});
