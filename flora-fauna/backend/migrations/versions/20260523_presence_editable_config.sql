-- Presence Studio editable config foundation.
-- Date: 2026-05-23
--
-- Safe additive migration. Existing PresenceNode metadata remains intact.
-- Draft/published uniqueness is enforced with partial indexes so archived
-- versions can accumulate as rollback history.

CREATE TABLE IF NOT EXISTS presence_editable_config (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(40) NOT NULL DEFAULT 'draft',
    renderer_key VARCHAR(120),
    scene_config JSONB,
    style_dna JSONB,
    motion_config JSONB,
    asset_config JSONB,
    content_config JSONB,
    roomkey_config JSONB,
    enquiry_config JSONB,
    locked_fields JSONB,
    created_by_user_id INTEGER REFERENCES "user"(id),
    updated_by_user_id INTEGER REFERENCES "user"(id),
    published_by_user_id INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITHOUT TIME ZONE,
    archived_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uq_presence_editable_config_room_version UNIQUE (room_id, version),
    CONSTRAINT ck_presence_editable_config_status
        CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_editable_config_one_draft
    ON presence_editable_config (room_id)
    WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_editable_config_one_published
    ON presence_editable_config (room_id)
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS ix_presence_editable_config_room
    ON presence_editable_config (room_id);

CREATE INDEX IF NOT EXISTS ix_presence_editable_config_status
    ON presence_editable_config (status);

CREATE INDEX IF NOT EXISTS ix_presence_editable_config_renderer
    ON presence_editable_config (renderer_key);

CREATE INDEX IF NOT EXISTS ix_presence_editable_config_published_at
    ON presence_editable_config (published_at);
