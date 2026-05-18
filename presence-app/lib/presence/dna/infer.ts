// inferPresenceDna(node) — derive Presence DNA from an existing PresenceNode
// using signals already on the API response (room_type, node_type,
// display_mode, services, works, media_embeds, etc.).
//
// This is the FORWARD-COMPATIBLE adapter: until the backend persists DNA
// fields, the renderer asks the inferrer for a best-effort DNA based on
// existing structured data. The inferrer never invents work, services,
// images, or proof — it only chooses DNA category values from what the
// node already says about itself.

import type { PresenceNode } from "@/lib/api/types";
import type {
  AudienceDna,
  CompositionDna,
  EntityDna,
  GoalDna,
  PersonalityDna,
  PracticeDna,
  PresenceDna,
  ProofDna,
  SignatureDna,
  VisualWorldDna,
} from "./types";

// ---------------------------------------------------------------------------
// Signal helpers
// ---------------------------------------------------------------------------

function hasWorks(node: PresenceNode): boolean {
  return (node.works ?? node.gallery_items ?? []).some((w) => w.is_visible !== false);
}

function hasServices(node: PresenceNode): boolean {
  return (node.services ?? []).some((s) => s.is_visible !== false);
}

function hasMedia(node: PresenceNode): boolean {
  return (node.media_embeds ?? []).length > 0;
}

function hasProof(node: PresenceNode): boolean {
  const proof = (node.proof_items ?? []).length;
  const creds = (node.credentials ?? []).length;
  return proof + creds > 0;
}

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

function inferEntity(node: PresenceNode): EntityDna {
  const nodeType = (node.node_type ?? "").toLowerCase();
  const roomType = (node.room_type ?? "").toLowerCase();

  let entity_type: EntityDna["entity_type"] = "individual";
  if (roomType === "organisation" || nodeType === "organisation") entity_type = "organisation";
  else if (nodeType === "venue") entity_type = "venue";
  else if (nodeType === "project" || nodeType === "event_organiser") entity_type = "project";
  else if (nodeType === "creative" || nodeType === "studio") entity_type = "studio";
  else if (nodeType === "community_worker" || nodeType === "collective") entity_type = "collective";

  let relationship_to_work: EntityDna["relationship_to_work"] = "maker";
  if (roomType === "performer_music") relationship_to_work = "performer";
  else if (roomType === "practitioner") relationship_to_work = "service_provider";
  else if (nodeType === "consultant" || nodeType === "advisor" || nodeType === "fractional_executive")
    relationship_to_work = "consultant";
  else if (nodeType === "venue") relationship_to_work = "host";
  else if (nodeType === "tradie" || nodeType === "field_service") relationship_to_work = "service_provider";
  else if (nodeType === "coach" || nodeType === "community_worker") relationship_to_work = "teacher";
  else if (entity_type === "organisation") relationship_to_work = "organiser";

  return {
    entity_type,
    public_name: node.display_name,
    relationship_to_work,
  };
}

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------

function inferPractice(node: PresenceNode): PracticeDna {
  const nodeType = (node.node_type ?? "").toLowerCase();
  const roomType = (node.room_type ?? "").toLowerCase();

  let field: PracticeDna["field"] = "design";
  if (roomType === "performer_music") field = "music";
  else if (roomType === "artist_studio" || nodeType === "artist") field = "visual_art";
  else if (nodeType === "tradie" || nodeType === "field_service") field = "building_trade";
  else if (roomType === "practitioner" || nodeType === "coach") field = "healing";
  else if (nodeType === "consultant" || nodeType === "advisor" || nodeType === "fractional_executive")
    field = "consulting";
  else if (nodeType === "venue") field = "hospitality";
  else if (nodeType === "community_worker") field = "community";
  else if (roomType === "organisation") field = "culture";

  let practice_mode: PracticeDna["practice_mode"] = "service";
  if (roomType === "performer_music") practice_mode = "performance";
  else if (roomType === "artist_studio") practice_mode = "portfolio";
  else if (field === "building_trade") practice_mode = "craft";
  else if (roomType === "practitioner") practice_mode = "care";
  else if (field === "consulting") practice_mode = "advisory";
  else if (roomType === "organisation") practice_mode = "program";
  else if (field === "hospitality") practice_mode = "space";

  let work_rhythm: PracticeDna["work_rhythm"] = "project_based";
  if (practice_mode === "performance") work_rhythm = "event_based";
  else if (practice_mode === "care") work_rhythm = "appointment_based";
  else if (practice_mode === "program") work_rhythm = "recurring";
  else if (practice_mode === "advisory") work_rhythm = "ongoing_relationship";
  else if (practice_mode === "craft") work_rhythm = "project_based";

  return { field, practice_mode, work_rhythm };
}

