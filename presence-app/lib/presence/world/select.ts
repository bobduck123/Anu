// DNA → RoomWorld selection. Pass 3.
//
// The room world is chosen from DNA (not profession), then the chambers
// and room-objects are populated from the PresenceNode's actual content
// (works, services, media_embeds, proof_items, credentials, etc.).
// The select function is pure — given the same DNA + node, it returns
// the same RoomWorld.

import type { PresenceNode, PresenceWork, PresenceService } from "@/lib/api/types";
import type { PresenceDna } from "@/lib/presence/dna/types";
import type {
  RoomWorld,
  RoomObject,
  RoomChamber,
  WorldType,
  WorldNavigationModel,
  WorldAtmosphere,
  WorldSpatialDepth,
  WorldTransitionStyle,
  MobileRoomNavMode,
} from "./types";

function visibleWorks(node: PresenceNode): PresenceWork[] {
  return (node.works ?? node.gallery_items ?? []).filter((w) => w.is_visible !== false);
}
function visibleServices(node: PresenceNode): PresenceService[] {
  return (node.services ?? []).filter((s) => s.is_visible !== false);
}
function visibleProof(node: PresenceNode) {
  return (node.proof_items ?? []).filter((p) => p.testimonial || p.title || p.outcome);
}

// ---------------------------------------------------------------------------
// World type & navigation
// ---------------------------------------------------------------------------
function pickWorldType(dna: PresenceDna): WorldType {
  // Signature-led when the room has committed at hero level
  if (dna.signature.signature_intensity === "hero_level") {
    switch (dna.signature.signature_module) {
      case "gallery_wall":     return "gallery_room";
      case "glitch_gallery":   return "sound_room";
      case "audio_strip":      return "sound_room";
      case "materials_board":  return "material_studio";
      case "before_after_slider": return "trust_workshop";
      case "ritual_booking_panel": return "care_sanctuary";
      case "program_grid":     return "venue_foyer";
      case "archive_wall":     return "archive_room";
      case "map_memory":       return "map_room";
      case "quote_oracle":     return "consultation_office";
    }
  }
  // Practice-led fallback
  switch (dna.practice.field) {
    case "music":     return "sound_room";
    case "visual_art": return "gallery_room";
    case "building_trade":
      return dna.personality.status_signal === "craft" ? "material_studio" : "trust_workshop";
    case "healing":    return "care_sanctuary";
    case "consulting": return "consultation_office";
    case "hospitality": return "venue_foyer";
    case "culture":
    case "community":  return "venue_foyer";
    case "design":     return "commission_studio";
    case "education":  return "venue_foyer";
    default:           return "gallery_room";
  }
}

function pickNavigation(world: WorldType, dna: PresenceDna): WorldNavigationModel {
  switch (world) {
    case "gallery_room":
      return "wall_panels";
    case "sound_room":
    case "club_wall":
      return "spatial_chambers";
    case "material_studio":
    case "commission_studio":
      return "desk_surface";
    case "trust_workshop":
      return dna.proof.proof_density === "heavy" ? "wall_panels" : "spatial_chambers";
    case "archive_room":
      return "archive_drawers";
    case "care_sanctuary":
      return "spatial_chambers";
    case "consultation_office":
      return "spatial_chambers";
    case "venue_foyer":
      return "portal_cards";
    case "field_room":
      return "spatial_chambers";
    case "map_room":
      return "floorplan";
    default:
      return "spatial_chambers";
  }
}

function pickAtmosphere(dna: PresenceDna): WorldAtmosphere {
  switch (dna.visual.palette_mode) {
    case "nocturnal":      return "nocturnal";
    case "gallery_white":  return "quiet_gallery";
    case "material_based": return "warm_material";
    case "cultural":       return "ritual";
    case "soft_gradient":  return "soft_care";
    case "monochrome":     return "industrial_editorial";
    case "cinematic":      return "cinematic";
  }
  if (dna.practice.field === "culture" || dna.practice.field === "community") return "civic_field";
  if (dna.practice.field === "building_trade" && dna.personality.status_signal === "craft") return "warm_material";
  return "quiet_gallery";
}

function pickSpatialDepth(dna: PresenceDna): WorldSpatialDepth {
  if (dna.signature.signature_intensity === "hero_level") return "pseudo_3d";
  if (dna.personality.energy === "still") return "flat_art_directed";
  if (dna.personality.energy === "dense") return "layered_2d";
  return "layered_2d";
}

function pickTransition(dna: PresenceDna): WorldTransitionStyle {
  if (dna.visual.image_treatment === "glitch") return "glitch";
  if (dna.composition.section_rhythm === "cinematic_chapters") return "zoom";
  if (dna.composition.section_rhythm === "gallery_flow") return "fade";
  if (dna.composition.section_rhythm === "collage") return "slide";
  if (dna.composition.section_rhythm === "service_ladder") return "snap";
  if (dna.composition.section_rhythm === "case_study_stack") return "drawer";
  return "fade";
}

