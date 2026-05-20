// Presence domain types. Kept standalone with no Manara dependency.

export interface PresenceTemplate {
  id: number;
  name: string;
  description?: string | null;
  node_type: string;
  display_mode?: string | null;
  preview_image_url?: string | null;
  is_active: boolean;
  is_premium: boolean;
}

export interface PresenceLink {
  id?: number;
  label: string;
  url: string;
  link_type?: string;
  icon?: string | null;
  sort_order?: number;
  is_visible?: boolean;
}

export interface PresenceService {
  id?: number;
  title: string;
  description?: string | null;
  price_label?: string | null;
  duration_label?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  sort_order?: number;
  is_visible?: boolean;
}

export type PresenceRoomType =
  | "minimal_card"
  | "artist_studio"
  | "practitioner"
  | "performer_music"
  | "organisation";

export type PresenceThemePreset =
  | "clean_light"
  | "editorial_dark"
  | "warm_earth"
  | "gallery_white"
  | "neon_night"
  | "soft_healing"
  | "cultural_org"
  | "minimal_mono";

export type PresencePublicStatus = "draft" | "private" | "public";

export interface PresenceMediaEmbed {
  label?: string | null;
  url: string;
  type?: "audio" | "video" | "playlist" | "link" | string;
  provider?: string | null;
}

