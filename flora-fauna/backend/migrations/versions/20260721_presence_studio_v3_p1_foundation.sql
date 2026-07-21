-- Presence Studio V3 P1 owner-private state and draft mutation revision.
-- Date: 2026-07-21
--
-- Additive only. Existing config JSON, version, status, media, and public data
-- are not rewritten. Existing editable configs begin at mutation revision 1.

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE presence_editable_config
    ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;

CREATE TABLE presence_studio_v3_state (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER NOT NULL REFERENCES "user"(id),
    room_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    base_config_id INTEGER NOT NULL REFERENCES presence_editable_config(id) ON DELETE CASCADE,
    base_source_kind VARCHAR(40) NOT NULL,
    base_status VARCHAR(40) NOT NULL,
    base_version INTEGER NOT NULL,
    base_revision INTEGER NOT NULL,
    base_schema_version VARCHAR(120) NOT NULL,
    base_fingerprint VARCHAR(64) NOT NULL,
    metadata_schema_version VARCHAR(120) NOT NULL,
    metadata_revision INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_id INTEGER REFERENCES "user"(id),
    updated_by_user_id INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presence_studio_v3_state_owner_room
        UNIQUE (owner_user_id, room_id),
    CONSTRAINT ck_presence_studio_v3_state_base_status
        CHECK (base_status IN ('draft', 'published')),
    CONSTRAINT ck_presence_studio_v3_state_source_kind
        CHECK (base_source_kind IN ('draft', 'published')),
    CONSTRAINT ck_presence_studio_v3_state_revisions
        CHECK (base_revision > 0 AND metadata_revision > 0),
    CONSTRAINT ck_presence_studio_v3_state_fingerprint
        CHECK (length(base_fingerprint) = 64 AND base_fingerprint = lower(base_fingerprint))
);

CREATE INDEX ix_presence_studio_v3_state_room_base
    ON presence_studio_v3_state (room_id, base_config_id);

CREATE INDEX ix_presence_studio_v3_state_fingerprint
    ON presence_studio_v3_state (base_fingerprint);

COMMIT;

-- Operational rollback (run only after endpoint/caller removal and explicit
-- approval in non-disposable environments):
-- DROP TABLE IF EXISTS presence_studio_v3_state;
-- ALTER TABLE presence_editable_config DROP COLUMN IF EXISTS revision;
