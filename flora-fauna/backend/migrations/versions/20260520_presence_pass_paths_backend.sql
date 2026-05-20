-- Presence Passes, Room Keys, Encounters, Observers, Paths, and World readiness.
-- Date: 2026-05-20
--
-- Safe additive migration. This creates the backend spine for NFC/QR Room entry
-- and future Paths without changing current public Presence Room routes.

CREATE TABLE IF NOT EXISTS presence_pass (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES presence_node(id),
    owner_id INTEGER REFERENCES "user"(id),
    pass_type VARCHAR(40) NOT NULL DEFAULT 'qr',
    label VARCHAR(160) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    default_room_key_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_presence_pass_room ON presence_pass(room_id);
CREATE INDEX IF NOT EXISTS ix_presence_pass_owner ON presence_pass(owner_id);
CREATE INDEX IF NOT EXISTS ix_presence_pass_status ON presence_pass(status);
CREATE INDEX IF NOT EXISTS ix_presence_pass_type ON presence_pass(pass_type);

CREATE TABLE IF NOT EXISTS room_key (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES presence_node(id),
    presence_pass_id INTEGER REFERENCES presence_pass(id),
    key_type VARCHAR(40) NOT NULL DEFAULT 'direct',
    public_token VARCHAR(160) NOT NULL,
    campaign_label VARCHAR(160),
    physical_batch_id VARCHAR(120),
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_by INTEGER REFERENCES "user"(id),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_key_public_token ON room_key(public_token);
CREATE INDEX IF NOT EXISTS ix_room_key_room ON room_key(room_id);
CREATE INDEX IF NOT EXISTS ix_room_key_presence_pass ON room_key(presence_pass_id);
CREATE INDEX IF NOT EXISTS ix_room_key_status ON room_key(status);
CREATE INDEX IF NOT EXISTS ix_room_key_type ON room_key(key_type);
CREATE INDEX IF NOT EXISTS ix_room_key_created_at ON room_key(created_at);

CREATE TABLE IF NOT EXISTS observer_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    alias VARCHAR(80) NOT NULL,
    mask_name VARCHAR(120),
    avatar_key VARCHAR(120),
    bio_fragment TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    visibility VARCHAR(40) NOT NULL DEFAULT 'public_mask',
    self_promotion_locked BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_observer_profile_alias ON observer_profile(alias);
CREATE UNIQUE INDEX IF NOT EXISTS uq_observer_profile_user ON observer_profile(user_id);
CREATE INDEX IF NOT EXISTS ix_observer_profile_user ON observer_profile(user_id);
CREATE INDEX IF NOT EXISTS ix_observer_profile_status ON observer_profile(status);
CREATE INDEX IF NOT EXISTS ix_observer_profile_visibility ON observer_profile(visibility);

CREATE TABLE IF NOT EXISTS encounter (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES presence_node(id),
    room_key_id INTEGER REFERENCES room_key(id),
    visitor_type VARCHAR(40) NOT NULL DEFAULT 'guest',
    observer_id INTEGER REFERENCES observer_profile(id),
    anonymous_visitor_id VARCHAR(120),
    source VARCHAR(40) NOT NULL DEFAULT 'unknown',
    context_label VARCHAR(160),
    location_id INTEGER,
    event_id INTEGER,
    referrer VARCHAR(700),
    user_agent_hash VARCHAR(96),
    ip_hash VARCHAR(96),
    privacy_level VARCHAR(40) NOT NULL DEFAULT 'aggregate_only',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_encounter_room_created ON encounter(room_id, created_at);
CREATE INDEX IF NOT EXISTS ix_encounter_room_key ON encounter(room_key_id);
CREATE INDEX IF NOT EXISTS ix_encounter_observer ON encounter(observer_id);
CREATE INDEX IF NOT EXISTS ix_encounter_source ON encounter(source);
CREATE INDEX IF NOT EXISTS ix_encounter_privacy ON encounter(privacy_level);

CREATE TABLE IF NOT EXISTS room_connection (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES presence_node(id),
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    first_encounter_id INTEGER REFERENCES encounter(id),
    status VARCHAR(40) NOT NULL DEFAULT 'entered',
    saved_at TIMESTAMP,
    followed_at TIMESTAMP,
    revealed_at TIMESTAMP,
    last_interaction_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_connection_observer_room ON room_connection(observer_id, room_id);
CREATE INDEX IF NOT EXISTS ix_room_connection_room ON room_connection(room_id);
CREATE INDEX IF NOT EXISTS ix_room_connection_observer ON room_connection(observer_id);
CREATE INDEX IF NOT EXISTS ix_room_connection_status ON room_connection(status);
CREATE INDEX IF NOT EXISTS ix_room_connection_last_interaction ON room_connection(last_interaction_at);

CREATE TABLE IF NOT EXISTS passport_stamp (
    id BIGSERIAL PRIMARY KEY,
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    room_id INTEGER REFERENCES presence_node(id),
    encounter_id INTEGER REFERENCES encounter(id),
    path_id INTEGER,
    stamp_type VARCHAR(40) NOT NULL,
    label VARCHAR(180),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_passport_stamp_observer_created ON passport_stamp(observer_id, created_at);
CREATE INDEX IF NOT EXISTS ix_passport_stamp_room ON passport_stamp(room_id);
CREATE INDEX IF NOT EXISTS ix_passport_stamp_path ON passport_stamp(path_id);
CREATE INDEX IF NOT EXISTS ix_passport_stamp_type ON passport_stamp(stamp_type);

CREATE TABLE IF NOT EXISTS mood_board (
    id BIGSERIAL PRIMARY KEY,
    owner_type VARCHAR(40) NOT NULL,
    observer_id INTEGER REFERENCES observer_profile(id),
    room_id INTEGER REFERENCES presence_node(id),
    title VARCHAR(180) NOT NULL,
    description TEXT,
    visibility VARCHAR(40) NOT NULL DEFAULT 'private',
    board_type VARCHAR(40) NOT NULL DEFAULT 'general',
    cover_item_id INTEGER,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_mood_board_owner ON mood_board(owner_type, observer_id, room_id);
CREATE INDEX IF NOT EXISTS ix_mood_board_visibility ON mood_board(visibility);
CREATE INDEX IF NOT EXISTS ix_mood_board_status ON mood_board(status);
CREATE INDEX IF NOT EXISTS ix_mood_board_type ON mood_board(board_type);

CREATE TABLE IF NOT EXISTS mood_board_item (
    id BIGSERIAL PRIMARY KEY,
    mood_board_id INTEGER NOT NULL REFERENCES mood_board(id),
    item_type VARCHAR(40) NOT NULL,
    item_id INTEGER,
    external_url VARCHAR(700),
    title VARCHAR(180),
    description TEXT,
    image_url VARCHAR(700),
    tags_json JSONB,
    position_index INTEGER,
    source_context VARCHAR(240),
    added_by_observer_id INTEGER REFERENCES observer_profile(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_mood_board_item_board ON mood_board_item(mood_board_id);
CREATE INDEX IF NOT EXISTS ix_mood_board_item_type ON mood_board_item(item_type);
CREATE INDEX IF NOT EXISTS ix_mood_board_item_position ON mood_board_item(mood_board_id, position_index);

CREATE TABLE IF NOT EXISTS field_note (
    id BIGSERIAL PRIMARY KEY,
    author_observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    room_id INTEGER REFERENCES presence_node(id),
    path_id INTEGER,
    encounter_id INTEGER REFERENCES encounter(id),
    mood_board_id INTEGER REFERENCES mood_board(id),
    body TEXT NOT NULL,
    visibility VARCHAR(40) NOT NULL DEFAULT 'public',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    moderation_state VARCHAR(40) NOT NULL DEFAULT 'clean',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_field_note_author ON field_note(author_observer_id);
CREATE INDEX IF NOT EXISTS ix_field_note_room ON field_note(room_id);
CREATE INDEX IF NOT EXISTS ix_field_note_path ON field_note(path_id);
CREATE INDEX IF NOT EXISTS ix_field_note_status ON field_note(status);
CREATE INDEX IF NOT EXISTS ix_field_note_moderation ON field_note(moderation_state);
CREATE INDEX IF NOT EXISTS ix_field_note_created_at ON field_note(created_at);

CREATE TABLE IF NOT EXISTS signal (
    id BIGSERIAL PRIMARY KEY,
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    target_type VARCHAR(40) NOT NULL,
    target_id INTEGER NOT NULL,
    signal_type VARCHAR(40) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_signal_observer_target_type ON signal(observer_id, target_type, target_id, signal_type);
CREATE INDEX IF NOT EXISTS ix_signal_observer ON signal(observer_id);
CREATE INDEX IF NOT EXISTS ix_signal_target ON signal(target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_signal_type ON signal(signal_type);

CREATE TABLE IF NOT EXISTS path (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    path_type VARCHAR(40) NOT NULL DEFAULT 'generated',
    trailhead_type VARCHAR(40) NOT NULL DEFAULT 'room',
    trailhead_id INTEGER,
    generated_by VARCHAR(40) NOT NULL DEFAULT 'system',
    visibility VARCHAR(40) NOT NULL DEFAULT 'unlisted',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    mood_tags_json JSONB,
    place_tags_json JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_path_type ON path(path_type);
CREATE INDEX IF NOT EXISTS ix_path_trailhead ON path(trailhead_type, trailhead_id);
CREATE INDEX IF NOT EXISTS ix_path_visibility_status ON path(visibility, status);
CREATE INDEX IF NOT EXISTS ix_path_created_at ON path(created_at);

CREATE TABLE IF NOT EXISTS path_waypoint (
    id BIGSERIAL PRIMARY KEY,
    path_id INTEGER NOT NULL REFERENCES path(id),
    waypoint_type VARCHAR(40) NOT NULL,
    waypoint_id INTEGER,
    title VARCHAR(180),
    reason_shown TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_path_waypoint_path_order ON path_waypoint(path_id, order_index);
CREATE INDEX IF NOT EXISTS ix_path_waypoint_type ON path_waypoint(waypoint_type);

CREATE TABLE IF NOT EXISTS path_choice (
    id BIGSERIAL PRIMARY KEY,
    path_id INTEGER NOT NULL REFERENCES path(id),
    from_waypoint_id INTEGER NOT NULL REFERENCES path_waypoint(id),
    label VARCHAR(120) NOT NULL,
    direction_type VARCHAR(40) NOT NULL,
    next_path_id INTEGER REFERENCES path(id),
    next_waypoint_id INTEGER REFERENCES path_waypoint(id),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_path_choice_path ON path_choice(path_id);
CREATE INDEX IF NOT EXISTS ix_path_choice_from ON path_choice(from_waypoint_id);
CREATE INDEX IF NOT EXISTS ix_path_choice_direction ON path_choice(direction_type);

CREATE TABLE IF NOT EXISTS path_walk (
    id BIGSERIAL PRIMARY KEY,
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    path_id INTEGER NOT NULL REFERENCES path(id),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    abandoned_at TIMESTAMP,
    saved BOOLEAN NOT NULL DEFAULT FALSE,
    conversion_event VARCHAR(80),
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS ix_path_walk_observer ON path_walk(observer_id);
CREATE INDEX IF NOT EXISTS ix_path_walk_path ON path_walk(path_id);
CREATE INDEX IF NOT EXISTS ix_path_walk_started ON path_walk(started_at);

CREATE TABLE IF NOT EXISTS path_trace (
    id BIGSERIAL PRIMARY KEY,
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    path_id INTEGER NOT NULL REFERENCES path(id),
    waypoint_id INTEGER REFERENCES path_waypoint(id),
    trace_type VARCHAR(40) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS ix_path_trace_observer ON path_trace(observer_id);
CREATE INDEX IF NOT EXISTS ix_path_trace_path ON path_trace(path_id);
CREATE INDEX IF NOT EXISTS ix_path_trace_waypoint ON path_trace(waypoint_id);
CREATE INDEX IF NOT EXISTS ix_path_trace_type ON path_trace(trace_type);
CREATE INDEX IF NOT EXISTS ix_path_trace_created ON path_trace(created_at);

CREATE TABLE IF NOT EXISTS moderation_flag (
    id BIGSERIAL PRIMARY KEY,
    reporter_user_id INTEGER REFERENCES "user"(id),
    reporter_observer_id INTEGER REFERENCES observer_profile(id),
    target_type VARCHAR(40) NOT NULL,
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'open',
    admin_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_moderation_flag_reporter_user ON moderation_flag(reporter_user_id);
CREATE INDEX IF NOT EXISTS ix_moderation_flag_reporter_observer ON moderation_flag(reporter_observer_id);
CREATE INDEX IF NOT EXISTS ix_moderation_flag_target ON moderation_flag(target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_moderation_flag_status ON moderation_flag(status);

CREATE TABLE IF NOT EXISTS world_readiness_metric (
    id BIGSERIAL PRIMARY KEY,
    scope_type VARCHAR(40) NOT NULL DEFAULT 'global',
    scope_id VARCHAR(120),
    active_rooms_count INTEGER NOT NULL DEFAULT 0,
    active_observers_count INTEGER NOT NULL DEFAULT 0,
    encounters_count INTEGER NOT NULL DEFAULT 0,
    saved_rooms_count INTEGER NOT NULL DEFAULT 0,
    mood_boards_count INTEGER NOT NULL DEFAULT 0,
    field_notes_count INTEGER NOT NULL DEFAULT 0,
    paths_count INTEGER NOT NULL DEFAULT 0,
    cross_room_connections_count INTEGER NOT NULL DEFAULT 0,
    readiness_score NUMERIC(6,3) NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'hidden',
    computed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_world_readiness_scope ON world_readiness_metric(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS ix_world_readiness_status ON world_readiness_metric(status);
CREATE INDEX IF NOT EXISTS ix_world_readiness_computed ON world_readiness_metric(computed_at);
