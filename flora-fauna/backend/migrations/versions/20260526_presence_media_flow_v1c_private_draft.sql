-- Presence Media Flow V1C: protected draft media lifecycle.
-- Date: 2026-05-26
--
-- Safe additive migration. Run before enabling PRESENCE_MEDIA_DRAFT_BUCKET.
-- Uploaded originals remain server/owner scoped; only explicit publish writes
-- a visitor-readable public_url and published_storage_key.

CREATE TABLE IF NOT EXISTS presence_media_asset (
    id VARCHAR(64) PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    tenant_id INTEGER,
    owner_user_id INTEGER REFERENCES "user"(id),
    status VARCHAR(40) NOT NULL DEFAULT 'draft_uploaded',
    visibility VARCHAR(40) NOT NULL DEFAULT 'public_unlisted',
    role VARCHAR(40) NOT NULL DEFAULT 'unused',
    original_filename VARCHAR(255),
    mime_type VARCHAR(80) NOT NULL,
    size_bytes INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    checksum_sha256 VARCHAR(64),
    storage_backend VARCHAR(40) NOT NULL,
    draft_storage_key VARCHAR(700),
    published_storage_key VARCHAR(700),
    public_url VARCHAR(1000),
    alt_text VARCHAR(1000),
    caption VARCHAR(2000),
    focal_point JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITHOUT TIME ZONE,
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ck_presence_media_asset_status CHECK (
        status IN (
            'draft_uploaded', 'draft_attached', 'processing', 'ready',
            'published', 'replaced', 'orphaned', 'deleted', 'failed'
        )
    ),
    CONSTRAINT ck_presence_media_asset_visibility CHECK (
        visibility IN ('private_draft', 'signed_preview', 'public_unlisted', 'public_published')
    )
);

CREATE INDEX IF NOT EXISTS ix_presence_media_asset_room_status
    ON presence_media_asset (room_id, status);

CREATE INDEX IF NOT EXISTS ix_presence_media_asset_visibility
    ON presence_media_asset (visibility);

CREATE INDEX IF NOT EXISTS ix_presence_media_asset_created_at
    ON presence_media_asset (created_at);
