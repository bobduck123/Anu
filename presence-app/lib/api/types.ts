// Presence domain types — standalone, no Manara dependency

export interface PresenceTemplate {
  id: number;
  name: string;
  description?: string | null;
  node_type: string;
  display_mode?: string;
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
  email: string;
  phone?: string | null;
  company?: string | null;
  message: string;
  status: string;
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
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  location_label?: string | null;
  primary_cta_label?: string | null;
  primary_cta_url?: string | null;
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
  availability_chips?: PresenceAvailabilityChip[];
  nfc_tags?: PresenceNfcTag[];
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
  email: string;
  phone?: string;
  message: string;
  consent: boolean;
  enquiry_type?: string;
  preferred_contact_method?: string;
  source_url?: string;
  source_type?: string;
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
