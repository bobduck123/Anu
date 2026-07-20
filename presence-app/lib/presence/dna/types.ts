// Presence DNA — typed model that authors the public room.
//
// Profession may inform DNA, but DNA (not profession) selects the final
// blueprint, theme, motion, image treatment, signature module, and mobile
// nav. See docs/PRESENCE_DNA_BEAUTY_QA.md and the Phase 10 report.
//
// Backwards-compatible: this layer is consumed by `inferPresenceDna(node)`
// in `./infer.ts`, which works against the existing PresenceNode API
// without requiring a backend migration. A future migration can persist
// these fields directly on the node and the inferrer becomes a fallback.

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

export type EntityType =
  | "individual"
  | "studio"
  | "collective"
  | "organisation"
  | "venue"
  | "project";

export type RelationshipToWork =
  | "maker"
  | "performer"
  | "service_provider"
  | "teacher"
  | "organiser"
  | "consultant"
  | "host"
  | "caretaker"
  | "seller"
  | "advocate";

export interface EntityDna {
  entity_type: EntityType;
  public_name: string;
  relationship_to_work: RelationshipToWork;
}

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------

export type PracticeField =
  | "music"
  | "visual_art"
  | "building_trade"
  | "healing"
  | "consulting"
  | "hospitality"
  | "education"
  | "community"
  | "culture"
  | "design"
  | "wellbeing"
  | "events";

export type PracticeMode =
  | "performance"
  | "commission"
  | "service"
  | "portfolio"
  | "program"
  | "product"
  | "space"
  | "advisory"
  | "craft"
  | "teaching"
  | "care";

export type WorkRhythm =
  | "one_off"
  | "recurring"
  | "project_based"
  | "seasonal"
  | "appointment_based"
  | "event_based"
  | "ongoing_relationship";

export interface PracticeDna {
  field: PracticeField;
  practice_mode: PracticeMode;
  work_rhythm: WorkRhythm;
}

// ---------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------

export type PrimaryAudience =
  | "clients"
  | "collectors"
  | "bookers"
  | "venues"
  | "families"
  | "funders"
  | "community"
  | "buyers"
  | "partners"
  | "employers"
  | "media";

export type AudienceTemperature =
  | "cold"
  | "warm"
  | "referred"
  | "existing_network"
  | "institutional";

export type DecisionNeed =
  | "trust"
  | "taste"
  | "proof"
  | "clarity"
  | "status"
  | "availability"
  | "safety"
  | "alignment"
  | "competence";

export interface AudienceDna {
  primary_audience: PrimaryAudience;
  audience_temperature: AudienceTemperature;
  decision_need: DecisionNeed;
}

// ---------------------------------------------------------------------------
// Goal
// ---------------------------------------------------------------------------

export type PrimaryGoal =
  | "bookings"
  | "enquiries"
  | "commissions"
  | "sales"
  | "credibility"
  | "grant_readiness"
  | "press"
  | "donations"
  | "volunteers"
  | "memberships"
  | "event_attendance";

export type ConversionStyle =
  | "direct"
  | "soft"
  | "premium"
  | "editorial"
  | "community"
  | "application"
  | "invitation";

export interface GoalDna {
  primary_goal: PrimaryGoal;
  secondary_goals: PrimaryGoal[];
  conversion_style: ConversionStyle;
}

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

export type Temperament =
  | "quiet"
  | "bold"
  | "warm"
  | "precise"
  | "raw"
  | "refined"
  | "playful"
  | "serious"
  | "spiritual"
  | "technical"
  | "experimental"
  | "grounded";

export type Energy =
  | "still"
  | "slow"
  | "alive"
  | "kinetic"
  | "ceremonial"
  | "sharp"
  | "soft"
  | "dense"
  | "minimal";

export type StatusSignal =
  | "accessible"
  | "premium"
  | "institutional"
  | "underground"
  | "community"
  | "luxury"
  | "craft"
  | "expert";

