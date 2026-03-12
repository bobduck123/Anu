import { apiFetch } from "./client";

export type SensitivityLevel = "public" | "community" | "restricted";

export interface SceneDefinition {
  id: string;
  title: string;
  description: string;
  supports: string[];
}

export interface PlantMediaAsset {
  id: number;
  media_type: string;
  asset_url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  is_transparent_illustration: boolean;
  language_code?: string | null;
  sort_order: number;
}

export interface PlantRelationship {
  id: number;
  relationship_type: string;
  related_plant_id?: number | null;
  related_label?: string | null;
  related_plant_name?: string | null;
  soil_type?: string | null;
  seasonal_cycle?: string | null;
  ethical_harvest_constraint?: string | null;
  notes?: string | null;
}

export interface PlantLandscapeState {
  state_label: "before" | "degraded" | "regenerated";
  biodiversity_index?: number | null;
  soil_health_index?: number | null;
  canopy_cover_pct?: number | null;
  narrative?: string | null;
}

export interface KnowledgeAuditLog {
  id: number;
  actor_id?: number | null;
  action: string;
  details?: string | null;
  created_at?: string | null;
}

export interface PlantKnowledgeEntry {
  id: number;
  region: string;
  language_group: string;
  indigenous_name: string;
  scientific_name?: string | null;
  season: string;
  traditional_uses: string;
  preparation_methods?: string | null;
  cultural_context?: string | null;
  scientific_notes?: string | null;
  sensitivity_level: SensitivityLevel;
  verification_status: string;
  elder_verified: boolean;
  custodial_region_tag?: string | null;
  attribution_community?: string | null;
  attribution_custodian?: string | null;
  lineage_reference?: string | null;
  offline_package_ref?: string | null;
  language_code?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  microcosm_id?: number | null;
  event_id?: number | null;
  verified_by?: number | null;
  created_by: number;
  verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  media_assets: PlantMediaAsset[];
  ecological_relationships: PlantRelationship[];
  landscape_states?: PlantLandscapeState[];
  audit_log: KnowledgeAuditLog[];
}

export interface PlantFilterOptions {
  regions: string[];
  seasons: string[];
  sensitivity_levels: SensitivityLevel[];
}

export interface RelationshipGraphNode {
  id: number;
  label: string;
  season: string;
  region: string;
  sensitivity_level: SensitivityLevel;
}

export interface RelationshipGraphEdge {
  id: number;
  source: number;
  target?: number | null;
  type: string;
  label: string;
  soil_type?: string | null;
  seasonal_cycle?: string | null;
  ethical_harvest_constraint?: string | null;
}

export interface HarvestSimulationResult {
  plant_id: number;
  indigenous_name: string;
  risk_score: number;
  status: "sustainable" | "caution" | "unsustainable";
  visual_state: "regenerating" | "stressed" | "degraded";
  guidance: string[];
}

export interface CurriculumExperience {
  id: number;
  title: string;
  experience_type: string;
  content_ref?: string | null;
  narration_ref?: string | null;
  mapping_ref?: string | null;
  sequence: number;
}

export interface CurriculumTopic {
  topic_id: number;
  program_id: number;
  module_id: number;
  title: string;
  description?: string | null;
  depth_tier: number;
  assessment_type: string;
  reflection_prompt?: string | null;
  action_link?: number | null;
  badge_link?: number | null;
  sensitivity_level: SensitivityLevel;
  microcosm_id?: number | null;
  event_id?: number | null;
  sequence: number;
  experiences: CurriculumExperience[];
}

export interface CurriculumModule {
  program_id: number;
  module_id: number;
  title: string;
  description?: string | null;
  sequence: number;
  depth_tier_required: number;
  topics: CurriculumTopic[];
}

export interface CurriculumProgram {
  program_id: number;
  title: string;
  description?: string | null;
  region?: string | null;
  language_group?: string | null;
  branch_code?: string | null;
  accreditation_code?: string | null;
  offline_package_ref?: string | null;
  microcosm_id?: number | null;
  event_id?: number | null;
  module_ids: number[];
  module_count: number;
  topic_count: number;
  completion_percent?: number | null;
  depth_tier_unlocked?: number | null;
}

export interface CurriculumProgramDetail {
  program: {
    program_id: number;
    title: string;
    description?: string | null;
    region?: string | null;
    language_group?: string | null;
    branch_code?: string | null;
    accreditation_code?: string | null;
    microcosm_id?: number | null;
    event_id?: number | null;
  };
  modules: CurriculumModule[];
}

