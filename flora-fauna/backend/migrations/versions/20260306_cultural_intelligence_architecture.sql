-- Flora Fauna Cultural Intelligence Architecture (additive migration)
-- Safe for alpha rollout: creates only new tables and indexes.

CREATE TABLE IF NOT EXISTS ci_connector_registration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(140) NOT NULL UNIQUE,
    connector_type VARCHAR(80) NOT NULL,
    source_slug VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    config_json JSON,
    last_pulled_at DATETIME,
    created_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_connector_status ON ci_connector_registration(status);

CREATE TABLE IF NOT EXISTS ci_raw_signal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connector_id INTEGER NOT NULL REFERENCES ci_connector_registration(id),
    source_slug VARCHAR(120) NOT NULL,
    external_id VARCHAR(180),
    payload_json JSON NOT NULL,
    ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_raw_signal_connector_id ON ci_raw_signal(connector_id);
CREATE INDEX IF NOT EXISTS ix_ci_raw_signal_external_id ON ci_raw_signal(external_id);
CREATE INDEX IF NOT EXISTS ix_ci_raw_signal_ingested_at ON ci_raw_signal(ingested_at);

CREATE TABLE IF NOT EXISTS ci_ueo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_signal_id INTEGER REFERENCES ci_raw_signal(id),
    source_slug VARCHAR(120) NOT NULL,
    external_id VARCHAR(180),
    event_type VARCHAR(120) NOT NULL,
    title VARCHAR(240) NOT NULL,
    summary TEXT,
    occurred_at DATETIME NOT NULL,
    region VARCHAR(120),
    latitude FLOAT,
    longitude FLOAT,
    entity_refs_json JSON,
    importance_hint FLOAT,
    confidence FLOAT NOT NULL DEFAULT 0.5,
    normalized_json JSON NOT NULL,
    fingerprint VARCHAR(96) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_ueo_occurred_at ON ci_ueo(occurred_at);
CREATE INDEX IF NOT EXISTS ix_ci_ueo_source_slug ON ci_ueo(source_slug);

CREATE TABLE IF NOT EXISTS ci_fused_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dedupe_key VARCHAR(120) NOT NULL UNIQUE,
    event_type VARCHAR(120) NOT NULL,
    canonical_title VARCHAR(240) NOT NULL,
    summary TEXT,
    occurred_at DATETIME NOT NULL,
    region VARCHAR(120),
    latitude FLOAT,
    longitude FLOAT,
    cluster_key VARCHAR(120),
    source_count INTEGER NOT NULL DEFAULT 1,
    confidence FLOAT NOT NULL DEFAULT 0.5,
    novelty_score FLOAT NOT NULL DEFAULT 0.0,
    proximity_score FLOAT NOT NULL DEFAULT 0.0,
    importance_score FLOAT NOT NULL DEFAULT 0.0,
    total_score FLOAT NOT NULL DEFAULT 0.0,
    fused_payload JSON NOT NULL,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_fused_event_cluster_key ON ci_fused_event(cluster_key);
CREATE INDEX IF NOT EXISTS ix_ci_fused_event_occurred_at ON ci_fused_event(occurred_at);
CREATE INDEX IF NOT EXISTS ix_ci_fused_event_score ON ci_fused_event(total_score);

CREATE TABLE IF NOT EXISTS ci_fused_event_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fused_event_id INTEGER NOT NULL REFERENCES ci_fused_event(id),
    ueo_id INTEGER NOT NULL REFERENCES ci_ueo(id),
    corroborates BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fused_event_id, ueo_id)
);
CREATE INDEX IF NOT EXISTS ix_ci_fused_event_evidence_fused_event ON ci_fused_event_evidence(fused_event_id);

CREATE TABLE IF NOT EXISTS ci_story_cluster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_key VARCHAR(120) NOT NULL UNIQUE,
    label VARCHAR(240) NOT NULL,
    entity_anchor VARCHAR(180),
    window_start DATETIME,
    window_end DATETIME,
    centroid_lat FLOAT,
    centroid_lng FLOAT,
    event_count INTEGER NOT NULL DEFAULT 0,
    score FLOAT NOT NULL DEFAULT 0.0,
    metadata_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_story_cluster_score ON ci_story_cluster(score);
CREATE INDEX IF NOT EXISTS ix_ci_story_cluster_updated_at ON ci_story_cluster(updated_at);

