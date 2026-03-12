-- Institutional education stack integration:
-- immersive knowledge, systems literacy, curriculum, governance workflow, and regeneration links.

CREATE TABLE IF NOT EXISTS indigenous_plant_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER,
    microcosm_id INTEGER,
    event_id INTEGER,
    region VARCHAR(120) NOT NULL,
    language_group VARCHAR(120) NOT NULL,
    indigenous_name VARCHAR(200) NOT NULL,
    scientific_name VARCHAR(200),
    season VARCHAR(80) NOT NULL,
    traditional_uses TEXT NOT NULL,
    preparation_methods TEXT,
    cultural_context TEXT,
    scientific_notes TEXT,
    sensitivity_level VARCHAR(20) NOT NULL DEFAULT 'public',
    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    elder_verified BOOLEAN DEFAULT 0,
    custodial_region_tag VARCHAR(140),
    attribution_community VARCHAR(200),
    attribution_custodian VARCHAR(200),
    lineage_reference VARCHAR(220),
    language_code VARCHAR(20),
    geo_lat FLOAT,
    geo_lng FLOAT,
    offline_package_ref VARCHAR(220),
    created_by INTEGER NOT NULL,
    verified_by INTEGER,
    verified_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id),
    FOREIGN KEY(event_id) REFERENCES event(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(verified_by) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS ix_indigenous_plant_region ON indigenous_plant_knowledge (region);
CREATE INDEX IF NOT EXISTS ix_indigenous_plant_season ON indigenous_plant_knowledge (season);
CREATE INDEX IF NOT EXISTS ix_indigenous_plant_sensitivity ON indigenous_plant_knowledge (sensitivity_level);
CREATE INDEX IF NOT EXISTS ix_indigenous_plant_verification ON indigenous_plant_knowledge (verification_status);
CREATE INDEX IF NOT EXISTS ix_indigenous_plant_microcosm ON indigenous_plant_knowledge (microcosm_id);

CREATE TABLE IF NOT EXISTS plant_media_asset (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    media_type VARCHAR(40) NOT NULL DEFAULT 'illustration',
    asset_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    alt_text VARCHAR(255),
    is_transparent_illustration BOOLEAN DEFAULT 0,
    language_code VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME,
    FOREIGN KEY(plant_id) REFERENCES indigenous_plant_knowledge(id)
);

CREATE INDEX IF NOT EXISTS ix_plant_media_plant_id ON plant_media_asset (plant_id);
CREATE INDEX IF NOT EXISTS ix_plant_media_type ON plant_media_asset (media_type);

CREATE TABLE IF NOT EXISTS plant_ecological_relationship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    related_plant_id INTEGER,
    relationship_type VARCHAR(40) NOT NULL,
    related_label VARCHAR(180),
    soil_type VARCHAR(120),
    seasonal_cycle VARCHAR(140),
    ethical_harvest_constraint TEXT,
    notes TEXT,
    created_at DATETIME,
    FOREIGN KEY(plant_id) REFERENCES indigenous_plant_knowledge(id),
    FOREIGN KEY(related_plant_id) REFERENCES indigenous_plant_knowledge(id)
);

CREATE INDEX IF NOT EXISTS ix_plant_relationship_plant_id ON plant_ecological_relationship (plant_id);
CREATE INDEX IF NOT EXISTS ix_plant_relationship_related ON plant_ecological_relationship (related_plant_id);
CREATE INDEX IF NOT EXISTS ix_plant_relationship_type ON plant_ecological_relationship (relationship_type);

CREATE TABLE IF NOT EXISTS plant_landscape_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL,
    state_label VARCHAR(30) NOT NULL,
    biodiversity_index FLOAT,
    soil_health_index FLOAT,
    canopy_cover_pct FLOAT,
    narrative TEXT,
    created_at DATETIME,
    FOREIGN KEY(plant_id) REFERENCES indigenous_plant_knowledge(id),
    UNIQUE(plant_id, state_label)
);

CREATE INDEX IF NOT EXISTS ix_plant_landscape_state_label ON plant_landscape_state (state_label);

CREATE TABLE IF NOT EXISTS knowledge_lineage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_knowledge_id INTEGER NOT NULL,
    child_knowledge_id INTEGER NOT NULL,
    relation_type VARCHAR(60) NOT NULL DEFAULT 'derived_from',
    notes VARCHAR(500),
    created_by INTEGER,
    created_at DATETIME,
    FOREIGN KEY(parent_knowledge_id) REFERENCES indigenous_plant_knowledge(id),
    FOREIGN KEY(child_knowledge_id) REFERENCES indigenous_plant_knowledge(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    UNIQUE(parent_knowledge_id, child_knowledge_id, relation_type)
);