export interface PersonalityDna {
  temperament: Temperament;
  energy: Energy;
  status_signal: StatusSignal;
}

// ---------------------------------------------------------------------------
// Proof
// ---------------------------------------------------------------------------

export type ProofType =
  | "portfolio"
  | "case_studies"
  | "testimonials"
  | "press"
  | "event_history"
  | "before_after"
  | "client_logos"
  | "certifications"
  | "program_outcomes"
  | "materials_process"
  | "community_endorsement";

export type ProofDensity = "light" | "moderate" | "heavy";
export type ProofPosition = "early" | "midpage" | "after_story" | "near_cta";

export interface ProofDna {
  proof_type: ProofType[];
  proof_density: ProofDensity;
  proof_position: ProofPosition;
}

// ---------------------------------------------------------------------------
// Visual World
// ---------------------------------------------------------------------------

export type PaletteMode =
  | "earth"
  | "nocturnal"
  | "gallery_white"
  | "warm_neutral"
  | "high_contrast"
  | "soft_gradient"
  | "monochrome"
  | "material_based"
  | "cultural"
  | "cinematic";

export type Texture =
  | "none"
  | "grain"
  | "paper"
  | "timber"
  | "fabric"
  | "stone"
  | "light_leak"
  | "scanline"
  | "paint"
  | "dust";

export type ImageTreatment =
  | "editorial"
  | "documentary"
  | "cinematic"
  | "clean_product"
  | "archive"
  | "warm_portrait"
  | "high_gloss"
  | "raw"
  | "glitch"
  | "duotone"
  | "halftone"
  | "polaroid"
  | "photocopy"
  | "projection"
  | "gallery_matte";

