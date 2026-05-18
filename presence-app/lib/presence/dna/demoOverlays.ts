// ============================================================================
// TEMPORARY DEMO OVERLAYS — NOT A PERMANENT DATA SOURCE.
// ============================================================================
//
// These overlays exist for ONE reason: to let the six Presence DNA demo
// rooms (`rooms-underground-dj`, `rooms-gallery-painter`,
// `rooms-material-carpenter`, `rooms-local-carpenter`,
// `rooms-community-healer`, `rooms-sharp-consultant`) demonstrate the
// system's range without requiring a backend DNA migration first.
//
// Once `presence_dna` is persisted on PresenceNode (see Phase 10 report,
// "Backend follow-up"), DELETE this file or empty the registry. The
// renderer's resolution order is:
//
//   backend_persisted  >  demo_overlay (this file)  >  inferred
//
// so persisting DNA on these slugs will silently retire these overlays.
//
// Each overlay only sets DNA category values. None of these overlays
// fabricate works, services, images, or proof — those still come from
// the real API response. The overlays steer the *interpretation* of
// what the node already says about itself.
// ============================================================================

import type { PresenceDna } from "./types";

type DemoOverlay = Partial<Omit<PresenceDna, "source">> & { notes?: string[] };

const REGISTRY: Record<string, DemoOverlay> = {
  // -------------------------------------------------------------------------
  // 1. Underground DJ — nocturnal, glitch, audio-led performer
  // -------------------------------------------------------------------------
  "rooms-underground-dj": {
    entity: { entity_type: "individual", public_name: "—", relationship_to_work: "performer" },
    practice: { field: "music", practice_mode: "performance", work_rhythm: "event_based" },
    audience: { primary_audience: "bookers", audience_temperature: "warm", decision_need: "taste" },
    goal: { primary_goal: "bookings", secondary_goals: ["press"], conversion_style: "direct" },
    personality: { temperament: "experimental", energy: "kinetic", status_signal: "underground" },
    proof: { proof_type: ["event_history", "press"], proof_density: "moderate", proof_position: "midpage" },
    visual: { references: [], palette_mode: "nocturnal", texture: "scanline", image_treatment: "glitch" },
    composition: { entry_type: "audio_first", section_rhythm: "cinematic_chapters", navigation_mode: "floating_index" },
    signature: { signature_module: "glitch_gallery", signature_intensity: "hero_level" },
    notes: ["Nocturnal Sonic blueprint. Glitch behaviour at hero_level intensity."],
  },

  // -------------------------------------------------------------------------
  // 2. Gallery painter — quiet luxury, commission-led
  // -------------------------------------------------------------------------
  "rooms-gallery-painter": {
    entity: { entity_type: "individual", public_name: "—", relationship_to_work: "maker" },
    practice: { field: "visual_art", practice_mode: "commission", work_rhythm: "project_based" },
    audience: { primary_audience: "collectors", audience_temperature: "referred", decision_need: "taste" },
    goal: { primary_goal: "commissions", secondary_goals: ["press", "credibility"], conversion_style: "editorial" },
    personality: { temperament: "refined", energy: "still", status_signal: "premium" },
    proof: { proof_type: ["portfolio", "press"], proof_density: "moderate", proof_position: "after_story" },
    visual: { references: [], palette_mode: "gallery_white", texture: "paper", image_treatment: "gallery_matte" },
    composition: { entry_type: "work_first", section_rhythm: "gallery_flow", navigation_mode: "anchor_nav" },
    signature: { signature_module: "gallery_wall", signature_intensity: "featured" },
    notes: ["Editorial Identity blueprint. Restrained gallery_breath behaviour."],
  },

  // -------------------------------------------------------------------------
  // 3. Material carpenter — tactile, material/process-led furniture maker
  // -------------------------------------------------------------------------
  "rooms-material-carpenter": {
    entity: { entity_type: "studio", public_name: "—", relationship_to_work: "maker" },
    practice: { field: "building_trade", practice_mode: "craft", work_rhythm: "project_based" },
    audience: { primary_audience: "collectors", audience_temperature: "referred", decision_need: "taste" },
    goal: { primary_goal: "commissions", secondary_goals: ["press"], conversion_style: "premium" },
    personality: { temperament: "refined", energy: "slow", status_signal: "craft" },
    proof: { proof_type: ["portfolio", "materials_process"], proof_density: "moderate", proof_position: "after_story" },
    visual: { references: [], palette_mode: "material_based", texture: "timber", image_treatment: "warm_portrait" },
    composition: { entry_type: "material_first", section_rhythm: "collage", navigation_mode: "single_scroll" },
    signature: { signature_module: "materials_board", signature_intensity: "hero_level" },
    notes: ["Material Studio blueprint. material_reveal behaviour. Same profession as local-carpenter, deliberately different world."],
  },

  // -------------------------------------------------------------------------
  // 4. Local carpenter — practical trust-led service room
  // -------------------------------------------------------------------------
  "rooms-local-carpenter": {
    entity: { entity_type: "individual", public_name: "—", relationship_to_work: "service_provider" },
    practice: { field: "building_trade", practice_mode: "service", work_rhythm: "recurring" },
    audience: { primary_audience: "clients", audience_temperature: "cold", decision_need: "trust" },
    goal: { primary_goal: "enquiries", secondary_goals: ["bookings"], conversion_style: "direct" },
    personality: { temperament: "grounded", energy: "alive", status_signal: "accessible" },
    proof: { proof_type: ["before_after", "testimonials", "certifications"], proof_density: "heavy", proof_position: "early" },
    visual: { references: [], palette_mode: "warm_neutral", texture: "none", image_treatment: "documentary" },
    composition: { entry_type: "quote_first", section_rhythm: "service_ladder", navigation_mode: "anchor_nav" },
    signature: { signature_module: "before_after_slider", signature_intensity: "hero_level" },
    notes: ["Trust Conversion blueprint. editorial_snap behaviour. Same profession as material-carpenter — must look like a different world."],
  },

  // -------------------------------------------------------------------------
  // 5. Community healer — warm practitioner / care pathway
  // -------------------------------------------------------------------------
  "rooms-community-healer": {
    entity: { entity_type: "individual", public_name: "—", relationship_to_work: "service_provider" },
    practice: { field: "healing", practice_mode: "care", work_rhythm: "appointment_based" },
    audience: { primary_audience: "community", audience_temperature: "warm", decision_need: "safety" },
    goal: { primary_goal: "bookings", secondary_goals: ["memberships"], conversion_style: "soft" },
    personality: { temperament: "warm", energy: "soft", status_signal: "community" },
    proof: { proof_type: ["testimonials", "certifications"], proof_density: "moderate", proof_position: "near_cta" },
    visual: { references: [], palette_mode: "soft_gradient", texture: "paper", image_treatment: "warm_portrait" },
    composition: { entry_type: "service_first", section_rhythm: "case_study_stack", navigation_mode: "single_scroll" },
    signature: { signature_module: "ritual_booking_panel", signature_intensity: "featured" },
    notes: ["Program/Care blueprint."],
  },

  // -------------------------------------------------------------------------
  // 6. Sharp consultant — editorial credibility, direct project conversation
  // -------------------------------------------------------------------------
  "rooms-sharp-consultant": {
    entity: { entity_type: "individual", public_name: "—", relationship_to_work: "consultant" },
    practice: { field: "consulting", practice_mode: "advisory", work_rhythm: "ongoing_relationship" },
    audience: { primary_audience: "partners", audience_temperature: "referred", decision_need: "competence" },
    goal: { primary_goal: "enquiries", secondary_goals: ["credibility"], conversion_style: "premium" },
    personality: { temperament: "precise", energy: "sharp", status_signal: "expert" },
    proof: { proof_type: ["case_studies", "client_logos"], proof_density: "heavy", proof_position: "near_cta" },
    visual: { references: [], palette_mode: "monochrome", texture: "none", image_treatment: "editorial" },
    composition: { entry_type: "statement_hero", section_rhythm: "editorial_scroll", navigation_mode: "anchor_nav" },
    signature: { signature_module: "quote_oracle", signature_intensity: "featured" },
    notes: ["Editorial Identity blueprint with consulting DNA — distinct from painter despite same blueprint."],
  },
};

export function demoDnaForSlug(slug: string | null | undefined): DemoOverlay | null {
  if (!slug) return null;
  return REGISTRY[slug] ?? null;
}

export function demoDnaSlugs(): string[] {
  return Object.keys(REGISTRY);
}
