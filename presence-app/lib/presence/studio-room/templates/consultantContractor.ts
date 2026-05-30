import type { ThemeTokens } from "../model.ts";
import { buildTemplateKit, makeMoodPreset } from "./shared.ts";

const theme: ThemeTokens = {
  background: "#f3f1ed",
  surface: "#ffffff",
  text: "#111111",
  muted: "#5f5f5b",
  accent: "#111111",
  radius: "sharp",
  fontHeading: "Inter Tight, Inter, system-ui, sans-serif",
  fontBody: "Inter, system-ui, sans-serif",
  motion: "still",
  spacing: "compact",
};

export const consultantContractorKit = buildTemplateKit({
  id: "consultant-contractor",
  name: "Consultant / Contractor",
  description: "A crisp advisory room for independent consultants, specialists, and project-based professionals.",
  intendedUserTypes: ["consultant", "contractor", "specialist", "independent professional", "advisor"],
  sourceSlug: "rooms-sharp-consultant",
  sourceLabel: "Heron Strategy / Sharp Consultant",
  themeTokens: theme,
  moodPreset: makeMoodPreset("ink-advisory", "Ink Advisory", "High-clarity typography, low motion, and proof-forward structure.", theme),
  chamberTitles: {
    field: { title: "Value proposition", summary: "The clearest version of who this is for and what decision it helps.", type: "threshold", mobileLabel: "Start" },
    wall: { title: "Case proof", summary: "Selected work proof, outcomes, or representative case material.", type: "gallery", mobileLabel: "Cases" },
    studio: { title: "Operating method", summary: "How engagements are scoped and delivered.", type: "story", mobileLabel: "Method" },
    card: { title: "Project conversation", summary: "The direct route to a qualified enquiry.", type: "invitation", mobileLabel: "Contact" },
    services: { title: "Offers", summary: "Engagement types, ranges, and timelines.", type: "services", mobileLabel: "Offers" },
    proof: { title: "Proof", summary: "Public trust signals, testimonials, or outcomes.", type: "proof", mobileLabel: "Proof" },
    portal: { title: "Links", summary: "Selected writing or public professional links.", type: "portal", mobileLabel: "Links" },
    contact: { title: "Contact", summary: "Public ways to open a project conversation.", type: "contact", mobileLabel: "Contact" },
  },
  ensureChambers: [
    { id: "credentials", type: "proof", title: "Credentials", summary: "Optional public credentials, roles, awards, or affiliations.", objectLabel: "Add credential", objectType: "credential" },
  ],
  ctaStrategy: {
    label: "Open a project conversation",
    target: "project",
    primaryChamberId: "card",
    appearsEarlyOnMobile: true,
  },
  requiredFields: ["value proposition", "services or offers", "proof signal", "project CTA"],
  optionalFields: ["case study", "selected writing", "credentials", "board or advisory roles"],
  copyScaffolds: [
    { field: "hero_title", label: "Value proposition", placeholder: "Independent advisory for product-led companies", required: true },
    { field: "practice_statement", label: "Method", placeholder: "Describe the engagement shape and decision output.", required: true },
    { field: "services", label: "Offers", placeholder: "Name the engagement, time range, and expected output.", required: true },
    { field: "proof_items", label: "Proof", placeholder: "Add outcomes, testimonials, or anonymous public proof." },
  ],
  previewNotes: [
    "Inspired by premium dark/light landing references: single clear promise, restrained motion, proof before decoration.",
  ],
});