export interface ProgressRecord {
  id: number;
  user_id: number;
  program_id: number;
  module_id: number;
  topic_id: number;
  completion_percent: number;
  depth_tier_unlocked: number;
  status: string;
  completed_at?: string | null;
  last_activity_at?: string | null;
  updated_at?: string | null;
}

export interface ReflectionRecord {
  id: number;
  user_id: number;
  program_id: number;
  module_id: number;
  topic_id: number;
  prompt: string;
  response_text: string;
  submitted_at?: string | null;
  updated_at?: string | null;
}

export interface CurriculumReport {
  module_performance: Array<{
    module_id: number;
    avg_completion_percent: number;
    record_count: number;
  }>;
  depth_distribution: Array<{ depth_tier: number; count: number }>;
  progression_distribution: Record<string, number>;
  reflection_submissions: number;
  report_generated_at: string;
}

export interface RegenerationUnlock {
  regeneration_link_id: number;
  program_id: number;
  module_id: number;
  topic_id?: number | null;
  action_id: number;
  action_title: string;
  action_category: string;
  unlock_threshold: number;
  progress_value: number;
  unlocked: boolean;
  requires_verification: boolean;
  cultural_guidance?: string | null;
  completion_status?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
}

export interface RegenerationLog {
  id: number;
  user_id: number;
  regeneration_link_id: number;
  action_id: number;
  completion_status: string;
  proof_note?: string | null;
  completed_at?: string | null;
  verified_by?: number | null;
  verified_at?: string | null;
  updated_at?: string | null;
}

export interface EducationAdminOverview {
  summary: {
    programs: number;
    topics: number;
    progress_records: number;
    completed_progress_records: number;
    completion_rate: number;
    reflection_submissions: number;
    pending_approvals: number;
    approved_entries: number;
    rejected_entries: number;
    regeneration_logs: number;
  };
  module_performance: Array<{
    module_id: number;
    module_title: string;
    avg_completion_percent: number;
    record_count: number;
  }>;
  user_progression_distribution: Record<string, number>;
  recent_reflections: Array<{
    id: number;
    user_id: number;
    username?: string | null;
    topic_id: number;
    prompt: string;
    submitted_at?: string | null;
  }>;
  pending_approval_panel: PlantKnowledgeEntry[];
  generated_at: string;
}

const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      qs.set(key, String(value));
    }
  });
  const out = qs.toString();
  return out ? `?${out}` : "";
};

