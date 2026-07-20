-- Presence Gardens + Presence Halls backend foundation.
-- Date: 2026-05-21
--
-- Safe additive migration. This creates the Garden, Observation, Seed,
-- SharedSpace, and Hall data spine without changing existing Presence Room,
-- Pass, Observer, Mood Board, Path, or World-readiness routes.

CREATE TABLE IF NOT EXISTS presence_garden (
    id BIGSERIAL PRIMARY KEY,
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    title VARCHAR(180) NOT NULL,
    slug VARCHAR(180),
    description TEXT,
    visibility VARCHAR(40) NOT NULL DEFAULT 'private',
    theme_key VARCHAR(80),
    pinned_observation_id INTEGER,
    pinned_mood_board_id INTEGER REFERENCES mood_board(id),
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_garden_default_observer ON presence_garden(observer_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_garden_slug ON presence_garden(slug);
CREATE INDEX IF NOT EXISTS ix_presence_garden_observer ON presence_garden(observer_id);
CREATE INDEX IF NOT EXISTS ix_presence_garden_visibility_status ON presence_garden(visibility, status);
CREATE INDEX IF NOT EXISTS ix_presence_garden_created_at ON presence_garden(created_at);

CREATE TABLE IF NOT EXISTS presence_hall (
    id BIGSERIAL PRIMARY KEY,
    host_type VARCHAR(40) NOT NULL,
    host_room_id INTEGER REFERENCES presence_node(id),
    host_observer_id INTEGER REFERENCES observer_profile(id),
    title VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT,
    hall_type VARCHAR(40) NOT NULL DEFAULT 'custom',
    visibility VARCHAR(40) NOT NULL DEFAULT 'public',
    status VARCHAR(40) NOT NULL DEFAULT 'draft',
    capacity INTEGER,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    theme_key VARCHAR(80),
    rules_text TEXT,
    attached_room_id INTEGER REFERENCES presence_node(id),
    attached_path_id INTEGER REFERENCES path(id),
    attached_mood_board_id INTEGER REFERENCES mood_board(id),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_hall_slug ON presence_hall(slug);
CREATE INDEX IF NOT EXISTS ix_presence_hall_host_room ON presence_hall(host_room_id);
CREATE INDEX IF NOT EXISTS ix_presence_hall_host_observer ON presence_hall(host_observer_id);
CREATE INDEX IF NOT EXISTS ix_presence_hall_visibility_status ON presence_hall(visibility, status);
CREATE INDEX IF NOT EXISTS ix_presence_hall_type ON presence_hall(hall_type);
CREATE INDEX IF NOT EXISTS ix_presence_hall_starts ON presence_hall(starts_at);

CREATE TABLE IF NOT EXISTS observation (
    id BIGSERIAL PRIMARY KEY,
    author_observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    garden_id INTEGER REFERENCES presence_garden(id),
    hall_id INTEGER REFERENCES presence_hall(id),
    room_id INTEGER REFERENCES presence_node(id),
    path_id INTEGER REFERENCES path(id),
    mood_board_id INTEGER REFERENCES mood_board(id),
    observation_type VARCHAR(40) NOT NULL DEFAULT 'text',
    body TEXT NOT NULL,
    title VARCHAR(180),
    visibility VARCHAR(40) NOT NULL DEFAULT 'garden',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    moderation_state VARCHAR(40) NOT NULL DEFAULT 'clean',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_observation_author ON observation(author_observer_id);
CREATE INDEX IF NOT EXISTS ix_observation_garden_created ON observation(garden_id, created_at);
CREATE INDEX IF NOT EXISTS ix_observation_hall_created ON observation(hall_id, created_at);
CREATE INDEX IF NOT EXISTS ix_observation_room ON observation(room_id);
CREATE INDEX IF NOT EXISTS ix_observation_path ON observation(path_id);
CREATE INDEX IF NOT EXISTS ix_observation_mood_board ON observation(mood_board_id);
CREATE INDEX IF NOT EXISTS ix_observation_visibility_status ON observation(visibility, status);
CREATE INDEX IF NOT EXISTS ix_observation_moderation ON observation(moderation_state);
CREATE INDEX IF NOT EXISTS ix_observation_created_at ON observation(created_at);

CREATE TABLE IF NOT EXISTS observation_echo (
    id BIGSERIAL PRIMARY KEY,
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    source_observation_id INTEGER REFERENCES observation(id),
    source_room_id INTEGER REFERENCES presence_node(id),
    source_mood_board_id INTEGER REFERENCES mood_board(id),
    source_path_id INTEGER REFERENCES path(id),
    source_hall_id INTEGER REFERENCES presence_hall(id),
    commentary TEXT,
    target_garden_id INTEGER NOT NULL REFERENCES presence_garden(id),
    visibility VARCHAR(40) NOT NULL DEFAULT 'public',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_observation_echo_observer ON observation_echo(observer_id);
CREATE INDEX IF NOT EXISTS ix_observation_echo_target_garden ON observation_echo(target_garden_id);
CREATE INDEX IF NOT EXISTS ix_observation_echo_source_observation ON observation_echo(source_observation_id);
CREATE INDEX IF NOT EXISTS ix_observation_echo_status ON observation_echo(status);
CREATE INDEX IF NOT EXISTS ix_observation_echo_created_at ON observation_echo(created_at);

CREATE TABLE IF NOT EXISTS garden_seed (
    id BIGSERIAL PRIMARY KEY,
    garden_id INTEGER NOT NULL REFERENCES presence_garden(id),
    seed_type VARCHAR(40) NOT NULL,
    seed_id INTEGER,
    source_type VARCHAR(60) NOT NULL DEFAULT 'manual',
    source_ref_id VARCHAR(120),
    base_strength NUMERIC(10,3) NOT NULL DEFAULT 20,
    current_weight NUMERIC(10,3) NOT NULL DEFAULT 20,
    half_life_days NUMERIC(10,3) NOT NULL DEFAULT 7,
    nurture_multiplier NUMERIC(10,3) NOT NULL DEFAULT 1,
    quality_score NUMERIC(10,3) NOT NULL DEFAULT 1,
    last_shared_space_at TIMESTAMP,
    last_nurtured_at TIMESTAMP,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    reason_label VARCHAR(240),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_garden_seed_target ON garden_seed(garden_id, seed_type, seed_id);
CREATE INDEX IF NOT EXISTS ix_garden_seed_garden ON garden_seed(garden_id);
CREATE INDEX IF NOT EXISTS ix_garden_seed_type_id ON garden_seed(seed_type, seed_id);
CREATE INDEX IF NOT EXISTS ix_garden_seed_source ON garden_seed(source_type, source_ref_id);
CREATE INDEX IF NOT EXISTS ix_garden_seed_status_weight ON garden_seed(status, current_weight);
CREATE INDEX IF NOT EXISTS ix_garden_seed_last_shared ON garden_seed(last_shared_space_at);
CREATE INDEX IF NOT EXISTS ix_garden_seed_updated_at ON garden_seed(updated_at);

CREATE TABLE IF NOT EXISTS garden_nurture (
    id BIGSERIAL PRIMARY KEY,
    garden_id INTEGER NOT NULL REFERENCES presence_garden(id),
    seed_id INTEGER NOT NULL REFERENCES garden_seed(id),
    observer_id INTEGER NOT NULL REFERENCES observer_profile(id),
    nurture_type VARCHAR(60) NOT NULL,
    strength_delta NUMERIC(10,3) NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS ix_garden_nurture_garden ON garden_nurture(garden_id);
CREATE INDEX IF NOT EXISTS ix_garden_nurture_seed ON garden_nurture(seed_id);
CREATE INDEX IF NOT EXISTS ix_garden_nurture_observer ON garden_nurture(observer_id);
CREATE INDEX IF NOT EXISTS ix_garden_nurture_type_created ON garden_nurture(nurture_type, created_at);

CREATE TABLE IF NOT EXISTS garden_prune (
    id BIGSERIAL PRIMARY KEY,
    garden_id INTEGER NOT NULL REFERENCES presence_garden(id),
    seed_id INTEGER REFERENCES garden_seed(id),
    target_type VARCHAR(40) NOT NULL,
    target_id INTEGER NOT NULL,
    prune_type VARCHAR(40) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_garden_prune_garden ON garden_prune(garden_id);
CREATE INDEX IF NOT EXISTS ix_garden_prune_seed ON garden_prune(seed_id);
CREATE INDEX IF NOT EXISTS ix_garden_prune_target ON garden_prune(target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_garden_prune_type ON garden_prune(prune_type);

CREATE TABLE IF NOT EXISTS shared_space (
    id BIGSERIAL PRIMARY KEY,
    space_type VARCHAR(60) NOT NULL,
    space_id INTEGER,
    observer_id INTEGER REFERENCES observer_profile(id),
    room_id INTEGER REFERENCES presence_node(id),
    hall_id INTEGER REFERENCES presence_hall(id),
    path_id INTEGER REFERENCES path(id),
    event_id INTEGER REFERENCES event(id),
    strength NUMERIC(10,3) NOT NULL DEFAULT 20,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_shared_space_type_id ON shared_space(space_type, space_id);
CREATE INDEX IF NOT EXISTS ix_shared_space_observer ON shared_space(observer_id);
CREATE INDEX IF NOT EXISTS ix_shared_space_room ON shared_space(room_id);
CREATE INDEX IF NOT EXISTS ix_shared_space_hall ON shared_space(hall_id);
CREATE INDEX IF NOT EXISTS ix_shared_space_path ON shared_space(path_id);
CREATE INDEX IF NOT EXISTS ix_shared_space_event ON shared_space(event_id);
CREATE INDEX IF NOT EXISTS ix_shared_space_occurred_at ON shared_space(occurred_at);

CREATE TABLE IF NOT EXISTS hall_session (
    id BIGSERIAL PRIMARY KEY,
    hall_id INTEGER NOT NULL REFERENCES presence_hall(id),
    title VARCHAR(180) NOT NULL,
    description TEXT,
    session_type VARCHAR(40) NOT NULL DEFAULT 'custom',
    status VARCHAR(40) NOT NULL DEFAULT 'scheduled',
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_hall_session_hall ON hall_session(hall_id);
CREATE INDEX IF NOT EXISTS ix_hall_session_status ON hall_session(status);
CREATE INDEX IF NOT EXISTS ix_hall_session_starts ON hall_session(starts_at);

CREATE TABLE IF NOT EXISTS hall_participant (
    id BIGSERIAL PRIMARY KEY,
    hall_id INTEGER NOT NULL REFERENCES presence_hall(id),
    session_id INTEGER REFERENCES hall_session(id),
    observer_id INTEGER REFERENCES observer_profile(id),
    guest_token VARCHAR(160),
    room_id INTEGER REFERENCES presence_node(id),
    role VARCHAR(40) NOT NULL DEFAULT 'participant',
    status VARCHAR(40) NOT NULL DEFAULT 'joined',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP,
    left_at TIMESTAMP,
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS ix_hall_participant_hall ON hall_participant(hall_id);
CREATE INDEX IF NOT EXISTS ix_hall_participant_session ON hall_participant(session_id);
CREATE INDEX IF NOT EXISTS ix_hall_participant_observer ON hall_participant(observer_id);
CREATE INDEX IF NOT EXISTS ix_hall_participant_guest ON hall_participant(guest_token);
CREATE INDEX IF NOT EXISTS ix_hall_participant_status ON hall_participant(status);
CREATE INDEX IF NOT EXISTS ix_hall_participant_last_seen ON hall_participant(last_seen_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hall_participant_observer_active
    ON hall_participant(hall_id, COALESCE(session_id, 0), observer_id)
    WHERE observer_id IS NOT NULL AND status IN ('joined', 'present', 'away');

CREATE TABLE IF NOT EXISTS hall_zone (
    id BIGSERIAL PRIMARY KEY,
    hall_id INTEGER NOT NULL REFERENCES presence_hall(id),
    zone_type VARCHAR(40) NOT NULL DEFAULT 'custom',
    title VARCHAR(180) NOT NULL,
    description TEXT,
    position_json JSONB,
    capacity INTEGER,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_hall_zone_hall ON hall_zone(hall_id);
CREATE INDEX IF NOT EXISTS ix_hall_zone_type ON hall_zone(zone_type);
CREATE INDEX IF NOT EXISTS ix_hall_zone_status ON hall_zone(status);

CREATE TABLE IF NOT EXISTS hall_portal (
    id BIGSERIAL PRIMARY KEY,
    hall_id INTEGER NOT NULL REFERENCES presence_hall(id),
    zone_id INTEGER REFERENCES hall_zone(id),
    target_type VARCHAR(40) NOT NULL,
    target_id INTEGER,
    external_url VARCHAR(700),
    label VARCHAR(160) NOT NULL,
    description TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_hall_portal_hall ON hall_portal(hall_id);
CREATE INDEX IF NOT EXISTS ix_hall_portal_zone ON hall_portal(zone_id);
CREATE INDEX IF NOT EXISTS ix_hall_portal_target ON hall_portal(target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_hall_portal_status ON hall_portal(status);

CREATE TABLE IF NOT EXISTS hall_stall (
    id BIGSERIAL PRIMARY KEY,
    hall_id INTEGER NOT NULL REFERENCES presence_hall(id),
    zone_id INTEGER REFERENCES hall_zone(id),
    room_id INTEGER NOT NULL REFERENCES presence_node(id),
    placement_type VARCHAR(40) NOT NULL DEFAULT 'standard',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hall_stall_room ON hall_stall(hall_id, room_id);
CREATE INDEX IF NOT EXISTS ix_hall_stall_hall ON hall_stall(hall_id);
CREATE INDEX IF NOT EXISTS ix_hall_stall_zone ON hall_stall(zone_id);
CREATE INDEX IF NOT EXISTS ix_hall_stall_room ON hall_stall(room_id);
CREATE INDEX IF NOT EXISTS ix_hall_stall_status ON hall_stall(status);

CREATE TABLE IF NOT EXISTS hall_moderation_action (
    id BIGSERIAL PRIMARY KEY,
    hall_id INTEGER NOT NULL REFERENCES presence_hall(id),
    actor_user_id INTEGER REFERENCES "user"(id),
    actor_observer_id INTEGER REFERENCES observer_profile(id),
    target_type VARCHAR(40) NOT NULL,
    target_id INTEGER NOT NULL,
    action_type VARCHAR(40) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS ix_hall_moderation_hall ON hall_moderation_action(hall_id);
CREATE INDEX IF NOT EXISTS ix_hall_moderation_actor_user ON hall_moderation_action(actor_user_id);
CREATE INDEX IF NOT EXISTS ix_hall_moderation_actor_observer ON hall_moderation_action(actor_observer_id);
CREATE INDEX IF NOT EXISTS ix_hall_moderation_target ON hall_moderation_action(target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_hall_moderation_action_type ON hall_moderation_action(action_type);
CREATE INDEX IF NOT EXISTS ix_hall_moderation_created_at ON hall_moderation_action(created_at);

CREATE TABLE IF NOT EXISTS hall_activity_event (
    id BIGSERIAL PRIMARY KEY,
    hall_id INTEGER NOT NULL REFERENCES presence_hall(id),
    event_type VARCHAR(40) NOT NULL,
    observer_id INTEGER REFERENCES observer_profile(id),
    guest_token VARCHAR(160),
    room_id INTEGER REFERENCES presence_node(id),
    portal_id INTEGER REFERENCES hall_portal(id),
    stall_id INTEGER REFERENCES hall_stall(id),
    session_id INTEGER REFERENCES hall_session(id),
    source VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS ix_hall_activity_event_hall ON hall_activity_event(hall_id);
CREATE INDEX IF NOT EXISTS ix_hall_activity_event_type ON hall_activity_event(event_type);
CREATE INDEX IF NOT EXISTS ix_hall_activity_event_observer ON hall_activity_event(observer_id);
CREATE INDEX IF NOT EXISTS ix_hall_activity_event_portal ON hall_activity_event(portal_id);
CREATE INDEX IF NOT EXISTS ix_hall_activity_event_stall ON hall_activity_event(stall_id);
CREATE INDEX IF NOT EXISTS ix_hall_activity_event_session ON hall_activity_event(session_id);
CREATE INDEX IF NOT EXISTS ix_hall_activity_event_created_at ON hall_activity_event(created_at);
