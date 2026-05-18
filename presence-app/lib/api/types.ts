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