CREATE INDEX IF NOT EXISTS ix_knowledge_lineage_parent ON knowledge_lineage (parent_knowledge_id);
CREATE INDEX IF NOT EXISTS ix_knowledge_lineage_child ON knowledge_lineage (child_knowledge_id);

CREATE TABLE IF NOT EXISTS knowledge_approval_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id INTEGER NOT NULL,
    verifier_id INTEGER NOT NULL,
    decision VARCHAR(30) NOT NULL,
    notes VARCHAR(500),
    elder_verification_flag BOOLEAN DEFAULT 0,
    created_at DATETIME,
    FOREIGN KEY(knowledge_id) REFERENCES indigenous_plant_knowledge(id),
    FOREIGN KEY(verifier_id) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS ix_knowledge_approval_knowledge_id ON knowledge_approval_record (knowledge_id);
CREATE INDEX IF NOT EXISTS ix_knowledge_approval_decision ON knowledge_approval_record (decision);

CREATE TABLE IF NOT EXISTS knowledge_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id INTEGER NOT NULL,
    actor_id INTEGER,
    action VARCHAR(120) NOT NULL,
    details VARCHAR(1000),
    created_at DATETIME,
    FOREIGN KEY(knowledge_id) REFERENCES indigenous_plant_knowledge(id),
    FOREIGN KEY(actor_id) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS ix_knowledge_audit_knowledge_id ON knowledge_audit_log (knowledge_id);
CREATE INDEX IF NOT EXISTS ix_knowledge_audit_created_at ON knowledge_audit_log (created_at);

CREATE TABLE IF NOT EXISTS education_program (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER,
    microcosm_id INTEGER,
    event_id INTEGER,
    title VARCHAR(220) NOT NULL,
    description TEXT,
    region VARCHAR(120),
    language_group VARCHAR(120),
    branch_code VARCHAR(80),
    accreditation_code VARCHAR(120),
    offline_package_ref VARCHAR(220),
    is_active BOOLEAN DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id),
    FOREIGN KEY(event_id) REFERENCES event(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS ix_education_program_region ON education_program (region);
CREATE INDEX IF NOT EXISTS ix_education_program_active ON education_program (is_active);
CREATE INDEX IF NOT EXISTS ix_education_program_microcosm ON education_program (microcosm_id);

CREATE TABLE IF NOT EXISTS education_program_module (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    sequence INTEGER DEFAULT 0,
    depth_tier_required INTEGER DEFAULT 1,
    created_at DATETIME,
    FOREIGN KEY(program_id) REFERENCES education_program(id),
    FOREIGN KEY(module_id) REFERENCES module(id),
    UNIQUE(program_id, module_id)
);

CREATE INDEX IF NOT EXISTS ix_education_program_module_program_id ON education_program_module (program_id);
CREATE INDEX IF NOT EXISTS ix_education_program_module_module_id ON education_program_module (module_id);

CREATE TABLE IF NOT EXISTS education_badge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(500),
    cultural_note VARCHAR(500),
    icon_ref VARCHAR(240),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME
);

CREATE INDEX IF NOT EXISTS ix_education_badge_active ON education_badge (is_active);

CREATE TABLE IF NOT EXISTS education_topic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    microcosm_id INTEGER,
    event_id INTEGER,
    title VARCHAR(220) NOT NULL,
    description TEXT,
    depth_tier INTEGER NOT NULL DEFAULT 1,
    assessment_type VARCHAR(80) NOT NULL DEFAULT 'reflection',
    reflection_prompt TEXT,
    action_link_id INTEGER,
    badge_link_id INTEGER,
    sensitivity_level VARCHAR(20) NOT NULL DEFAULT 'public',
    branch_code VARCHAR(80),
    offline_package_ref VARCHAR(220),
    sequence INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(program_id) REFERENCES education_program(id),
    FOREIGN KEY(module_id) REFERENCES module(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id),
    FOREIGN KEY(event_id) REFERENCES event(id),
    FOREIGN KEY(action_link_id) REFERENCES action(id),
    FOREIGN KEY(badge_link_id) REFERENCES education_badge(id)
);

CREATE INDEX IF NOT EXISTS ix_education_topic_program_id ON education_topic (program_id);
CREATE INDEX IF NOT EXISTS ix_education_topic_module_id ON education_topic (module_id);
CREATE INDEX IF NOT EXISTS ix_education_topic_depth_tier ON education_topic (depth_tier);
CREATE INDEX IF NOT EXISTS ix_education_topic_sensitivity ON education_topic (sensitivity_level);