CREATE TABLE IF NOT EXISTS ci_cluster_event_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id INTEGER NOT NULL REFERENCES ci_story_cluster(id),
    fused_event_id INTEGER NOT NULL REFERENCES ci_fused_event(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cluster_id, fused_event_id)
);
CREATE INDEX IF NOT EXISTS ix_ci_cluster_event_cluster_id ON ci_cluster_event_link(cluster_id);

CREATE TABLE IF NOT EXISTS ci_graph_entity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name VARCHAR(220) NOT NULL,
    entity_type VARCHAR(120) NOT NULL DEFAULT 'topic',
    external_ids_json JSON,
    aliases_json JSON,
    metadata_json JSON,
    trust_score FLOAT NOT NULL DEFAULT 0.5,
    merged_into_id INTEGER REFERENCES ci_graph_entity(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_graph_entity_name ON ci_graph_entity(canonical_name);
CREATE INDEX IF NOT EXISTS ix_ci_graph_entity_type ON ci_graph_entity(entity_type);

CREATE TABLE IF NOT EXISTS ci_graph_edge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_entity_id INTEGER NOT NULL REFERENCES ci_graph_entity(id),
    target_entity_id INTEGER NOT NULL REFERENCES ci_graph_entity(id),
    relation_type VARCHAR(120) NOT NULL,
    weight FLOAT NOT NULL DEFAULT 1.0,
    metadata_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_graph_edge_source ON ci_graph_edge(source_entity_id);
CREATE INDEX IF NOT EXISTS ix_ci_graph_edge_target ON ci_graph_edge(target_entity_id);

CREATE TABLE IF NOT EXISTS ci_graph_claim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL REFERENCES ci_graph_entity(id),
    claim_text VARCHAR(1000) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'candidate',
    confidence FLOAT NOT NULL DEFAULT 0.5,
    created_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_graph_claim_entity ON ci_graph_claim(entity_id);
CREATE INDEX IF NOT EXISTS ix_ci_graph_claim_status ON ci_graph_claim(status);

CREATE TABLE IF NOT EXISTS ci_graph_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER NOT NULL REFERENCES ci_graph_claim(id),
    fused_event_id INTEGER REFERENCES ci_fused_event(id),
    ueo_id INTEGER REFERENCES ci_ueo(id),
    source_url VARCHAR(500),
    excerpt VARCHAR(1000),
    evidence_type VARCHAR(80) NOT NULL DEFAULT 'signal',
    reliability_score FLOAT NOT NULL DEFAULT 0.5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_graph_evidence_claim ON ci_graph_evidence(claim_id);
CREATE INDEX IF NOT EXISTS ix_ci_graph_evidence_fused_event ON ci_graph_evidence(fused_event_id);

CREATE TABLE IF NOT EXISTS ci_graph_event_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL REFERENCES ci_graph_entity(id),
    fused_event_id INTEGER NOT NULL REFERENCES ci_fused_event(id),
    link_role VARCHAR(80),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_id, fused_event_id)
);
CREATE INDEX IF NOT EXISTS ix_ci_graph_event_link_entity ON ci_graph_event_link(entity_id);
CREATE INDEX IF NOT EXISTS ix_ci_graph_event_link_event ON ci_graph_event_link(fused_event_id);