export interface VisualWorldDna {
  references: string[];
  palette_mode: PaletteMode;
  texture: Texture;
  image_treatment: ImageTreatment;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export type EntryType =
  | "portrait_hero"
  | "statement_hero"
  | "work_first"
  | "audio_first"
  | "service_first"
  | "map_first"
  | "quote_first"
  | "material_first"
  | "event_first"
  | "gallery_first"
  | "archive_first";

export type SectionRhythm =
  | "editorial_scroll"
  | "modular_cards"
  | "gallery_flow"
  | "portal_sections"
  | "case_study_stack"
  | "timeline"
  | "service_ladder"
  | "split_panels"
  | "collage"
  | "index_wall"
  | "cinematic_chapters";

export type NavigationMode =
  | "single_scroll"
  | "room_tabs"
  | "anchor_nav"
  | "portal_cards"
  | "story_path"
  | "mobile_drawer"
  | "bottom_sheet"
  | "glyph_nav"
  | "floating_index";

export interface CompositionDna {
  entry_type: EntryType;
  section_rhythm: SectionRhythm;
  navigation_mode: NavigationMode;
}

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------

export type SignatureModule =
  | "audio_strip"
  | "gallery_wall"
  | "materials_board"
  | "before_after_slider"
  | "availability_panel"
  | "press_wall"
  | "project_timeline"
  | "map_memory"
  | "ritual_booking_panel"
  | "impact_counter"
  | "quote_oracle"
  | "process_reel"
  | "program_grid"
  | "commission_pathway"
  | "glitch_gallery"
  | "archive_wall"
  | "mobile_room_switcher";

export type SignatureIntensity = "subtle" | "featured" | "hero_level";

export interface SignatureDna {
  signature_module: SignatureModule;
  signature_intensity: SignatureIntensity;
}

// ---------------------------------------------------------------------------
// Behaviour presets (motion / interaction identity)
// ---------------------------------------------------------------------------

export type BehaviourPreset =
  | "controlled_glitch"
  | "archival_flicker"
  | "cinematic_drift"
  | "material_reveal"
  | "gallery_breath"
  | "scanline_noise"
  | "soft_parallax"
  | "editorial_snap"
  | "kinetic_index"
  | "tactile_hover"
  | "image_displacement"
  | "mobile_portal_nav";

export type BehaviourIntensity = "off" | "subtle" | "featured" | "high";

// ---------------------------------------------------------------------------
// Room blueprint identifiers
// ---------------------------------------------------------------------------

export type RoomBlueprint =
  | "editorial_identity"
  | "trust_conversion"
  | "proof_wall"
  | "atmosphere"
  | "program"
  | "craft"
  | "archive"
  | "booking"
  | "commission"
  | "civic"
  | "glitch_gallery"
  | "material_studio"
  | "nocturnal_sonic"
  | "field_record";

// ---------------------------------------------------------------------------
// Theme genome — controls more than just colour.
// ---------------------------------------------------------------------------

export type TypographyMode =
  | "editorial_serif"
  | "industrial_sans"
  | "humanist_sans"
  | "mono_technical"
  | "display_serif"
  | "soft_serif";

export type SpacingDensity = "tight" | "comfortable" | "airy" | "cinematic";
export type GridBehaviour = "strict" | "modular" | "broken" | "collage" | "single_column";
export type EdgeStyle = "hard" | "soft" | "rounded" | "deckled" | "polaroid";
export type DepthModel = "flat" | "elevated" | "layered" | "dimensional" | "scenographic";

export interface ThemeGenome {
  palette_mode: PaletteMode;
  typography_mode: TypographyMode;
  spacing_density: SpacingDensity;
  grid_behaviour: GridBehaviour;
  image_treatment: ImageTreatment;
  texture: Texture;
  motion_preset: BehaviourPreset;
  motion_intensity: BehaviourIntensity;
  edge_style: EdgeStyle;
  depth_model: DepthModel;
  navigation_mode: NavigationMode;
  accent_hex?: string | null;
}

// ---------------------------------------------------------------------------
// Top-level Presence DNA
// ---------------------------------------------------------------------------

export interface PresenceDna {
  entity: EntityDna;
  practice: PracticeDna;
  audience: AudienceDna;
  goal: GoalDna;
  personality: PersonalityDna;
  proof: ProofDna;
  visual: VisualWorldDna;
  composition: CompositionDna;
  signature: SignatureDna;
  // provenance + diagnostics
  source: "inferred" | "node_metadata" | "backend_persisted";
  notes?: string[];
}

// ---------------------------------------------------------------------------
// Room output (what the engine produces for the renderer)
// ---------------------------------------------------------------------------

export interface SectionDescriptor {
  id: string;
  kind:
    | "hero"
    | "story"
    | "signature"
    | "services"
    | "works"
    | "proof"
    | "credentials"
    | "media"
    | "links"
    | "contact"
    | "noticeboard"
    | "readiness"
    | "navigation_dock"
    | "spacer";
  priority: number;
  config?: Record<string, unknown>;
}

export interface RoomOutput {
  blueprint: RoomBlueprint;
  theme: ThemeGenome;
  section_stack: SectionDescriptor[];
  signature: SignatureDna;
  trust_pathway: ProofType[];
  cta_label: string;
  cta_style: ConversionStyle;
  uniqueness_inputs: UniquenessInputs;
}

// ---------------------------------------------------------------------------
// Uniqueness comparison inputs (consumed by lib/presence/uniqueness.ts)
// ---------------------------------------------------------------------------

export interface UniquenessInputs {
  blueprint: RoomBlueprint;
  section_order: string[];
  entry_type: EntryType;
  palette_mode: PaletteMode;
  typography_mode: TypographyMode;
  proof_density: ProofDensity;
  proof_position: ProofPosition;
  cta_label: string;
  media_density: "low" | "medium" | "high";
  signature_module: SignatureModule;
  motion_preset: BehaviourPreset;
  navigation_mode: NavigationMode;
  image_treatment: ImageTreatment;
}
