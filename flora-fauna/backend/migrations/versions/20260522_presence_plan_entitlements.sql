-- Presence user plan entitlements.
-- Date: 2026-05-22
--
-- Safe additive migration for explicit internal Presence comps. This does not
-- alter Stripe membership/subscription state and does not confer auth roles.

CREATE TABLE IF NOT EXISTS presence_plan_entitlement (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    plan_code VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    billing_mode VARCHAR(80) NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(12),
    starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP,
    lifetime BOOLEAN NOT NULL DEFAULT FALSE,
    source VARCHAR(120) NOT NULL,
    reason VARCHAR(180),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presence_plan_entitlement_user_plan_source
        UNIQUE (user_id, plan_code, source)
);

CREATE INDEX IF NOT EXISTS ix_presence_plan_entitlement_user_status
    ON presence_plan_entitlement(user_id, status);
CREATE INDEX IF NOT EXISTS ix_presence_plan_entitlement_plan_code
    ON presence_plan_entitlement(plan_code);
CREATE INDEX IF NOT EXISTS ix_presence_plan_entitlement_source
    ON presence_plan_entitlement(source);
