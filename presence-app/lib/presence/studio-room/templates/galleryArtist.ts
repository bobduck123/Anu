import type { ThemeTokens } from "../model.ts";
import { buildTemplateKit, makeMoodPreset } from "./shared.ts";

const theme: ThemeTokens = {
  background: "#f7f3ea",
  surface: "#fffdf7",
  text: "#191815",
  muted: "#746f63",
  accent: "#8f6f3f",
  radius: "round",
  fontHeading: "Cormorant Garamond, Georgia, serif",
  fontBody: "Inter, system-ui, sans-serif",
  motion: "gentle",
  spacing: "gallery",
};

export const galleryArtistKit = buildTemplateKit({
  id: "gallery-artist",
  name: "Gallery Artist",
  description: "A quiet editorial gallery room for artists, photographers, designers, and portfolio-led creative practices.",
  intendedUserTypes: ["artist", "photographer", "designer", "gallery creative", "portfolio practice"],
  sourceSlug: "rooms-gallery-painter",
  sourceLabel: "Naoko Sato / Gallery Painter",
  themeTokens: theme,
  moodPreset: makeMoodPreset("paper-gallery", "Paper Gallery", "Warm gallery paper, serif display type, and low-noise movement.", theme),
  chamberTitles: {
    field: { title: "Threshold", summary: "A calm first view with name, work direction, and commission invitation.", type: "threshold", mobileLabel: "Start" },
    wall: { title: "Selected works", summary: "A compact wall of representative pieces.", type: "gallery", mobileLabel: "Works" },
    studio: { title: "Statement", summary: "Practice, process, and the story behind the work.", type: "story", mobileLabel: "Story" },
    card: { title: "Commission invitation", summary: "The primary path for starting a conversation.", type: "invitation", mobileLabel: "Commission" },
    proof: { title: "Proof", summary: "Collection notes, testimonials, and trust markers.", type: "proof", mobileLabel: "Proof" },
    portal: { title: "Links", summary: "Public paths connected to the artist's wider practice.", type: "portal", mobileLabel: "Links" },
    contact: { title: "Contact", summary: "Public ways to reach the studio.", type: "contact", mobileLabel: "Contact" },
  },
  ctaStrategy: {
    label: "Commission a work",
    target: "commission",
    primaryChamberId: "card",
    appearsEarlyOnMobile: true,
  },
  requiredFields: ["display name", "hero statement", "cover image", "at least three selected works", "commission or contact CTA"],
  optionalFields: ["proof quote", "press link", "credential", "location note"],
  copyScaffolds: [
    { field: "hero_title", label: "Room title", placeholder: "Your name or studio name", required: true },
    { field: "hero_subtitle", label: "Short practice line", placeholder: "Paintings, commissions, and selected works", required: true },
    { field: "practice_statement", label: "Statement", placeholder: "Describe the material, process, and pace of the work." },
    { field: "primary_cta_label", label: "Invitation", placeholder: "Commission a work", required: true },
  ],
  previewNotes: [
    "Inspired by the editorial-fashion-slider and time-traveling-art-gallery references: quiet lookbook rhythm, visible work wall, early CTA.",
  ],
});