CREATE TABLE IF NOT EXISTS education_interactive_experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    experience_type VARCHAR(80) NOT NULL DEFAULT 'interactive',
    content_ref VARCHAR(500),
    narration_ref VARCHAR(500),
    mapping_ref VARCHAR(500),
    sequence INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(topic_id) REFERENCES education_topic(id)
);

CREATE INDEX IF NOT EXISTS ix_education_experience_topic_id ON education_interactive_experience (topic_id);
CREATE INDEX IF NOT EXISTS ix_education_experience_type ON education_interactive_experience (experience_type);

CREATE TABLE IF NOT EXISTS education_user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    program_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    completion_percent INTEGER DEFAULT 0,
    depth_tier_unlocked INTEGER DEFAULT 1,
    status VARCHAR(40) NOT NULL DEFAULT 'in_progress',
    completed_at DATETIME,
    last_activity_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(program_id) REFERENCES education_program(id),
    FOREIGN KEY(module_id) REFERENCES module(id),
    FOREIGN KEY(topic_id) REFERENCES education_topic(id),
    UNIQUE(user_id, program_id, module_id, topic_id)
);

CREATE INDEX IF NOT EXISTS ix_education_progress_user_id ON education_user_progress (user_id);
CREATE INDEX IF NOT EXISTS ix_education_progress_topic_id ON education_user_progress (topic_id);

CREATE TABLE IF NOT EXISTS education_reflection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    program_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    response_text TEXT NOT NULL,
    submitted_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(program_id) REFERENCES education_program(id),
    FOREIGN KEY(module_id) REFERENCES module(id),
    FOREIGN KEY(topic_id) REFERENCES education_topic(id)
);

CREATE INDEX IF NOT EXISTS ix_education_reflection_user_id ON education_reflection (user_id);
CREATE INDEX IF NOT EXISTS ix_education_reflection_topic_id ON education_reflection (topic_id);
CREATE INDEX IF NOT EXISTS ix_education_reflection_submitted_at ON education_reflection (submitted_at);

CREATE TABLE IF NOT EXISTS education_badge_award (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    program_id INTEGER,
    module_id INTEGER,
    topic_id INTEGER,
    awarded_by INTEGER,
    award_reason VARCHAR(400),
    awarded_at DATETIME,
    FOREIGN KEY(badge_id) REFERENCES education_badge(id),
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(program_id) REFERENCES education_program(id),
    FOREIGN KEY(module_id) REFERENCES module(id),
    FOREIGN KEY(topic_id) REFERENCES education_topic(id),
    FOREIGN KEY(awarded_by) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS ix_education_badge_award_user ON education_badge_award (user_id);
CREATE INDEX IF NOT EXISTS ix_education_badge_award_badge ON education_badge_award (badge_id);
CREATE INDEX IF NOT EXISTS ix_education_badge_award_topic ON education_badge_award (topic_id);

CREATE TABLE IF NOT EXISTS education_regeneration_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    topic_id INTEGER,
    action_id INTEGER NOT NULL,
    action_category VARCHAR(80) NOT NULL,
    unlock_threshold INTEGER NOT NULL DEFAULT 100,
    requires_verification BOOLEAN DEFAULT 1,
    cultural_guidance VARCHAR(500),
    created_at DATETIME,
    FOREIGN KEY(program_id) REFERENCES education_program(id),
    FOREIGN KEY(module_id) REFERENCES module(id),
    FOREIGN KEY(topic_id) REFERENCES education_topic(id),
    FOREIGN KEY(action_id) REFERENCES action(id)
);

CREATE INDEX IF NOT EXISTS ix_education_regen_program ON education_regeneration_link (program_id);
CREATE INDEX IF NOT EXISTS ix_education_regen_module ON education_regeneration_link (module_id);
CREATE INDEX IF NOT EXISTS ix_education_regen_topic ON education_regeneration_link (topic_id);
CREATE INDEX IF NOT EXISTS ix_education_regen_action ON education_regeneration_link (action_id);

CREATE TABLE IF NOT EXISTS education_regeneration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    regeneration_link_id INTEGER NOT NULL,
    action_id INTEGER NOT NULL,
    completion_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    proof_note VARCHAR(500),
    completed_at DATETIME,
    verified_by INTEGER,
    verified_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(regeneration_link_id) REFERENCES education_regeneration_link(id),
    FOREIGN KEY(action_id) REFERENCES action(id),
    FOREIGN KEY(verified_by) REFERENCES "user"(id),
    UNIQUE(user_id, regeneration_link_id)
);

CREATE INDEX IF NOT EXISTS ix_education_regen_log_user ON education_regeneration_log (user_id);
CREATE INDEX IF NOT EXISTS ix_education_regen_log_status ON education_regeneration_log (completion_status);