function pickMobileNav(navigation: WorldNavigationModel): MobileRoomNavMode {
  switch (navigation) {
    case "spatial_chambers":
    case "scene_stack":
      return "room_dock";
    case "wall_panels":
    case "horizontal_gallery":
      return "portal_sheet";
    case "desk_surface":
    case "object_orbit":
      return "room_dock";
    case "archive_drawers":
    case "portal_cards":
      return "portal_sheet";
    case "floorplan":
    case "radial_index":
      return "room_dock";
  }
}

// ---------------------------------------------------------------------------
// Chambers
// ---------------------------------------------------------------------------
function pickChambers(world: WorldType, dna: PresenceDna, node: PresenceNode): RoomChamber[] {
  const hasAudio = (node.media_embeds ?? []).length > 0;
  const hasWorks = visibleWorks(node).length > 0;
  const hasServices = visibleServices(node).length > 0;
  const hasProof = visibleProof(node).length > 0;

  switch (world) {
    case "sound_room":
    case "club_wall": {
      const ch: RoomChamber[] = [{ id: "threshold", label: "Threshold", glyph: "00", summary: "Step into the room" }];
      if (hasAudio) ch.push({ id: "booth", label: "Booth", glyph: "01", summary: "Listen back" });
      if (hasWorks) ch.push({ id: "signal-wall", label: "Signal wall", glyph: "02", summary: "Rooms played" });
      ch.push({ id: "archive", label: "Archive", glyph: "03", summary: "Notes on the room" });
      ch.push({ id: "booking", label: "Booking", glyph: "04", summary: "Book the room" });
      return ch;
    }
    case "gallery_room": {
      const ch: RoomChamber[] = [{ id: "threshold", label: "Threshold", glyph: "i", summary: "Enter the gallery" }];
      if (hasWorks) ch.push({ id: "wall", label: "Wall", glyph: "ii", summary: "Works on the wall" });
      ch.push({ id: "statement", label: "Wall text", glyph: "iii", summary: "Studio note" });
      if (hasServices) ch.push({ id: "commission", label: "Commission", glyph: "iv", summary: "Begin a commission" });
      if (hasProof) ch.push({ id: "notes", label: "Notes", glyph: "v", summary: "Collector notes" });
      ch.push({ id: "invitation", label: "Invitation", glyph: "vi", summary: "Begin" });
      return ch;
    }
    case "material_studio":
    case "commission_studio": {
      const ch: RoomChamber[] = [{ id: "workbench", label: "Workbench", glyph: "01", summary: "Materials and notes" }];
      if (hasWorks) ch.push({ id: "shelf", label: "Shelf", glyph: "02", summary: "Recent commissions" });
      if (hasServices) ch.push({ id: "pathway", label: "Pathway", glyph: "03", summary: "How a piece is made" });
      if (hasProof) ch.push({ id: "appreciation", label: "Held by", glyph: "04", summary: "What patrons said" });
      ch.push({ id: "commission", label: "Commission", glyph: "05", summary: "Begin a piece" });
      return ch;
    }
    case "trust_workshop": {
      const ch: RoomChamber[] = [{ id: "front-of-shop", label: "Front of shop", glyph: "01", summary: "Promise and trust strip" }];
      if (hasWorks) ch.push({ id: "job-board", label: "Job board", glyph: "02", summary: "Before / after" });
      if (hasServices) ch.push({ id: "quote-desk", label: "Quote desk", glyph: "03", summary: "What we quote on" });
      if (hasProof) ch.push({ id: "neighbours", label: "Neighbours", glyph: "04", summary: "What clients say" });
      ch.push({ id: "call", label: "Call", glyph: "05", summary: "Get a quote" });
      return ch;
    }
    case "care_sanctuary": {
      const ch: RoomChamber[] = [{ id: "threshold", label: "Threshold", glyph: "01", summary: "Held with care" }];
      if (hasServices) ch.push({ id: "ways", label: "Ways to work", glyph: "02", summary: "Sessions and circles" });
      ch.push({ id: "pathway", label: "Pathway", glyph: "03", summary: "How working together unfolds" });
      ch.push({ id: "method", label: "Method", glyph: "04", summary: "Philosophy" });
      ch.push({ id: "begin", label: "Begin", glyph: "05", summary: "First conversation" });
      return ch;
    }
    case "consultation_office": {
      const ch: RoomChamber[] = [{ id: "lobby", label: "Lobby", glyph: "i", summary: "Statement" }];
      if (hasServices) ch.push({ id: "engagements", label: "Engagements", glyph: "ii", summary: "How we work together" });
      if (hasProof) ch.push({ id: "voices", label: "Voices", glyph: "iii", summary: "What clients say" });
      ch.push({ id: "conversation", label: "Conversation", glyph: "iv", summary: "Open a project" });
      return ch;
    }
    case "venue_foyer":
    case "archive_room":
    case "field_room":
    case "map_room":
    case "club_wall":
    default: {
      const ch: RoomChamber[] = [{ id: "entrance", label: "Entrance", glyph: "01", summary: "Welcome" }];
      if (hasServices) ch.push({ id: "programs", label: "Programs", glyph: "02", summary: "What's on" });
      if (hasWorks) ch.push({ id: "record", label: "Record", glyph: "03", summary: "Public record" });
      if (hasProof) ch.push({ id: "trust", label: "Trust", glyph: "04", summary: "Held by" });
      ch.push({ id: "invitation", label: "Invitation", glyph: "05", summary: "Get in touch" });
      return ch;
    }
  }
}