// ---------------------------------------------------------------------------
// Audience + Goal
// ---------------------------------------------------------------------------

function inferAudience(node: PresenceNode, practice: PracticeDna): AudienceDna {
  let primary_audience: AudienceDna["primary_audience"] = "clients";
  let audience_temperature: AudienceDna["audience_temperature"] = "warm";
  let decision_need: AudienceDna["decision_need"] = "trust";

  switch (practice.field) {
    case "music":
      primary_audience = "bookers";
      audience_temperature = "warm";
      decision_need = "taste";
      break;
    case "visual_art":
      primary_audience = "collectors";
      audience_temperature = "referred";
      decision_need = "taste";
      break;
    case "building_trade":
      primary_audience = "clients";
      audience_temperature = "cold";
      decision_need = "trust";
      break;
    case "healing":
      primary_audience = "clients";
      audience_temperature = "warm";
      decision_need = "safety";
      break;
    case "consulting":
      primary_audience = "partners";
      audience_temperature = "referred";
      decision_need = "competence";
      break;
    case "culture":
    case "community":
      primary_audience = "community";
      audience_temperature = "institutional";
      decision_need = "alignment";
      break;
    case "hospitality":
      primary_audience = "community";
      audience_temperature = "warm";
      decision_need = "availability";
      break;
  }
  return { primary_audience, audience_temperature, decision_need };
}

function inferGoal(node: PresenceNode, practice: PracticeDna): GoalDna {
  let primary_goal: GoalDna["primary_goal"] = "enquiries";
  let conversion_style: GoalDna["conversion_style"] = "soft";

  switch (practice.practice_mode) {
    case "performance":
      primary_goal = "bookings";
      conversion_style = "direct";
      break;
    case "portfolio":
      primary_goal = "commissions";
      conversion_style = "editorial";
      break;
    case "craft":
      primary_goal = "commissions";
      conversion_style = practice.field === "building_trade" ? "direct" : "premium";
      break;
    case "care":
      primary_goal = "bookings";
      conversion_style = "soft";
      break;
    case "advisory":
      primary_goal = "enquiries";
      conversion_style = "premium";
      break;
    case "program":
      primary_goal = "memberships";
      conversion_style = "community";
      break;
    case "space":
      primary_goal = "event_attendance";
      conversion_style = "invitation";
      break;
  }

  return { primary_goal, secondary_goals: ["credibility"], conversion_style };
}

// ---------------------------------------------------------------------------
// Personality, Proof, Visual, Composition, Signature
// ---------------------------------------------------------------------------

function inferPersonality(node: PresenceNode, practice: PracticeDna): PersonalityDna {
  let temperament: PersonalityDna["temperament"] = "warm";
  let energy: PersonalityDna["energy"] = "alive";
  let status_signal: PersonalityDna["status_signal"] = "accessible";

  switch (practice.field) {
    case "music":
      temperament = "experimental";
      energy = "kinetic";
      status_signal = "underground";
      break;
    case "visual_art":
      temperament = "refined";
      energy = "still";
      status_signal = "premium";
      break;
    case "building_trade":
      // Default to grounded/craft; demo overlays may push specific carpenters
      // toward either a craft-luxury or a trust-led variation.
      temperament = "grounded";
      energy = "slow";
      status_signal = "craft";
      break;
    case "healing":
      temperament = "warm";
      energy = "soft";
      status_signal = "community";
      break;
    case "consulting":
      temperament = "precise";
      energy = "sharp";
      status_signal = "expert";
      break;
    case "culture":
    case "community":
      temperament = "serious";
      energy = "ceremonial";
      status_signal = "institutional";
      break;
  }
  return { temperament, energy, status_signal };
}

function inferProof(node: PresenceNode, practice: PracticeDna): ProofDna {
  const types: ProofDna["proof_type"] = [];
  if (hasWorks(node)) types.push("portfolio");
  if (hasProof(node)) types.push("testimonials");
  if ((node.credentials ?? []).length > 0) types.push("certifications");
  if (practice.field === "building_trade") types.push("before_after");
  if (practice.field === "music") types.push("event_history");
  if (practice.field === "consulting") types.push("case_studies");
  if (practice.field === "culture" || practice.field === "community") types.push("community_endorsement");
  if (types.length === 0) types.push("portfolio");

  const total = (node.works?.length ?? 0) + (node.proof_items?.length ?? 0) + (node.credentials?.length ?? 0);
  const density: ProofDna["proof_density"] = total >= 9 ? "heavy" : total >= 4 ? "moderate" : "light";

  let proof_position: ProofDna["proof_position"] = "midpage";
  if (practice.field === "building_trade") proof_position = "early";
  if (practice.field === "consulting") proof_position = "near_cta";
  if (practice.field === "visual_art") proof_position = "after_story";

  return { proof_type: types, proof_density: density, proof_position };
}