CREATE TABLE IF NOT EXISTS ci_learning_module (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(220) NOT NULL,
    description TEXT,
    content_json JSON NOT NULL,
    linked_entity_id INTEGER REFERENCES ci_graph_entity(id),
    linked_cluster_id INTEGER REFERENCES ci_story_cluster(id),
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_by INTEGER REFERENCES user(id),
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_learning_module_status ON ci_learning_module(status);

CREATE TABLE IF NOT EXISTS ci_guided_journey (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(220) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_guided_journey_status ON ci_guided_journey(status);

CREATE TABLE IF NOT EXISTS ci_guided_journey_module (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journey_id INTEGER NOT NULL REFERENCES ci_guided_journey(id),
    module_id INTEGER NOT NULL REFERENCES ci_learning_module(id),
    sequence INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (journey_id, module_id)
);
CREATE INDEX IF NOT EXISTS ix_ci_guided_journey_module_journey ON ci_guided_journey_module(journey_id);

CREATE TABLE IF NOT EXISTS ci_quest_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(220) NOT NULL,
    description TEXT,
    trigger_event_type VARCHAR(120),
    trigger_entity_type VARCHAR(120),
    min_cluster_score FLOAT NOT NULL DEFAULT 0.0,
    linked_module_id INTEGER REFERENCES ci_learning_module(id),
    reward_points INTEGER NOT NULL DEFAULT 0,
    commitment_type VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_quest_template_status ON ci_quest_template(status);

CREATE TABLE IF NOT EXISTS ci_quest_instance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_template_id INTEGER NOT NULL REFERENCES ci_quest_template(id),
    user_id INTEGER NOT NULL REFERENCES user(id),
    cluster_id INTEGER REFERENCES ci_story_cluster(id),
    linked_module_id INTEGER REFERENCES ci_learning_module(id),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    progress_percent FLOAT NOT NULL DEFAULT 0.0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_quest_instance_user ON ci_quest_instance(user_id);
CREATE INDEX IF NOT EXISTS ix_ci_quest_instance_status ON ci_quest_instance(status);

CREATE TABLE IF NOT EXISTS ci_quest_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_instance_id INTEGER NOT NULL REFERENCES ci_quest_instance(id),
    step_key VARCHAR(160) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'logged',
    notes VARCHAR(500),
    evidence_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_quest_progress_instance ON ci_quest_progress(quest_instance_id);
CREATE INDEX IF NOT EXISTS ix_ci_quest_progress_created_at ON ci_quest_progress(created_at);

CREATE TABLE IF NOT EXISTS ci_world_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL,
    scene_graph_json JSON NOT NULL,
    semantic_map_json JSON NOT NULL,
    layers_json JSON NOT NULL,
    permissions_manifest_json JSON NOT NULL,
    education_links_json JSON NOT NULL,
    asset_list_json JSON NOT NULL,
    snapshot_manifest_json JSON NOT NULL,
    signature VARCHAR(256) NOT NULL,
    signature_key_id VARCHAR(120) NOT NULL,
    published_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (world_id, version)
);
CREATE INDEX IF NOT EXISTS ix_ci_world_snapshot_world ON ci_world_snapshot(world_id);
CREATE INDEX IF NOT EXISTS ix_ci_world_snapshot_created_at ON ci_world_snapshot(created_at);

CREATE TABLE IF NOT EXISTS ci_world_patch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id VARCHAR(120) NOT NULL,
    from_version INTEGER NOT NULL,
    to_version INTEGER NOT NULL,
    operations_json JSON NOT NULL,
    created_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_world_patch_world ON ci_world_patch(world_id);
CREATE INDEX IF NOT EXISTS ix_ci_world_patch_version ON ci_world_patch(to_version);

CREATE TABLE IF NOT EXISTS ci_commitment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user(id),
    title VARCHAR(220) NOT NULL,
    description TEXT,
    source_type VARCHAR(120),
    source_id VARCHAR(120),
    state VARCHAR(30) NOT NULL DEFAULT 'proposed',
    trust_score FLOAT NOT NULL DEFAULT 0.5,
    created_by INTEGER REFERENCES user(id),
    completed_at DATETIME,
    verified_at DATETIME,
    archived_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_commitment_user ON ci_commitment(user_id);
CREATE INDEX IF NOT EXISTS ix_ci_commitment_state ON ci_commitment(state);

CREATE TABLE IF NOT EXISTS ci_commitment_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commitment_id INTEGER NOT NULL REFERENCES ci_commitment(id),
    evidence_type VARCHAR(120) NOT NULL DEFAULT 'checkin',
    payload_json JSON NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    submitted_by INTEGER REFERENCES user(id),
    verified_by INTEGER REFERENCES user(id),
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ci_commitment_evidence_commitment ON ci_commitment_evidence(commitment_id);
CREATE INDEX IF NOT EXISTS ix_ci_commitment_evidence_status ON ci_commitment_evidence(status);

CREATE TABLE IF NOT EXISTS ci_quest_commitment_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_instance_id INTEGER NOT NULL REFERENCES ci_quest_instance(id),
    commitment_id INTEGER NOT NULL REFERENCES ci_commitment(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (quest_instance_id, commitment_id)
);

CREATE TABLE IF NOT EXISTS control_audit_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES user(id),
    action VARCHAR(160) NOT NULL,
    target_type VARCHAR(120),
    target_id VARCHAR(120),
    method VARCHAR(20),
    route VARCHAR(320),
    ip_address VARCHAR(64),
    payload JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_control_audit_event_created_at ON control_audit_event(created_at);
CREATE INDEX IF NOT EXISTS ix_control_audit_event_actor ON control_audit_event(actor_id);
CREATE INDEX IF NOT EXISTS ix_control_audit_event_action ON control_audit_event(action);