export interface PresenceCollection {
  id?: number;
  node_id?: number | null;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceWork {
  id?: number;
  collection_id?: number | null;
  slug?: string | null;
  title: string;
  year?: string | null;
  medium?: string | null;
  dimensions?: string | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  gallery_images?: string[];
  external_url?: string | null;
  availability_status?: string | null;
  price_label?: string | null;
  exhibition_history?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceAvailabilityChip {
  id?: number;
  label: string;
  chip_type?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface PresenceNfcTag {
  id?: number;
  node_id?: number;
  label: string;
  tag_type?: string;
  tag_uid?: string | null;
  source_code: string;
  destination_url?: string | null;
  is_active?: boolean;
  created_at?: string | null;
}

export interface PresenceEnquiry {
  id: number;
  node_id: number;
  enquiry_type: string;
  name: string;
  email: string | null;
  phone?: string | null;
  company?: string | null;
  message: string;
  status: string;
  preferred_contact_method?: string | null;
  contact_handle?: string | null;
  contact_routes?: Array<{ type: string; value: string }> | null;
  contact_route_summary?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  source_room_slug?: string | null;
  routed_to_email?: string | null;
  delivery_status?: string | null;
  submitter_user_id?: number | null;
  is_anu_member?: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PresenceAnalyticsSummary {
  total_views: number;
  total_enquiries: number;
  conversion_rate: number;
  last_7_days?: Record<string, number>;
  last_30_days?: Record<string, number>;
  top_sources?: Array<{ source_type?: string | null; count: number }>;
  recent_events?: Array<{ id: number; event_type: string; created_at?: string | null }>;
}

export interface PresenceNode {
  id: number;
  owner_user_id?: number | null;
  slug: string;
  display_name: string;
  headline?: string | null;
  bio?: string | null;
  node_type: string;
  display_mode: string;
  plan_type?: string;
  status: string;
  visibility: string;
  public_status?: PresencePublicStatus | string | null;
  room_type?: PresenceRoomType | string | null;
  theme_preset?: PresenceThemePreset | string | null;
  accent_color?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_image_url?: string | null;
  short_bio?: string | null;
  long_story?: string | null;
  location_label?: string | null;
  primary_cta_label?: string | null;
  primary_cta_url?: string | null;
  enquiry_email?: string | null;
  availability_status?: string | null;
  featured_notice?: string | null;
  media_embeds?: PresenceMediaEmbed[];
  seo_title?: string | null;
  seo_description?: string | null;
  social_preview_image_url?: string | null;
  landing_enabled?: boolean;
  landing_title?: string | null;
  landing_subtitle?: string | null;
  landing_background_url?: string | null;
  landing_enter_label?: string | null;
  practice_statement?: string | null;
  curatorial_statement?: string | null;
  public_email?: string | null;
  public_phone?: string | null;
  public_url?: string;
  links?: PresenceLink[];
  services?: PresenceService[];
  collections?: PresenceCollection[];
  works?: PresenceWork[];
  gallery_items?: PresenceWork[];
  testimonials?: PresenceEnquiry[] | Array<{
    id?: number;
    title?: string | null;
    client_label?: string | null;
    testimonial?: string | null;
    outcome?: string | null;
  }>;
  availability_chips?: PresenceAvailabilityChip[];
  nfc_tags?: PresenceNfcTag[];
  credentials?: Array<{
    id?: number;
    title: string;
    issuer?: string | null;
    credential_type?: string | null;
    verification_url?: string | null;
    is_public?: boolean;
  }>;
  proof_items?: Array<{
    id?: number;
    title?: string | null;
    client_label?: string | null;
    testimonial?: string | null;
    outcome?: string | null;
  }>;
  directory_ready?: boolean;
  map_ready?: boolean;
  archive_ready?: boolean;
  white_label_ready?: boolean;
  // Presence DNA persistence (Pass 2). The backend serializes
  // node_metadata as this top-level `metadata` key. presence_dna lives
  // at metadata.presence_dna. Other forward-compatible keys (e.g.
  // before_after_pairs) may live alongside.
  metadata?: Record<string, unknown> | null;
  analytics?: PresenceAnalyticsSummary;
  seo?: {
    title: string;
    description: string;
    canonical_url: string;
    image?: string | null;
  };
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
}

export type PresenceNodeInput = Partial<
  Omit<PresenceNode, "id" | "analytics" | "seo">
>;

export type PresenceMediaTarget =
  | "profile_image"
  | "cover_image"
  | "landing_background"
  | "work_image"
  | "collection_cover";

export interface PresenceMediaUploadResult {
  target_type: PresenceMediaTarget;
  field: string;
  url: string | null;
  storage_path?: string | null;
  storage_backend?: string | null;
  entity?: PresenceNode | PresenceWork | PresenceCollection | null;
}

export interface PresenceEnquiryInput {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  consent: boolean;
  enquiry_type?: string;
  preferred_contact_method?: "email" | "phone" | "sms" | "handle" | "in_studio" | "any";
  contact_handle?: string;
  company?: string;
  budget_range?: string;
  timeline?: string;
  source_url?: string;
  source_type?: string;
  form_started_at?: number;
  metadata?: Record<string, unknown>;
}

export interface PublicPresenceWorkDetail {
  node: PresenceNode;
  work: PresenceWork;
  collection?: PresenceCollection | null;
}

export interface PublicPresenceCollectionDetail {
  node: PresenceNode;
  collection: PresenceCollection;
  works: PresenceWork[];
}

export type PresencePassType =
  | "phone"
  | "nfc_card"
  | "qr"
  | "wallet"
  | "badge"
  | "sticker"
  | "poster"
  | "short_link";

export type PresencePassStatus = "active" | "paused" | "revoked";
export type RoomKeyType = "nfc" | "qr" | "short_link" | "wallet" | "badge" | "sticker" | "poster" | "direct";
export type RoomKeyStatus = "active" | "paused" | "revoked";

export interface PresencePass {
  id: number;
  room_id: number;
  owner_id?: number | null;
  pass_type: PresencePassType | string;
  label: string;
  status: PresencePassStatus | string;
  default_room_key_id?: number | null;
  metadata?: Record<string, unknown>;
  room_keys?: RoomKey[];
  created_at?: string | null;
  updated_at?: string | null;
  copy?: string;
}

export interface RoomKey {
  id: number;
  room_id: number;
  presence_pass_id?: number | null;
  key_type: RoomKeyType | string;
  public_token?: string;
  campaign_label?: string | null;
  physical_batch_id?: string | null;
  status: RoomKeyStatus | string;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Encounter {
  id: number;
  room_id: number;
  room_key_id?: number | null;
  visitor_type: "guest" | "observer" | "room_owner" | "unknown" | string;
  source: string;
  context_label?: string | null;
  privacy_level: "aggregate_only" | "observer_known" | "revealed" | string;
  created_at?: string | null;
}

export interface RoomKeyEntryPayload {
  message: string;
  room: PresenceNode;
  public_url: string;
  room_key?: RoomKey | null;
  encounter?: Encounter | null;
  available_actions: string[];
  observer_upgrade?: string;
  status?: string;
}

export interface ObserverProfile {
  id: number;
  user_id?: number | null;
  alias: string;
  mask_name?: string | null;
  avatar_key?: string | null;
  bio_fragment?: string | null;
  status: string;
  visibility: "public_mask" | "private" | "limited" | string;
  self_promotion_locked: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  copy?: string;
}

export interface RoomConnection {
  id: number;
  room_id: number;
  observer_id?: number | null;
  status: "entered" | "saved" | "followed" | "crossed_paths" | "revealed" | "enquired" | "blocked" | string;
  saved_at?: string | null;
  followed_at?: string | null;
  revealed_at?: string | null;
  last_interaction_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
  room?: PresenceNode;
}

export interface PassportStamp {
  id: number;
  observer_id: number;
  room_id?: number | null;
  encounter_id?: number | null;
  path_id?: number | null;
  stamp_type: "entered" | "saved" | "noted" | "crossed_paths" | "returned" | "followed_path" | "enquired" | string;
  label?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
}

export type MoodBoardType =
  | "general"
  | "influences"
  | "saved_rooms"
  | "event"
  | "place"
  | "material"
  | "sound"
  | "mood"
  | "editorial";

export interface MoodBoard {
  id: number;
  owner_type: "observer" | "room" | string;
  observer_id?: number | null;
  room_id?: number | null;
  title: string;
  description?: string | null;
  visibility: "private" | "public" | "room_public" | "unlisted" | string;
  board_type: MoodBoardType | string;
  cover_item_id?: number | null;
  status: "active" | "archived" | string;
  items?: MoodBoardItem[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MoodBoardItem {
  id: number;
  mood_board_id: number;
  item_type: "room" | "field_note" | "external_link" | "image" | "reference" | "event" | "place" | "work" | "tag" | "text" | string;
  item_id?: number | null;
  external_url?: string | null;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  tags?: string[];
  position_index?: number | null;
  source_context?: string | null;
  added_by_observer_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FieldNote {
  id: number;
  author_observer_id: number;
  room_id?: number | null;
  path_id?: number | null;
  encounter_id?: number | null;
  mood_board_id?: number | null;
  body?: string | null;
  visibility: "public" | "room_owner_only" | "private" | string;
  status: "active" | "hidden" | "flagged" | "removed" | string;
  moderation_state: "clean" | "pending" | "flagged" | "actioned" | string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Signal {
  id: number;
  observer_id: number;
  target_type: "room" | "field_note" | "mood_board" | "path" | "mood_board_item" | string;
  target_id: number;
  signal_type: "resonated" | "saved_for_later" | "would_book" | "inspiring" | "want_to_visit" | "useful" | "beautiful" | "important" | string;
  created_at?: string | null;
}

export interface PresencePath {
  id: number;
  title: string;
  description?: string | null;
  path_type: string;
  trailhead_type: string;
  trailhead_id?: number | null;
  generated_by: string;
  visibility: string;
  status: string;
  mood_tags?: string[];
  place_tags?: string[];
  metadata?: Record<string, unknown>;
  waypoints?: PathWaypoint[];
  choices?: PathChoice[];
  copy?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PathWaypoint {
  id: number;
  path_id: number;
  waypoint_type: "room" | "field_note" | "mood_board_item" | "mood_board" | "event" | "place" | "reference" | "text" | string;
  waypoint_id?: number | null;
  title?: string | null;
  reason_shown?: string | null;
  order_index: number;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
}

export interface PathChoice {
  id: number;
  path_id: number;
  from_waypoint_id: number;
  label: string;
  direction_type: string;
  next_path_id?: number | null;
  next_waypoint_id?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
}

export interface PathWalk {
  id: number;
  observer_id: number;
  path_id: number;
  started_at?: string | null;
  completed_at?: string | null;
  abandoned_at?: string | null;
  saved: boolean;
  conversion_event?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PathTrace {
  id: number;
  observer_id: number;
  path_id: number;
  waypoint_id?: number | null;
  trace_type: string;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
}

export interface WorldReadinessMetric {
  id?: number;
  scope_type?: string;
  scope_id?: string | null;
  status: "hidden" | "forming" | "preview" | "ready" | "open" | string;
  readiness_score?: number;
  computed_at?: string | null;
  message: string;
}

export interface RoomGraphAnalytics {
  room_id: number;
  slug: string;
  encounters_count: number;
  saved_rooms_count: number;
  field_notes_count: number;
  path_activity_count: number;
  signals: Record<string, number>;
  room_key_performance: Array<RoomKey & { encounters_count?: number }>;
}
