-- PEACH Gate 9: Contribution + ConsentRecord persistence foundation

CREATE TABLE IF NOT EXISTS peach_contribution (
    id SERIAL PRIMARY KEY,
    field_id VARCHAR(120) NOT NULL,
    field_slug VARCHAR(180) NOT NULL,
    contribution_type VARCHAR(80) NOT NULL,
    contributor_chosen_credit VARCHAR(200) NOT NULL,
    contact_method VARCHAR(240) NOT NULL,
    body_text TEXT NOT NULL,
    visibility_preference VARCHAR(80) NOT NULL,
    credit_preference VARCHAR(120) NOT NULL,
    permission_for_yield BOOLEAN NOT NULL DEFAULT FALSE,
    sensitive_material_flag BOOLEAN NOT NULL DEFAULT FALSE,
    youth_material_flag BOOLEAN NOT NULL DEFAULT FALSE,
    review_status VARCHAR(40) NOT NULL DEFAULT 'pending_review',
    public_display BOOLEAN NOT NULL DEFAULT FALSE,
    steward_note TEXT,
    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    reviewed_by INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_peach_contribution_review_status CHECK (review_status IN ('pending_review', 'held', 'accepted_private', 'rejected')),
    CONSTRAINT ck_peach_contribution_public_display_false CHECK (public_display = FALSE)
);

CREATE INDEX IF NOT EXISTS ix_peach_contribution_field_slug ON peach_contribution(field_slug);
CREATE INDEX IF NOT EXISTS ix_peach_contribution_review_status ON peach_contribution(review_status);
CREATE INDEX IF NOT EXISTS ix_peach_contribution_created_at ON peach_contribution(created_at);

CREATE TABLE IF NOT EXISTS peach_consent_record (
    id SERIAL PRIMARY KEY,
    contribution_id INTEGER NOT NULL REFERENCES peach_contribution(id) ON DELETE CASCADE,
    consent_version VARCHAR(80) NOT NULL,
    consent_level VARCHAR(80) NOT NULL,
    permission_for_yield BOOLEAN NOT NULL DEFAULT FALSE,
    credit_preference VARCHAR(120) NOT NULL,
    visibility_preference VARCHAR(80) NOT NULL,
    accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    steward_reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    steward_reviewed_by INTEGER REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS ix_peach_consent_record_contribution ON peach_consent_record(contribution_id);
CREATE INDEX IF NOT EXISTS ix_peach_consent_record_created_at ON peach_consent_record(created_at);

CREATE TABLE IF NOT EXISTS peach_contribution_review_event (
    id SERIAL PRIMARY KEY,
    contribution_id INTEGER NOT NULL REFERENCES peach_contribution(id) ON DELETE CASCADE,
    previous_status VARCHAR(40) NOT NULL,
    new_status VARCHAR(40) NOT NULL,
    steward_id INTEGER REFERENCES "user"(id),
    steward_note TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_peach_review_event_contribution ON peach_contribution_review_event(contribution_id);
CREATE INDEX IF NOT EXISTS ix_peach_review_event_created_at ON peach_contribution_review_event(created_at);