function inferVisual(_node: PresenceNode, practice: PracticeDna, personality: PersonalityDna): VisualWorldDna {
  let palette_mode: VisualWorldDna["palette_mode"] = "warm_neutral";
  let texture: VisualWorldDna["texture"] = "none";
  let image_treatment: VisualWorldDna["image_treatment"] = "editorial";

  switch (practice.field) {
    case "music":
      palette_mode = "nocturnal";
      texture = "scanline";
      image_treatment = "glitch";
      break;
    case "visual_art":
      palette_mode = "gallery_white";
      texture = "paper";
      image_treatment = "gallery_matte";
      break;
    case "building_trade":
      palette_mode = personality.status_signal === "craft" ? "material_based" : "warm_neutral";
      texture = personality.status_signal === "craft" ? "timber" : "none";
      image_treatment = personality.status_signal === "craft" ? "warm_portrait" : "documentary";
      break;
    case "healing":
      palette_mode = "soft_gradient";
      texture = "paper";
      image_treatment = "warm_portrait";
      break;
    case "consulting":
      palette_mode = "monochrome";
      texture = "none";
      image_treatment = "editorial";
      break;
    case "culture":
    case "community":
      palette_mode = "cultural";
      texture = "paper";
      image_treatment = "archive";
      break;
  }
  return { references: [], palette_mode, texture, image_treatment };
}

function inferComposition(node: PresenceNode, practice: PracticeDna, personality: PersonalityDna): CompositionDna {
  let entry_type: CompositionDna["entry_type"] = "statement_hero";
  if (hasMedia(node) && practice.field === "music") entry_type = "audio_first";
  else if (practice.field === "visual_art" && hasWorks(node)) entry_type = "work_first";
  else if (practice.field === "building_trade") entry_type = personality.status_signal === "craft" ? "material_first" : "quote_first";
  else if (practice.practice_mode === "care") entry_type = "service_first";
  else if (practice.field === "culture" || practice.field === "community") entry_type = "event_first";

  let section_rhythm: CompositionDna["section_rhythm"] = "modular_cards";
  switch (practice.field) {
    case "music":
      section_rhythm = "cinematic_chapters";
      break;
    case "visual_art":
      section_rhythm = "gallery_flow";
      break;
    case "building_trade":
      section_rhythm = personality.status_signal === "craft" ? "collage" : "service_ladder";
      break;
    case "healing":
      section_rhythm = "case_study_stack";
      break;
    case "consulting":
      section_rhythm = "editorial_scroll";
      break;
    case "culture":
    case "community":
      section_rhythm = "timeline";
      break;
  }

  let navigation_mode: CompositionDna["navigation_mode"] = "single_scroll";
  if (practice.field === "music") navigation_mode = "floating_index";
  else if (practice.field === "visual_art") navigation_mode = "anchor_nav";
  else if (practice.field === "consulting") navigation_mode = "anchor_nav";
  else if (practice.field === "culture") navigation_mode = "portal_cards";

  return { entry_type, section_rhythm, navigation_mode };
}

function inferSignature(_node: PresenceNode, practice: PracticeDna, personality: PersonalityDna): SignatureDna {
  let signature_module: SignatureDna["signature_module"] = "gallery_wall";
  switch (practice.field) {
    case "music":
      signature_module = "glitch_gallery";
      break;
    case "visual_art":
      signature_module = "gallery_wall";
      break;
    case "building_trade":
      signature_module = personality.status_signal === "craft" ? "materials_board" : "before_after_slider";
      break;
    case "healing":
      signature_module = "ritual_booking_panel";
      break;
    case "consulting":
      signature_module = "quote_oracle";
      break;
    case "culture":
    case "community":
      signature_module = "program_grid";
      break;
  }
  return { signature_module, signature_intensity: "featured" };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function inferPresenceDna(node: PresenceNode): PresenceDna {
  const entity = inferEntity(node);
  const practice = inferPractice(node);
  const personality = inferPersonality(node, practice);
  const audience = inferAudience(node, practice);
  const goal = inferGoal(node, practice);
  const proof = inferProof(node, practice);
  const visual = inferVisual(node, practice, personality);
  const composition = inferComposition(node, practice, personality);
  const signature = inferSignature(node, practice, personality);

  return {
    entity,
    practice,
    audience,
    goal,
    personality,
    proof,
    visual,
    composition,
    signature,
    source: "inferred",
  };
}
