-- Presence Nodes alpha
-- Digital business cards, portfolio pages, enquiries, templates, and analytics.

CREATE TABLE IF NOT EXISTS presence_template (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    node_type VARCHAR(80) NOT NULL DEFAULT 'custom',
    display_mode VARCHAR(80) NOT NULL DEFAULT 'profile_card',
    preview_image_url VARCHAR(700),
    theme_schema JSONB,
    layout_schema JSONB,
    section_schema JSONB,
    supports_landing_portal BOOLEAN NOT NULL DEFAULT FALSE,
    supports_collections BOOLEAN NOT NULL DEFAULT FALSE,
    supports_business_functions BOOLEAN NOT NULL DEFAULT FALSE,
    supports_tradie_functions BOOLEAN NOT NULL DEFAULT FALSE,
    supports_professional_contract BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_template_node_type ON presence_template(node_type);
CREATE INDEX IF NOT EXISTS ix_presence_template_display_mode ON presence_template(display_mode);
CREATE INDEX IF NOT EXISTS ix_presence_template_active ON presence_template(is_active);

CREATE TABLE IF NOT EXISTS presence_node (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id INTEGER REFERENCES "user"(id),
    organisation_id INTEGER,
    tenant_id INTEGER REFERENCES node(id),
    slug VARCHAR(180) NOT NULL,
    display_name VARCHAR(180) NOT NULL,
    headline VARCHAR(220),
    bio TEXT,
    node_type VARCHAR(80) NOT NULL DEFAULT 'custom',
    display_mode VARCHAR(80) NOT NULL DEFAULT 'profile_card',
    plan_type VARCHAR(80) NOT NULL DEFAULT 'basic',
    status VARCHAR(40) NOT NULL DEFAULT 'draft',
    visibility VARCHAR(40) NOT NULL DEFAULT 'public',
    template_id INTEGER REFERENCES presence_template(id),
    theme_config JSONB,
    visual_mood VARCHAR(120),
    custom_typography_config JSONB,
    custom_spacing_config JSONB,
    profile_image_url VARCHAR(700),
    cover_image_url VARCHAR(700),
    location_label VARCHAR(180),
    service_area VARCHAR(220),
    primary_cta_label VARCHAR(100),
    primary_cta_url VARCHAR(700),
    landing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    landing_title VARCHAR(180),
    landing_subtitle VARCHAR(260),
    landing_background_url VARCHAR(700),
    landing_enter_label VARCHAR(80),
    practice_statement TEXT,
    curatorial_statement TEXT,
    capability_statement TEXT,
    proof_summary TEXT,
    procurement_summary TEXT,
    business_functions_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    directory_ready BOOLEAN NOT NULL DEFAULT FALSE,
    map_ready BOOLEAN NOT NULL DEFAULT FALSE,
    archive_ready BOOLEAN NOT NULL DEFAULT FALSE,
    marketplace_ready BOOLEAN NOT NULL DEFAULT FALSE,
    white_label_ready BOOLEAN NOT NULL DEFAULT FALSE,
    public_email VARCHAR(180),
    public_phone VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP,
    archived_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_node_slug ON presence_node(slug);
CREATE INDEX IF NOT EXISTS ix_presence_node_tenant_id ON presence_node(tenant_id);
CREATE INDEX IF NOT EXISTS ix_presence_node_organisation_id ON presence_node(organisation_id);
CREATE INDEX IF NOT EXISTS ix_presence_node_owner_user_id ON presence_node(owner_user_id);
CREATE INDEX IF NOT EXISTS ix_presence_node_status ON presence_node(status);
CREATE INDEX IF NOT EXISTS ix_presence_node_type ON presence_node(node_type);
CREATE INDEX IF NOT EXISTS ix_presence_node_display_mode ON presence_node(display_mode);
CREATE INDEX IF NOT EXISTS ix_presence_node_plan_type ON presence_node(plan_type);
CREATE INDEX IF NOT EXISTS ix_presence_node_template_id ON presence_node(template_id);
CREATE INDEX IF NOT EXISTS ix_presence_node_readiness ON presence_node(directory_ready, map_ready, archive_ready, marketplace_ready);

CREATE TABLE IF NOT EXISTS presence_node_section (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    section_type VARCHAR(80) NOT NULL,
    title VARCHAR(180),
    content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_node_section_node_order ON presence_node_section(node_id, sort_order);

CREATE TABLE IF NOT EXISTS presence_collection (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(700),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_collection_node_order ON presence_collection(node_id, sort_order);

CREATE TABLE IF NOT EXISTS presence_work (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES presence_collection(id) ON DELETE SET NULL,
    slug VARCHAR(180),
    title VARCHAR(180) NOT NULL,
    year VARCHAR(40),
    medium VARCHAR(180),
    dimensions VARCHAR(120),
    description TEXT,
    image_url VARCHAR(700),
    thumbnail_url VARCHAR(700),
    gallery_images JSONB,
    external_url VARCHAR(700),
    availability_status VARCHAR(80),
    price_label VARCHAR(100),
    exhibition_history TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presence_work_node_slug UNIQUE (node_id, slug)
);

CREATE INDEX IF NOT EXISTS ix_presence_work_node_order ON presence_work(node_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_presence_work_collection_id ON presence_work(collection_id);
CREATE INDEX IF NOT EXISTS ix_presence_work_availability_status ON presence_work(availability_status);

CREATE TABLE IF NOT EXISTS presence_link (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    label VARCHAR(120) NOT NULL,
    url VARCHAR(700) NOT NULL,
    link_type VARCHAR(80) NOT NULL DEFAULT 'website',
    icon VARCHAR(80),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_presence_link_node_order ON presence_link(node_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_presence_link_type ON presence_link(link_type);

CREATE TABLE IF NOT EXISTS presence_service (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    problem_solved TEXT,
    who_it_is_for TEXT,
    format VARCHAR(120),
    deliverables TEXT,
    price_label VARCHAR(100),
    duration_label VARCHAR(100),
    cta_label VARCHAR(100),
    cta_url VARCHAR(700),
    enquiry_type VARCHAR(80),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_presence_service_node_order ON presence_service(node_id, sort_order);

CREATE TABLE IF NOT EXISTS presence_portfolio_item (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    media_url VARCHAR(700),
    thumbnail_url VARCHAR(700),
    external_url VARCHAR(700),
    media_type VARCHAR(80) NOT NULL DEFAULT 'image',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_presence_portfolio_node_order ON presence_portfolio_item(node_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_presence_portfolio_media_type ON presence_portfolio_item(media_type);

CREATE TABLE IF NOT EXISTS presence_availability_chip (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    label VARCHAR(120) NOT NULL,
    chip_type VARCHAR(80) NOT NULL DEFAULT 'availability',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_presence_availability_node_order ON presence_availability_chip(node_id, sort_order);

CREATE TABLE IF NOT EXISTS presence_business_function (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    function_type VARCHAR(80) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presence_business_function_node_type UNIQUE (node_id, function_type)
);

CREATE INDEX IF NOT EXISTS ix_presence_business_function_node ON presence_business_function(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_business_function_type ON presence_business_function(function_type);

CREATE TABLE IF NOT EXISTS presence_proof_item (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    client_label VARCHAR(160),
    industry VARCHAR(120),
    challenge TEXT,
    approach TEXT,
    outcome TEXT,
    metrics JSONB,
    testimonial TEXT,
    media_urls JSONB,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_proof_node_order ON presence_proof_item(node_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_presence_proof_industry ON presence_proof_item(industry);

CREATE TABLE IF NOT EXISTS presence_credential (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    issuer VARCHAR(180),
    credential_type VARCHAR(80) NOT NULL DEFAULT 'credential',
    issued_at TIMESTAMP,
    expires_at TIMESTAMP,
    verification_url VARCHAR(700),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_credential_node ON presence_credential(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_credential_type ON presence_credential(credential_type);

CREATE TABLE IF NOT EXISTS presence_procurement_profile (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    business_name VARCHAR(180),
    abn_acn_or_registration VARCHAR(120),
    regions_served JSONB,
    contract_types JSONB,
    rate_label VARCHAR(120),
    insurance_status VARCHAR(120),
    nda_ready BOOLEAN NOT NULL DEFAULT FALSE,
    procurement_contact_email VARCHAR(180),
    compliance_notes TEXT,
    payment_terms_label VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presence_procurement_profile_node UNIQUE (node_id)
);

CREATE INDEX IF NOT EXISTS ix_presence_procurement_profile_node ON presence_procurement_profile(node_id);

CREATE TABLE IF NOT EXISTS presence_nfc_tag (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    tag_uid VARCHAR(180),
    label VARCHAR(160) NOT NULL,
    tag_type VARCHAR(80) NOT NULL DEFAULT 'custom',
    destination_url VARCHAR(700),
    source_code VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presence_nfc_tag_node_source UNIQUE (node_id, source_code)
);

CREATE INDEX IF NOT EXISTS ix_presence_nfc_tag_node ON presence_nfc_tag(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_nfc_tag_source ON presence_nfc_tag(source_code);
CREATE INDEX IF NOT EXISTS ix_presence_nfc_tag_active ON presence_nfc_tag(is_active);

CREATE TABLE IF NOT EXISTS presence_connection (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    contact_name VARCHAR(160),
    contact_email VARCHAR(180),
    contact_phone VARCHAR(80),
    organisation VARCHAR(180),
    source_type VARCHAR(80) NOT NULL DEFAULT 'manual',
    source_tag_id INTEGER REFERENCES presence_nfc_tag(id) ON DELETE SET NULL,
    status VARCHAR(80) NOT NULL DEFAULT 'scanned',
    consent_status VARCHAR(80) NOT NULL DEFAULT 'unknown',
    notes TEXT,
    last_interaction_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_connection_node ON presence_connection(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_connection_status ON presence_connection(status);
CREATE INDEX IF NOT EXISTS ix_presence_connection_source_tag ON presence_connection(source_tag_id);

CREATE TABLE IF NOT EXISTS presence_interaction (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES presence_connection(id) ON DELETE SET NULL,
    interaction_type VARCHAR(80) NOT NULL,
    source_type VARCHAR(80),
    source_tag_id INTEGER REFERENCES presence_nfc_tag(id) ON DELETE SET NULL,
    metadata JSONB,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_interaction_node_time ON presence_interaction(node_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_presence_interaction_connection ON presence_interaction(connection_id);
CREATE INDEX IF NOT EXISTS ix_presence_interaction_type ON presence_interaction(interaction_type);
CREATE INDEX IF NOT EXISTS ix_presence_interaction_source_tag ON presence_interaction(source_tag_id);

CREATE TABLE IF NOT EXISTS presence_quote (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES presence_connection(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    status VARCHAR(80) NOT NULL DEFAULT 'draft',
    description TEXT,
    total_amount NUMERIC(12, 2),
    currency VARCHAR(12) NOT NULL DEFAULT 'AUD',
    terms TEXT,
    expires_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_quote_node ON presence_quote(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_quote_connection ON presence_quote(connection_id);
CREATE INDEX IF NOT EXISTS ix_presence_quote_status ON presence_quote(status);

CREATE TABLE IF NOT EXISTS presence_quote_line_item (
    id BIGSERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES presence_quote(id) ON DELETE CASCADE,
    label VARCHAR(180) NOT NULL,
    description TEXT,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2),
    total_price NUMERIC(12, 2),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_presence_quote_line_item_quote_order ON presence_quote_line_item(quote_id, sort_order);

CREATE TABLE IF NOT EXISTS presence_variation (
    id BIGSERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES presence_quote(id) ON DELETE SET NULL,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES presence_connection(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    reason TEXT,
    description TEXT,
    price_delta NUMERIC(12, 2),
    time_delta VARCHAR(120),
    evidence_urls JSONB,
    status VARCHAR(80) NOT NULL DEFAULT 'draft',
    approved_by_name VARCHAR(160),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_variation_node ON presence_variation(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_variation_quote ON presence_variation(quote_id);
CREATE INDEX IF NOT EXISTS ix_presence_variation_connection ON presence_variation(connection_id);
CREATE INDEX IF NOT EXISTS ix_presence_variation_status ON presence_variation(status);

CREATE TABLE IF NOT EXISTS presence_invoice_support (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES presence_connection(id) ON DELETE SET NULL,
    quote_id INTEGER REFERENCES presence_quote(id) ON DELETE SET NULL,
    external_invoice_url VARCHAR(700),
    invoice_number VARCHAR(120),
    status VARCHAR(80) NOT NULL DEFAULT 'draft',
    amount NUMERIC(12, 2),
    currency VARCHAR(12) NOT NULL DEFAULT 'AUD',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_invoice_support_node ON presence_invoice_support(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_invoice_support_connection ON presence_invoice_support(connection_id);
CREATE INDEX IF NOT EXISTS ix_presence_invoice_support_quote ON presence_invoice_support(quote_id);
CREATE INDEX IF NOT EXISTS ix_presence_invoice_support_status ON presence_invoice_support(status);

CREATE TABLE IF NOT EXISTS presence_work_handover (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES presence_connection(id) ON DELETE SET NULL,
    quote_id INTEGER REFERENCES presence_quote(id) ON DELETE SET NULL,
    summary TEXT,
    before_images JSONB,
    after_images JSONB,
    work_notes TEXT,
    materials_used TEXT,
    warranty_notes TEXT,
    customer_acceptance_status VARCHAR(80) NOT NULL DEFAULT 'pending',
    accepted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_work_handover_node ON presence_work_handover(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_work_handover_connection ON presence_work_handover(connection_id);
CREATE INDEX IF NOT EXISTS ix_presence_work_handover_quote ON presence_work_handover(quote_id);

CREATE TABLE IF NOT EXISTS presence_enquiry (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    organisation_id INTEGER,
    tenant_id INTEGER REFERENCES node(id),
    connection_id INTEGER REFERENCES presence_connection(id),
    enquiry_type VARCHAR(80) NOT NULL DEFAULT 'general',
    name VARCHAR(160) NOT NULL,
    email VARCHAR(180) NOT NULL,
    phone VARCHAR(80),
    company VARCHAR(180),
    role_title VARCHAR(160),
    budget_range VARCHAR(120),
    timeline VARCHAR(120),
    project_type VARCHAR(120),
    urgency VARCHAR(80),
    decision_maker_status VARCHAR(120),
    message TEXT NOT NULL,
    preferred_contact_method VARCHAR(40) NOT NULL DEFAULT 'email',
    metadata JSONB,
    source_url VARCHAR(700),
    source_type VARCHAR(80),
    source_tag_id INTEGER REFERENCES presence_nfc_tag(id),
    ip_hash VARCHAR(96),
    user_agent_hash VARCHAR(96),
    status VARCHAR(40) NOT NULL DEFAULT 'new',
    assigned_to_user_id INTEGER REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_enquiry_node_id ON presence_enquiry(node_id);
CREATE INDEX IF NOT EXISTS ix_presence_enquiry_tenant_id ON presence_enquiry(tenant_id);
CREATE INDEX IF NOT EXISTS ix_presence_enquiry_organisation_id ON presence_enquiry(organisation_id);
CREATE INDEX IF NOT EXISTS ix_presence_enquiry_connection_id ON presence_enquiry(connection_id);
CREATE INDEX IF NOT EXISTS ix_presence_enquiry_source_tag_id ON presence_enquiry(source_tag_id);
CREATE INDEX IF NOT EXISTS ix_presence_enquiry_status ON presence_enquiry(status);
CREATE INDEX IF NOT EXISTS ix_presence_enquiry_created_at ON presence_enquiry(created_at);

CREATE TABLE IF NOT EXISTS presence_analytics_event (
    id BIGSERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES presence_node(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    metadata JSONB,
    anonymous_session_id VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_presence_analytics_node_event ON presence_analytics_event(node_id, event_type);
CREATE INDEX IF NOT EXISTS ix_presence_analytics_created_at ON presence_analytics_event(created_at);
CREATE INDEX IF NOT EXISTS ix_presence_analytics_session ON presence_analytics_event(anonymous_session_id);

-- Idempotent extension path for environments that already ran the first alpha migration.
ALTER TABLE presence_template ADD COLUMN IF NOT EXISTS display_mode VARCHAR(80) NOT NULL DEFAULT 'profile_card';
ALTER TABLE presence_template ADD COLUMN IF NOT EXISTS section_schema JSONB;
ALTER TABLE presence_template ADD COLUMN IF NOT EXISTS supports_landing_portal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_template ADD COLUMN IF NOT EXISTS supports_collections BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_template ADD COLUMN IF NOT EXISTS supports_business_functions BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_template ADD COLUMN IF NOT EXISTS supports_tradie_functions BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_template ADD COLUMN IF NOT EXISTS supports_professional_contract BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS display_mode VARCHAR(80) NOT NULL DEFAULT 'profile_card';
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS plan_type VARCHAR(80) NOT NULL DEFAULT 'basic';
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS visual_mood VARCHAR(120);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS custom_typography_config JSONB;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS custom_spacing_config JSONB;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS landing_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS landing_title VARCHAR(180);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS landing_subtitle VARCHAR(260);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS landing_background_url VARCHAR(700);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS landing_enter_label VARCHAR(80);
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS practice_statement TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS curatorial_statement TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS capability_statement TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS proof_summary TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS procurement_summary TEXT;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS business_functions_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS directory_ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS map_ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS archive_ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS marketplace_ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS white_label_ready BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE presence_service ADD COLUMN IF NOT EXISTS problem_solved TEXT;
ALTER TABLE presence_service ADD COLUMN IF NOT EXISTS who_it_is_for TEXT;
ALTER TABLE presence_service ADD COLUMN IF NOT EXISTS format VARCHAR(120);
ALTER TABLE presence_service ADD COLUMN IF NOT EXISTS deliverables TEXT;
ALTER TABLE presence_service ADD COLUMN IF NOT EXISTS enquiry_type VARCHAR(80);

ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS connection_id INTEGER REFERENCES presence_connection(id);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS company VARCHAR(180);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS role_title VARCHAR(160);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS budget_range VARCHAR(120);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS timeline VARCHAR(120);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS project_type VARCHAR(120);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS urgency VARCHAR(80);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS decision_maker_status VARCHAR(120);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS source_type VARCHAR(80);
ALTER TABLE presence_enquiry ADD COLUMN IF NOT EXISTS source_tag_id INTEGER REFERENCES presence_nfc_tag(id);
