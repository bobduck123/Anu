// buildRoomGraph — turn a PresenceNode + RoomWorld into a RoomGraph.
//
// The chambers and exits are scripted per world type so navigation
// always reads as a real spatial walk (Threshold → Forward into a
// space, Left/Right into adjacent rooms). Objects are pulled from
// real PresenceNode content; nothing is fabricated.

import type { PresenceNode, PresenceWork, PresenceService } from "@/lib/api/types";
import type { RoomWorld } from "./types";
import type {
  RoomChamberDef,
  RoomExit,
  RoomGraph,
  RoomObjectDef,
} from "./graph";

function visibleWorks(node: PresenceNode): PresenceWork[] {
  return (node.works ?? node.gallery_items ?? []).filter((w) => w.is_visible !== false);
}
function visibleServices(node: PresenceNode): PresenceService[] {
  return (node.services ?? []).filter((s) => s.is_visible !== false);
}
function visibleProof(node: PresenceNode) {
  return (node.proof_items ?? []).filter((p) => p.testimonial || p.title || p.outcome);
}

function workObject(node: PresenceNode, work: PresenceWork, i: number): RoomObjectDef {
  return {
    id: `work-${work.id ?? work.slug ?? i}`,
    kind: "work",
    title: work.title,
    summary: [work.year, work.medium].filter(Boolean).join(" · ") || undefined,
    media: {
      imageUrl: work.thumbnail_url ?? work.image_url ?? null,
      caption: work.dimensions ?? null,
      meta: work.availability_status ?? null,
      href: `/p/${node.slug}/works/${work.id ?? work.slug ?? i}`,
    },
    action: {
      kind: "open_panel",
      href: `/p/${node.slug}/works/${work.id ?? work.slug ?? i}`,
    },
    position: i % 2 === 0 ? "left-wall" : "right-wall",
  };
}

function audioObject(embed: { label?: string | null; url: string; provider?: string | null }, i: number): RoomObjectDef {
  return {
    id: `audio-${i}`,
    kind: "audio",
    title: embed.label ?? embed.provider ?? `Recording ${i + 1}`,
    summary: embed.provider ?? undefined,
    media: { audioUrl: embed.url, meta: embed.provider ?? null, href: embed.url },
    action: { kind: "play", href: embed.url },
    position: "center",
  };
}

function serviceObject(service: PresenceService, i: number): RoomObjectDef {
  return {
    id: `service-${service.id ?? i}`,
    kind: "service",
    title: service.title,
    summary: service.description ?? undefined,
    media: { meta: [service.price_label, service.duration_label].filter(Boolean).join(" · ") || null },
    action: service.cta_url ? { kind: "open_url", href: service.cta_url } : { kind: "open_panel" },
    position: i % 2 === 0 ? "left-wall" : "right-wall",
  };
}

function testimonialObject(item: { id?: number; client_label?: string | null; testimonial?: string | null; outcome?: string | null }, i: number): RoomObjectDef {
  return {
    id: `proof-${item.id ?? i}`,
    kind: "memory",
    title: item.client_label ?? "Note",
    summary: item.testimonial ?? undefined,
    media: { meta: item.outcome ?? null },
    action: { kind: "open_panel" },
    position: i % 2 === 0 ? "left-wall" : "right-wall",
  };
}

function ctaObject(node: PresenceNode, label: string): RoomObjectDef {
  return {
    id: "cta",
    kind: "booking",
    title: label,
    summary: node.primary_cta_url ? "Direct link" : "Open the studio enquiry",
    action: node.primary_cta_url ? { kind: "open_url", href: node.primary_cta_url } : { kind: "open_enquiry" },
    position: "portal",
  };
}

function statementObject(node: PresenceNode): RoomObjectDef | null {
  const text = node.long_story || node.practice_statement || node.bio || node.short_bio || "";
  if (!text) return null;
  return {
    id: "statement",
    kind: "statement",
    title: "Wall text",
    summary: text.slice(0, 140) + (text.length > 140 ? "…" : ""),
    media: { caption: text },
    action: { kind: "open_panel" },
    position: "center",
  };
}