export const educationStackApi = {
  listScenes: () => apiFetch<{ scenes: SceneDefinition[] }>("/api/education/immersive/scenes"),

  listPlants: (params: { region?: string; season?: string; sensitivity?: SensitivityLevel; microcosm_id?: number } = {}) =>
    apiFetch<{ plants: PlantKnowledgeEntry[]; filters: PlantFilterOptions }>(`/api/education/immersive/plants${toQueryString(params)}`),

  getPlant: (plantId: number) => apiFetch<{ plant: PlantKnowledgeEntry }>(`/api/education/immersive/plants/${plantId}`),

  getGraph: (params: { plant_id?: number; region?: string } = {}) =>
    apiFetch<{ nodes: RelationshipGraphNode[]; edges: RelationshipGraphEdge[] }>(`/api/education/systems/graph${toQueryString(params)}`),

  runHarvestSimulation: (payload: { plant_id: number; harvest_percent: number; method: string; season?: string }) =>
    apiFetch<HarvestSimulationResult>("/api/education/systems/harvest-simulator", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getLandscapeStates: (plantId: number) => apiFetch<{ plant_id: number; states: PlantLandscapeState[] }>(`/api/education/systems/landscape/${plantId}`),

  listPrograms: (params: { region?: string; microcosm_id?: number } = {}) =>
    apiFetch<{ programs: CurriculumProgram[] }>(`/api/education/curriculum/programs${toQueryString(params)}`),

  getProgram: (programId: number) => apiFetch<CurriculumProgramDetail>(`/api/education/curriculum/programs/${programId}`),

  listProgress: (params: { user_id?: number; program_id?: number } = {}) =>
    apiFetch<{ progress: ProgressRecord[] }>(`/api/education/curriculum/progress${toQueryString(params)}`),

  upsertProgress: (payload: {
    program_id: number;
    module_id: number;
    topic_id: number;
    completion_percent: number;
    depth_tier_unlocked?: number;
    score?: number;
  }) =>
    apiFetch<{
      id: number;
      program_id: number;
      module_id: number;
      topic_id: number;
      completion_percent: number;
      depth_tier_unlocked: number;
      status: string;
      completed_at?: string | null;
      badge_award?: { badge_id: number; badge_title?: string | null } | null;
      unlocked_regeneration_links: number[];
    }>("/api/education/curriculum/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  submitReflection: (payload: {
    program_id: number;
    module_id: number;
    topic_id: number;
    response_text: string;
    prompt?: string;
  }) =>
    apiFetch<{ id: number; submitted_at: string }>("/api/education/curriculum/reflections", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listReflections: (params: { user_id?: number; topic_id?: number } = {}) =>
    apiFetch<{ reflections: ReflectionRecord[] }>(`/api/education/curriculum/reflections${toQueryString(params)}`),

  getCurriculumReport: () => apiFetch<CurriculumReport>("/api/education/curriculum/report"),

  listKnowledgeEntries: (params: { status?: string; region?: string } = {}) =>
    apiFetch<{ knowledge_entries: PlantKnowledgeEntry[] }>(`/api/education/governance/knowledge-entries${toQueryString(params)}`),

  createKnowledgeEntry: (payload: Partial<PlantKnowledgeEntry> & {
    region: string;
    language_group: string;
    indigenous_name: string;
    season: string;
    traditional_uses: string;
  }) =>
    apiFetch<{ knowledge_id: number; verification_status: string }>("/api/education/governance/knowledge-entries", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verifyKnowledgeEntry: (knowledgeId: number, payload: { decision: "approved" | "rejected"; notes?: string; elder_verification_flag?: boolean }) =>
    apiFetch<{
      knowledge_id: number;
      verification_status: string;
      verified_by: number;
      verified_at?: string | null;
    }>(`/api/education/governance/knowledge-entries/${knowledgeId}/verify`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getLineage: (knowledgeId: number) =>
    apiFetch<{
      parents: Array<{ lineage_id: number; knowledge_id: number; relation_type: string; notes?: string | null }>;
      children: Array<{ lineage_id: number; knowledge_id: number; relation_type: string; notes?: string | null }>;
    }>(`/api/education/governance/knowledge-entries/${knowledgeId}/lineage`),

  addLineage: (knowledgeId: number, payload: { parent_knowledge_id: number; relation_type?: string; notes?: string }) =>
    apiFetch<{ lineage_id: number }>(`/api/education/governance/knowledge-entries/${knowledgeId}/lineage`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  pendingApprovals: () => apiFetch<{ pending_entries: PlantKnowledgeEntry[] }>("/api/education/governance/approvals/pending"),

  listRegenerationUnlocks: () => apiFetch<{ unlocks: RegenerationUnlock[] }>("/api/education/regeneration/unlocks"),

  listRegenerationLogs: (params: { user_id?: number } = {}) =>
    apiFetch<{ logs: RegenerationLog[] }>(`/api/education/regeneration/logs${toQueryString(params)}`),

  createRegenerationLog: (payload: { regeneration_link_id: number; completion_status?: "pending" | "completed"; proof_note?: string }) =>
    apiFetch<{ id: number; completion_status: string; completed_at?: string | null; requires_verification: boolean }>(
      "/api/education/regeneration/logs",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  verifyRegenerationLog: (logId: number) =>
    apiFetch<{ id: number; completion_status: string; verified_by: number; verified_at?: string | null }>(
      `/api/education/regeneration/logs/${logId}/verify`,
      { method: "POST" },
    ),

  adminOverview: () => apiFetch<EducationAdminOverview>("/api/education/admin/overview"),

  adminReflections: (params: { topic_id?: number; user_id?: number } = {}) =>
    apiFetch<{ reflections: ReflectionRecord[] }>(`/api/education/admin/reflections${toQueryString(params)}`),

  adminApprovals: () =>
    apiFetch<{
      pending_entries: PlantKnowledgeEntry[];
      recent_approvals: Array<{
        id: number;
        knowledge_id: number;
        verifier_id: number;
        decision: string;
        notes?: string | null;
        elder_verification_flag: boolean;
        created_at?: string | null;
      }>;
    }>("/api/education/admin/approvals"),
};
