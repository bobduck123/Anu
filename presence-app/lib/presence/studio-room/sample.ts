import {
  PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
  type MoodPreset,
  type Room,
  type TemplateKit,
  type ThemeTokens,
} from "./model.ts";

export const SAMPLE_THEME_TOKENS: ThemeTokens = {
  background: "#f7f2e9",
  surface: "#fffaf0",
  text: "#2d271f",
  muted: "#746957",
  accent: "#b87938",
  radius: "round",
  fontHeading: "Editorial",
  fontBody: "Inter",
  motion: "gentle",
  spacing: "gallery",
};

export const SAMPLE_MOOD_PRESETS: MoodPreset[] = [
  {
    id: "paper-room",
    label: "Paper Room",
    description: "Warm paper, low noise, gallery-paced movement.",
    tokens: SAMPLE_THEME_TOKENS,
  },
  {
    id: "ink-room",
    label: "Ink Room",
    description: "High contrast ink and quiet motion.",
    tokens: {
      background: "#15120f",
      surface: "#211d18",
      text: "#fff9ee",
      muted: "#c7bda9",
      accent: "#f1b15c",
      motion: "still",
    },
  },
];

export const SAMPLE_TEMPLATE_KIT: TemplateKit = {
  id: "artist-room-kit",
  label: "Artist Room Kit",
  description: "Entrance, work wall and invitation objects for an artist room.",
  chamberTypes: ["entrance", "gallery"],
  objectTypes: ["text", "image", "cta"],
  defaultMoodPresetId: "paper-room",
};

export const SAMPLE_ROOM: Room = {
  schemaVersion: PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
  id: "room-sample-ggm",
  slug: "sample-presence-room",
  title: "Sample Presence Room",
  state: "published",
  entryChamberId: "entrance",
  theme: SAMPLE_THEME_TOKENS,
  rendererConfig: {
    renderer: "studio-room-basic",
    layout: "single-scroll",
    mobileLayout: "stacked",
    reducedMotion: false,
    objectOpenMode: "sheet",
  },
  moodPresetId: "paper-room",
  templateKitId: SAMPLE_TEMPLATE_KIT.id,
  chambers: [
    {
      id: "entrance",
      type: "entrance",
      title: "Entrance",
      summary: "The first touch of the room.",
      mobile: { layout: "stack", order: 1, label: "Start" },
      objects: [
        {
          id: "hero-text",
          type: "text",
          label: "Room title",
          required: true,
          content: {
            title: "Christina Kerkvliet Goddard",
            body: "A living room for artworks, memory colours and studio invitations.",
          },
          mobile: { order: 1, label: "Title" },
          editorOnly: { editablePaths: ["chambers.0.objects.0.content"] },
        },
        {
          id: "invitation",
          type: "cta",
          label: "Invitation",
          content: {
            action: { label: "Begin a conversation", href: "/enquire" },
          },
          mobile: { order: 3, label: "Invitation" },
        },
      ],
    },
    {
      id: "work-wall",
      type: "gallery",
      title: "Work Wall",
      summary: "A focused wall of selected work.",
      mobile: { layout: "carousel", order: 2, label: "Works" },
      objects: [
        {
          id: "cover-image",
          type: "image",
          label: "Cover image",
          required: true,
          content: {
            image: {
              src: "/ggm/works/bridle-road-2005.webp",
              alt: "A textured green and cream landscape painting.",
            },
          },
          mobile: { order: 2, aspectRatio: "portrait" },
          internal: { source: "sample-fixture" },
        },
      ],
      editorOnly: { staffNotes: "Pilot sample chamber." },
    },
  ],
  editorOnly: {
    draftNotes: "Sample only. Do not expose this note publicly.",
    lastSelectedObjectId: "hero-text",
  },
  internal: {
    auditId: "sample-internal-audit",
  },
};