function exit(direction: RoomExit["direction"], targetChamberId: string, label?: string, transition?: RoomExit["transition"]): RoomExit {
  return { direction, targetChamberId, label, transition };
}

// ---------------------------------------------------------------------------
// World-specific graph builders
// ---------------------------------------------------------------------------
function buildGalleryGraph(node: PresenceNode, label: string): RoomGraph {
  const works = visibleWorks(node);
  const services = visibleServices(node);
  const proof = visibleProof(node);
  const statement = statementObject(node);

  const chambers: RoomChamberDef[] = [];

  chambers.push({
    id: "threshold",
    title: "Threshold",
    role: "threshold",
    caption: node.headline ?? "Enter the quiet gallery.",
    atmosphere: "quiet_gallery",
    objects: [],
    exits: [
      exit("forward", "wall", "Enter the gallery", "push"),
      exit("right", "commission", "To commission desk", "turn"),
    ],
  });

  chambers.push({
    id: "wall",
    title: "Wall",
    role: "gallery",
    caption: "Works hung this season. Tap a piece to inspect.",
    atmosphere: "quiet_gallery",
    objects: works.map((w, i) => workObject(node, w, i)),
    exits: [
      exit("forward", "wall-text", "To the wall text", "push"),
      exit("left", "threshold", "Back to threshold", "turn"),
      exit("right", "commission", "To commission desk", "turn"),
      exit("back", "threshold", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "wall-text",
    title: "Wall text",
    role: "statement",
    caption: "The studio note for this season.",
    atmosphere: "quiet_gallery",
    objects: statement ? [statement] : [],
    exits: [
      exit("left", "wall", "Back to the wall", "turn"),
      exit("right", "notes", "To collector notes", "turn"),
      exit("back", "wall", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "commission",
    title: "Commission desk",
    role: "services",
    caption: "Begin a commission — one per year.",
    atmosphere: "quiet_gallery",
    objects: [
      ...services.map((s, i) => serviceObject(s, i)),
      ctaObject(node, "Begin a commission"),
    ],
    exits: [
      exit("left", "threshold", "Back to threshold", "turn"),
      exit("forward", "notes", "To collector notes", "push"),
      exit("back", "threshold", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "notes",
    title: "Collector notes",
    role: "archive",
    caption: "Held by collectors and visitors.",
    atmosphere: "quiet_gallery",
    objects: proof.map((p, i) => testimonialObject(p, i)),
    exits: [
      exit("left", "commission", "Back to commission desk", "turn"),
      exit("right", "wall", "Back to the wall", "turn"),
      exit("back", "commission", "Step back", "retreat"),
    ],
  });

  return { id: `gallery-${node.slug}`, entryChamberId: "threshold", chambers };
}

function buildSoundGraph(node: PresenceNode, label: string): RoomGraph {
  const works = visibleWorks(node);
  const embeds = node.media_embeds ?? [];
  const proof = visibleProof(node);
  const statement = statementObject(node);

  const chambers: RoomChamberDef[] = [];

  chambers.push({
    id: "threshold",
    title: "Threshold",
    role: "threshold",
    caption: node.headline ?? "Step into the signal room.",
    atmosphere: "nocturnal",
    objects: [],
    exits: [
      exit("forward", "booth", "Into the booth", "push"),
      exit("right", "booking", "To booking", "turn"),
    ],
  });

  chambers.push({
    id: "booth",
    title: "Booth",
    role: "booth",
    caption: "Listen back. Tap a deck to play.",
    atmosphere: "nocturnal",
    objects: embeds.map((e, i) => audioObject(e, i)),
    exits: [
      exit("forward", "signal-wall", "To the signal wall", "push"),
      exit("left", "threshold", "Back to threshold", "turn"),
      exit("right", "archive", "To the archive", "turn"),
      exit("back", "threshold", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "signal-wall",
    title: "Signal wall",
    role: "gallery",
    caption: "Rooms played. Tap a tile to inspect.",
    atmosphere: "nocturnal",
    objects: works.map((w, i) => workObject(node, w, i)),
    exits: [
      exit("left", "booth", "Back to the booth", "turn"),
      exit("right", "booking", "To booking", "turn"),
      exit("back", "booth", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "archive",
    title: "Archive",
    role: "archive",
    caption: "Field notes and the rooms held.",
    atmosphere: "nocturnal",
    objects: [
      ...(statement ? [statement] : []),
      ...proof.map((p, i) => testimonialObject(p, i)),
    ],
    exits: [
      exit("left", "booth", "Back to the booth", "turn"),
      exit("forward", "booking", "To booking", "push"),
      exit("back", "booth", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "booking",
    title: "Booking",
    role: "booking",
    caption: "Direct enquiries for sets, residencies, takeovers.",
    atmosphere: "nocturnal",
    objects: [ctaObject(node, "Book the room")],
    exits: [
      exit("left", "archive", "Back to the archive", "turn"),
      exit("back", "threshold", "Step back to threshold", "retreat"),
    ],
  });

  return { id: `sound-${node.slug}`, entryChamberId: "threshold", chambers };
}

function buildStudioGraph(node: PresenceNode, label: string): RoomGraph {
  const works = visibleWorks(node);
  const services = visibleServices(node);
  const proof = visibleProof(node);

  const chambers: RoomChamberDef[] = [];

  chambers.push({
    id: "workbench",
    title: "Workbench",
    role: "studio",
    caption: node.headline ?? "Step around the bench.",
    atmosphere: "warm_material",
    objects: [],
    exits: [
      exit("forward", "shelf", "To the shelf", "push"),
      exit("right", "pathway", "To the pathway", "turn"),
    ],
  });

  chambers.push({
    id: "shelf",
    title: "Shelf",
    role: "gallery",
    caption: "Recent commissions.",
    atmosphere: "warm_material",
    objects: works.map((w, i) => workObject(node, w, i)),
    exits: [
      exit("left", "workbench", "Back to the workbench", "turn"),
      exit("forward", "pathway", "To the pathway", "push"),
      exit("right", "appreciation", "To the appreciation deck", "turn"),
      exit("back", "workbench", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "pathway",
    title: "Pathway",
    role: "services",
    caption: "How a piece is made.",
    atmosphere: "warm_material",
    objects: services.map((s, i) => serviceObject(s, i)),
    exits: [
      exit("left", "shelf", "Back to the shelf", "turn"),
      exit("forward", "commission", "To the commission door", "push"),
      exit("right", "appreciation", "To the appreciation deck", "turn"),
      exit("back", "shelf", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "appreciation",
    title: "Held by",
    role: "archive",
    caption: "Notes from the workshop.",
    atmosphere: "warm_material",
    objects: proof.map((p, i) => testimonialObject(p, i)),
    exits: [
      exit("left", "pathway", "Back to the pathway", "turn"),
      exit("right", "shelf", "Back to the shelf", "turn"),
      exit("back", "pathway", "Step back", "retreat"),
    ],
  });

  chambers.push({
    id: "commission",
    title: "Commission",
    role: "booking",
    caption: "Begin a piece.",
    atmosphere: "warm_material",
    objects: [ctaObject(node, "Begin a commission")],
    exits: [
      exit("left", "pathway", "Back to the pathway", "turn"),
      exit("back", "workbench", "Step back to the workbench", "retreat"),
    ],
  });

  return { id: `studio-${node.slug}`, entryChamberId: "workbench", chambers };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function buildRoomGraph(node: PresenceNode, world: RoomWorld, displayLabel: string): RoomGraph {
  switch (world.world_type) {
    case "sound_room":
    case "club_wall":
      return buildSoundGraph(node, displayLabel);
    case "material_studio":
    case "commission_studio":
      return buildStudioGraph(node, displayLabel);
    case "gallery_room":
    default:
      return buildGalleryGraph(node, displayLabel);
  }
}
