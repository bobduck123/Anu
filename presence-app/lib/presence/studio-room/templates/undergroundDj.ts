import type { ThemeTokens } from "../model.ts";
import { buildTemplateKit, makeMoodPreset } from "./shared.ts";

const theme: ThemeTokens = {
  background: "#0e0d15",
  surface: "#171625",
  text: "#fff7d6",
  muted: "#b5abd1",
  accent: "#ffd84d",
  radius: "round",
  fontHeading: "Unbounded, Inter, system-ui, sans-serif",
  fontBody: "Space Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
  motion: "living",
  spacing: "compact",
};

export const undergroundDjKit = buildTemplateKit({
  id: "underground-dj-portal",
  name: "Underground DJ / Minimal Performer Portal",
  description: "A compact performer portal for bookings, selected signals, and public links. Media embeds remain deferred.",
  intendedUserTypes: ["DJ", "musician", "performer", "selector", "release-led creative"],
  sourceSlug: "rooms-underground-dj",
  sourceLabel: "Mira K. / Underground DJ",
  themeTokens: theme,
  moodPreset: makeMoodPreset("nocturnal-signal", "Nocturnal Signal", "Dark signal room with high contrast links and guarded motion.", theme),
  supportState: "candidate",
  chamberTitles: {
    field: { title: "Signal threshold", summary: "Who is playing, where they move, and what booking is open.", type: "threshold", mobileLabel: "Signal" },
    wall: { title: "Signals", summary: "Selected performance images or release placeholders.", type: "gallery", mobileLabel: "Signals" },
    studio: { title: "Room notes", summary: "Booking conditions, style notes, and set context.", type: "story", mobileLabel: "Notes" },
    card: { title: "Booking portal", summary: "The direct route for booking or press conversation.", type: "invitation", mobileLabel: "Booking" },
    portal: { title: "Links", summary: "Public music, social, and press kit links.", type: "portal", mobileLabel: "Links" },
    contact: { title: "Contact", summary: "Public booking contact.", type: "contact", mobileLabel: "Contact" },
  },
  ctaStrategy: {
    label: "Book the room",
    target: "booking",
    primaryChamberId: "card",
    appearsEarlyOnMobile: true,
  },
  requiredFields: ["performer name", "booking line", "public contact or booking link", "at least one public link"],
  optionalFields: ["press kit", "release link", "tour dates", "performance image"],
  copyScaffolds: [
    { field: "hero_title", label: "Name", placeholder: "Artist or project name", required: true },
    { field: "hero_subtitle", label: "Signal line", placeholder: "Selector, performer, long-form room holder", required: true },
    { field: "links", label: "Public links", placeholder: "Music, press kit, booking, or social links.", required: true },
  ],
  deferredFields: ["media embeds", "audio player"],
  previewNotes: [
    "Candidate only: the current renderer supports portal cards, not live audio embeds.",
  ],
});