// ---------------------------------------------------------------------------
// Room objects — populated from real PresenceNode content
// ---------------------------------------------------------------------------
function pickRoomObjects(world: WorldType, node: PresenceNode): RoomObject[] {
  const out: RoomObject[] = [];
  const works = visibleWorks(node);
  const services = visibleServices(node);
  const embeds = node.media_embeds ?? [];
  const proof = visibleProof(node);

  // Audio embeds — sound rooms
  embeds.forEach((embed, i) => {
    out.push({
      id: `audio-${i}`,
      type: "audio",
      role: "table_object",
      interaction: "play",
      label: embed.label ?? embed.provider ?? `Media ${i + 1}`,
      audioUrl: embed.url,
      meta: embed.provider ?? null,
      chamber: world === "sound_room" || world === "club_wall" ? "booth" : undefined,
    });
  });

  // Works — vary role by world
  works.forEach((work, i) => {
    const role =
      world === "gallery_room" ? "wall_object"
      : world === "material_studio" || world === "commission_studio" ? "table_object"
      : world === "trust_workshop" ? "wall_object"
      : "wall_object";
    out.push({
      id: `work-${work.id ?? work.slug ?? i}`,
      type: "artwork",
      role,
      interaction: "inspect",
      label: work.title,
      caption: [work.year, work.medium].filter(Boolean).join(" · ") || undefined,
      imageUrl: work.thumbnail_url ?? work.image_url ?? null,
      href: `/p/${node.slug}/works/${work.id ?? work.slug ?? i}`,
      meta: work.dimensions ?? undefined,
      chamber:
        world === "gallery_room" ? "wall"
        : world === "material_studio" || world === "commission_studio" ? "shelf"
        : world === "trust_workshop" ? "job-board"
        : world === "sound_room" || world === "club_wall" ? "signal-wall"
        : "record",
      data: { availability: work.availability_status ?? null },
    });
  });

  // Services
  services.forEach((service, i) => {
    out.push({
      id: `service-${service.id ?? i}`,
      type: "service",
      role: "drawer_object",
      interaction: "expand",
      label: service.title,
      caption: service.description ?? undefined,
      meta: [service.price_label, service.duration_label].filter(Boolean).join(" · ") || undefined,
      href: service.cta_url ?? null,
      chamber:
        world === "gallery_room" ? "commission"
        : world === "material_studio" || world === "commission_studio" ? "pathway"
        : world === "care_sanctuary" ? "ways"
        : world === "trust_workshop" ? "quote-desk"
        : world === "consultation_office" ? "engagements"
        : world === "sound_room" ? "booking"
        : "programs",
    });
  });

  // Proof items
  proof.forEach((item, i) => {
    out.push({
      id: `proof-${item.id ?? i}`,
      type: "testimonial",
      role: "floating_object",
      interaction: "tap_reveal",
      label: item.client_label ?? "Note",
      caption: item.testimonial ?? undefined,
      meta: item.outcome ?? undefined,
      chamber:
        world === "gallery_room" ? "notes"
        : world === "material_studio" || world === "commission_studio" ? "appreciation"
        : world === "trust_workshop" ? "neighbours"
        : world === "consultation_office" ? "voices"
        : "trust",
    });
  });

  // CTA portal — always present
  out.push({
    id: "cta",
    type: "cta_portal",
    role: "portal_object",
    interaction: "open_portal",
    label: node.primary_cta_label ?? "Begin",
    href: node.primary_cta_url ?? null,
    chamber:
      world === "gallery_room" ? "invitation"
      : world === "material_studio" || world === "commission_studio" ? "commission"
      : world === "trust_workshop" ? "call"
      : world === "care_sanctuary" ? "begin"
      : world === "consultation_office" ? "conversation"
      : world === "sound_room" ? "booking"
      : "invitation",
  });

  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function selectRoomWorld(node: PresenceNode, dna: PresenceDna): RoomWorld {
  const world_type = pickWorldType(dna);
  const navigation_model = pickNavigation(world_type, dna);
  const chambers = pickChambers(world_type, dna, node);

  return {
    world_type,
    navigation_model,
    mobile_nav_mode: pickMobileNav(navigation_model),
    chambers,
    atmosphere: pickAtmosphere(dna),
    spatial_depth: pickSpatialDepth(dna),
    transition_style: pickTransition(dna),
    room_objects: pickRoomObjects(world_type, node),
    semantic_fallback_label: node.display_name,
  };
}
