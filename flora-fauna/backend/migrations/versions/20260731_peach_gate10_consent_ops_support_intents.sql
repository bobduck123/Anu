-- PEACH Gate 10: Consent operation requests and non-payment SupportIntent persistence

CREATE TABLE IF NOT EXISTS peach_consent_operation_request (
    id SERIAL PRIMARY KEY,
    contribution_id INTEGER REFERENCES peach_contribution(id) ON DELETE SET NULL,
    contributor_contact VARCHAR(240) NOT NULL,
    contributor_credit_or_name VARCHAR(200) NOT NULL,
    operation_type VARCHAR(40) NOT NULL,
    request_detail TEXT NOT NULL,
    status VARCHAR(60) NOT NULL DEFAULT 'pending_steward_review',
    steward_note TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    reviewed_by INTEGER REFERENCES "user"(id),
    CONSTRAINT ck_peach_consent_operation_type CHECK (operation_type IN ('export', 'withdrawal')),
    CONSTRAINT ck_peach_consent_operation_status CHECK (status IN ('pending_steward_review', 'in_review', 'completed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS ix_peach_consent_operation_contribution ON peach_consent_operation_request(contribution_id);
CREATE INDEX IF NOT EXISTS ix_peach_consent_operation_status ON peach_consent_operation_request(status);
CREATE INDEX IF NOT EXISTS ix_peach_consent_operation_created_at ON peach_consent_operation_request(created_at);

CREATE TABLE IF NOT EXISTS peach_support_intent (
    id SERIAL PRIMARY KEY,
    field_id VARCHAR(120),
    field_slug VARCHAR(180),
    support_type VARCHAR(60) NOT NULL,
    supporter_name VARCHAR(200),
    supporter_contact VARCHAR(240),
    amount_intent VARCHAR(80),
    currency VARCHAR(12),
    note TEXT,
    payment_taken BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(60) NOT NULL DEFAULT 'manual_enquiry',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_peach_support_intent_type CHECK (support_type IN ('membership', 'one_off_support', 'sponsor_access', 'sponsor_field', 'sponsor_yield')),
    CONSTRAINT ck_peach_support_intent_status CHECK (status IN ('manual_enquiry', 'pending_follow_up', 'closed')),
    CONSTRAINT ck_peach_support_intent_payment_not_taken CHECK (payment_taken = FALSE)
);

CREATE INDEX IF NOT EXISTS ix_peach_support_intent_field_slug ON peach_support_intent(field_slug);
CREATE INDEX IF NOT EXISTS ix_peach_support_intent_status ON peach_support_intent(status);
CREATE INDEX IF NOT EXISTS ix_peach_support_intent_created_at ON peach_support_intent(created_at);
