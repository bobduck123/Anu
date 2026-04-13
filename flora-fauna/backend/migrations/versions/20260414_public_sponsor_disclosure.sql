-- ANU-019 operational migration:
-- Public sponsor disclosure table for non-sqlite DB environments.

CREATE TABLE IF NOT EXISTS public_sponsor_disclosure (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(180) NOT NULL,
    sponsor_name VARCHAR(180) NOT NULL,
    sponsor_type VARCHAR(80),
    sponsored_surface VARCHAR(220) NOT NULL,
    placement_type VARCHAR(80) NOT NULL,
    disclosure_label VARCHAR(140) NOT NULL DEFAULT 'Sponsored support disclosure',
    public_note VARCHAR(320) NOT NULL,
    disclosure_text TEXT NOT NULL,
    active_from TIMESTAMP NULL,
    active_until TIMESTAMP NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    trust_report_slug VARCHAR(180),
    archive_record_slug VARCHAR(180),
    metadata_json JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_public_sponsor_disclosure_slug
ON public_sponsor_disclosure (slug);

CREATE INDEX IF NOT EXISTS ix_public_sponsor_disclosure_surface
ON public_sponsor_disclosure (sponsored_surface);

CREATE INDEX IF NOT EXISTS ix_public_sponsor_disclosure_report_slug
ON public_sponsor_disclosure (trust_report_slug);

CREATE INDEX IF NOT EXISTS ix_public_sponsor_disclosure_archive_slug
ON public_sponsor_disclosure (archive_record_slug);

CREATE INDEX IF NOT EXISTS ix_public_sponsor_disclosure_active
ON public_sponsor_disclosure (is_active);
