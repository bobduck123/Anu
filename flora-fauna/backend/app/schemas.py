import re

from marshmallow import Schema, fields, validate, validates, validates_schema, ValidationError, pre_load
from datetime import time as dt_time
import bleach


class DomainResolutionBrandSchema(Schema):
    primary_color = fields.String(allow_none=True)
    secondary_color = fields.String(allow_none=True)
    accent_color = fields.String(allow_none=True)
    logo_url = fields.String(allow_none=True)
    favicon_url = fields.String(allow_none=True)
    custom_css = fields.String(allow_none=True)


class DomainResolutionResponseSchema(Schema):
    contract_version = fields.String(required=True)
    node_id = fields.Integer(required=True)
    node_slug = fields.String(required=True)
    node_name = fields.String(required=True)
    semantic_key = fields.String(allow_none=True)
    white_label = fields.Boolean(required=True)
    brand = fields.Nested(DomainResolutionBrandSchema, required=True)
    domain = fields.String(required=True)
    tls_ready = fields.Boolean(required=True)
    # Backward-compatibility keys for existing clients.
    is_white_label = fields.Boolean(required=True)
    brand_config = fields.Nested(DomainResolutionBrandSchema, required=True)


class PublicNodeConfigBrandSchema(Schema):
    # Keep branding keys aligned with domain resolution and frontend tenant wrappers.
    primary_color = fields.String(allow_none=True)
    secondary_color = fields.String(allow_none=True)
    accent_color = fields.String(allow_none=True)
    logo_url = fields.String(allow_none=True)
    favicon_url = fields.String(allow_none=True)
    custom_css = fields.String(allow_none=True)


class PublicNodeConfigResponseSchema(Schema):
    # Canonical public-safe node config contract for /api/public/nodes/*/config.
    contract_version = fields.String(required=True)
    node_id = fields.Integer(required=True)
    node_slug = fields.String(required=True)
    node_name = fields.String(required=True)
    semantic_key = fields.String(allow_none=True)
    white_label = fields.Boolean(required=True)
    brand = fields.Nested(PublicNodeConfigBrandSchema, required=True)
    modules = fields.Dict(required=True)
    status = fields.String(required=True)
    is_default = fields.Boolean(required=True)
    domain = fields.String(allow_none=True)
    tls_ready = fields.Boolean(allow_none=True)


class NodeServiceBindingSchema(Schema):
    id = fields.Integer(required=True)
    node_id = fields.Integer(required=True)
    node_slug = fields.String(required=True)
    service_name = fields.String(required=True)
    service_tenant_id = fields.String(required=True)
    service_tenant_slug = fields.String(allow_none=True)
    status = fields.String(required=True)
    last_verified_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime(required=True)
    updated_at = fields.DateTime(required=True)


class NodeServiceBindingVerifySchema(Schema):
    node_slug = fields.String(required=True, validate=validate.Length(min=2, max=120))
    service_name = fields.String(required=True, validate=validate.Length(min=2, max=80))
    service_tenant_id = fields.String(required=True, validate=validate.Length(min=2, max=120))
    service_tenant_slug = fields.String(allow_none=True, validate=validate.Length(max=120))


class JourneyConnectorSchema(Schema):
    id = fields.Integer(required=True)
    journey_slug = fields.String(required=True)
    node_id = fields.Integer(allow_none=True)
    slug = fields.String(required=True)
    source_type = fields.String(required=True)
    source_id = fields.String(required=True)
    source_route = fields.String(required=True)
    target_type = fields.String(required=True)
    target_route = fields.String(required=True)
    target_slug = fields.String(allow_none=True)
    target_id = fields.String(allow_none=True)
    threshold_required = fields.String(required=True)
    node_slug = fields.String(required=True)
    label = fields.String(required=True)
    summary = fields.String(required=True)
    provenance_mode = fields.String(required=True)
    archive_handoff_mode = fields.String(required=True)
    is_active = fields.Boolean(required=True)
    display_order = fields.Integer(required=True)
    metadata = fields.Dict(load_default=dict)
    created_at = fields.String(allow_none=True)
    updated_at = fields.String(allow_none=True)


class JourneyTransitionProofSchema(Schema):
    id = fields.Integer(required=True)
    connector_id = fields.Integer(required=True)
    actor_id = fields.Integer(allow_none=True)
    node_slug = fields.String(required=True)
    source_route = fields.String(required=True)
    target_route = fields.String(required=True)
    transition_kind = fields.String(required=True)
    provenance_snapshot = fields.Dict(required=True)
    occurred_at = fields.String(allow_none=True)
    result_state = fields.String(required=True)
    archive_record_id = fields.Integer(allow_none=True)
    metadata = fields.Dict(load_default=dict)


class ConnectorSourceSchema(Schema):
    type = fields.String(required=True)
    route = fields.String(required=True)
    label = fields.String(required=True)


class ConnectorThresholdContextSchema(Schema):
    active_thresholds = fields.List(fields.String(), required=True)
    default_threshold = fields.String(required=True)


class ConnectorProvenanceSummarySchema(Schema):
    source_label = fields.String(required=True)
    verification_posture = fields.String(required=True)
    freshness = fields.String(required=True)
    proof_count = fields.Integer(required=True)


class ConnectorArchiveHandoffSchema(Schema):
    slug = fields.String(required=True)
    route = fields.String(required=True)
    record_route = fields.String(required=True)
    title = fields.String(required=True)
    report_slug = fields.String(required=True)
    report_route = fields.String(required=True)


class ConnectorDegradedHonestySchema(Schema):
    is_degraded = fields.Boolean(required=True)
    reason = fields.String(allow_none=True)
    fallback = fields.String(allow_none=True)


class ConnectorNodeScopeSchema(Schema):
    slug = fields.String(required=True)
    name = fields.String(required=True)


class PublicConnectorPayloadSchema(Schema):
    journey_slug = fields.String(required=True)
    source = fields.Nested(ConnectorSourceSchema, required=True)
    connectors = fields.List(fields.Nested(JourneyConnectorSchema), required=True)
    active_connectors = fields.List(fields.Nested(JourneyConnectorSchema), required=True)
    threshold_context = fields.Nested(ConnectorThresholdContextSchema, required=True)
    provenance_summary = fields.Nested(ConnectorProvenanceSummarySchema, required=True)
    archive_handoff = fields.Nested(ConnectorArchiveHandoffSchema, required=True)
    degraded_honesty = fields.Nested(ConnectorDegradedHonestySchema, required=True)
    node_scope = fields.Nested(ConnectorNodeScopeSchema, required=True)


class PublicJourneySummarySchema(Schema):
    slug = fields.String(required=True)
    label = fields.String(required=True)
    transition_proofs = fields.List(fields.Nested(JourneyTransitionProofSchema), required=True)


class PublicJourneyPayloadSchema(PublicConnectorPayloadSchema):
    journey = fields.Nested(PublicJourneySummarySchema, required=True)


class PublicArchiveHandoffPayloadSchema(Schema):
    archive_record = fields.Dict(required=True)
    trust_report = fields.Dict(allow_none=True)
    deep_links = fields.Dict(required=True)


class PublicTrustReportPayloadSchema(Schema):
    report = fields.Dict(required=True)
    archive_record = fields.Dict(allow_none=True)
    degraded_honesty = fields.Nested(ConnectorDegradedHonestySchema, required=True)


class PublicTrustReportSummarySchema(Schema):
    id = fields.Integer(required=True)
    slug = fields.String(required=True)
    title = fields.String(required=True)
    summary = fields.String(required=True)
    report_type = fields.String(required=True)
    status = fields.String(required=True)
    node_slug = fields.String(required=True)
    jurisdiction = fields.String(allow_none=True)
    published_at = fields.String(allow_none=True)
    effective_at = fields.String(allow_none=True)
    source_notes = fields.String(required=True)
    freshness_hint = fields.String(allow_none=True)
    public_visibility = fields.Boolean(required=True)
    record_route = fields.String(allow_none=True)


class PublicTrustReportDetailSchema(PublicTrustReportSummarySchema):
    body = fields.String(required=True)
    sections = fields.List(fields.Dict(), required=True)
    provenance_summary = fields.String(required=True)
    archive_record_id = fields.Integer(allow_none=True)
    sponsor_disclosure_ref = fields.String(allow_none=True)


class PublicTrustReportListPayloadSchema(Schema):
    reports = fields.List(fields.Nested(PublicTrustReportSummarySchema), required=True)
    degraded_honesty = fields.Nested(ConnectorDegradedHonestySchema, required=True)


class PublicTrustReportDetailPayloadSchema(Schema):
    report = fields.Nested(PublicTrustReportDetailSchema, required=True)
    archive_record = fields.Dict(allow_none=True)
    degraded_honesty = fields.Nested(ConnectorDegradedHonestySchema, required=True)


class PublicSponsorDisclosureSchema(Schema):
    id = fields.Integer(required=True)
    slug = fields.String(required=True)
    sponsor_name = fields.String(required=True)
    sponsor_type = fields.String(allow_none=True)
    sponsored_surface = fields.String(required=True)
    placement_type = fields.String(required=True)
    disclosure_label = fields.String(required=True)
    public_note = fields.String(required=True)
    disclosure_text = fields.String(required=True)
    active_from = fields.String(allow_none=True)
    active_until = fields.String(allow_none=True)
    is_active = fields.Boolean(required=True)
    is_currently_active = fields.Boolean(required=True)
    trust_report_slug = fields.String(allow_none=True)
    archive_record_slug = fields.String(allow_none=True)
    related_routes = fields.Dict(required=True)
    created_at = fields.String(allow_none=True)
    updated_at = fields.String(allow_none=True)


class PublicSponsorDisclosureListPayloadSchema(Schema):
    disclosures = fields.List(fields.Nested(PublicSponsorDisclosureSchema), required=True)
    disclosure_state = fields.String(required=True)
    degraded_honesty = fields.Nested(ConnectorDegradedHonestySchema, required=True)


class PublicSponsorDisclosureDetailPayloadSchema(Schema):
    disclosure = fields.Nested(PublicSponsorDisclosureSchema, allow_none=True)
    degraded_honesty = fields.Nested(ConnectorDegradedHonestySchema, required=True)


class LenientTimeField(fields.Time):
    """Time field that also accepts HH:MM (without seconds)."""

    def _deserialize(self, value, attr, data, **kwargs):
        if isinstance(value, str) and len(value) == 5 and ":" in value:
            value = value + ":00"
        return super()._deserialize(value, attr, data, **kwargs)


class ReliefRequestSchema(Schema):
    amount_requested = fields.Integer(
        required=True,
        validate=validate.Range(min=1000, max=5_000_000),
        error_messages={"invalid": "Amount must be between $10 and $50,000"},
    )
    purpose = fields.String(
        required=True,
        validate=validate.OneOf(["food", "rent", "utilities", "medical", "other"]),
    )
    description = fields.String(
        validate=validate.Length(max=1000),
        load_default="",
    )
    urgency = fields.String(
        validate=validate.OneOf(["low", "medium", "high"]),
        load_default="medium",
    )
    contact_preference = fields.String(
        validate=validate.OneOf(["in-app", "email", "phone"]),
        load_default="in-app",
    )
    node_id = fields.String(load_default=None)
    consents = fields.Dict(load_default=dict)

    @validates("description")
    def validate_description(self, value, **kwargs):
        allowed_tags = ["b", "i", "em", "strong", "p", "br"]
        return bleach.clean(value, tags=allowed_tags, strip=True)


def _clean_text(value):
    if value is None:
        return None
    return bleach.clean(str(value), tags=[], strip=True)


class ActionSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=3, max=100))
    details = fields.String(required=True, validate=validate.Length(min=3, max=1000))
    instructions = fields.String(load_default="", validate=validate.Length(max=1000))
    action_type = fields.String(required=True, validate=validate.Length(min=2, max=50))
    is_online = fields.Boolean(load_default=False)
    is_global = fields.Boolean(load_default=False)
    latitude = fields.Float(allow_none=True)
    longitude = fields.Float(allow_none=True)
    address = fields.String(allow_none=True, validate=validate.Length(max=200))
    city = fields.String(allow_none=True, validate=validate.Length(max=100))
    country = fields.String(allow_none=True, validate=validate.Length(max=100))
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    first_milestone = fields.String(allow_none=True, validate=validate.Length(max=100))
    second_milestone = fields.String(allow_none=True, validate=validate.Length(max=100))
    final_milestone = fields.String(allow_none=True, validate=validate.Length(max=100))
    points_assigned = fields.Integer(required=True, validate=validate.Range(min=0, max=1_000_000))
    recurrence = fields.String(load_default="none", validate=validate.Length(max=50))

    @validates("title")
    def _clean_title(self, value, **kwargs):
        return _clean_text(value)

    @validates("details")
    def _clean_details(self, value, **kwargs):
        return _clean_text(value)

    @validates("instructions")
    def _clean_instructions(self, value, **kwargs):
        return _clean_text(value)


class EventSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=3, max=100))
    description = fields.String(required=True, validate=validate.Length(min=3, max=2000))
    address = fields.String(allow_none=True, validate=validate.Length(max=200))
    city = fields.String(allow_none=True, validate=validate.Length(max=100))
    country = fields.String(allow_none=True, validate=validate.Length(max=100))
    latitude = fields.Float(allow_none=True)
    longitude = fields.Float(allow_none=True)
    date = fields.Date(required=True)
    time = LenientTimeField(required=True)
    venue_id = fields.Integer(allow_none=True)
    is_online = fields.Boolean(load_default=False)
    is_global = fields.Boolean(load_default=False)
    goal = fields.Integer(required=True, validate=validate.Range(min=0, max=1_000_000))
    reminder_week = fields.String(allow_none=True, validate=validate.Length(max=500))
    reminder_day = fields.String(allow_none=True, validate=validate.Length(max=500))
    reminder_hours = fields.String(allow_none=True, validate=validate.Length(max=500))
    risk_tier_id = fields.Integer(allow_none=True)
    min_cert_level = fields.Integer(allow_none=True)
    compliance_checklist_complete = fields.Boolean(load_default=False)
    collision_acknowledged = fields.Boolean(load_default=False)
    tags = fields.List(fields.String(), load_default=[])

    @pre_load
    def _normalize_payload(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        # Accept camelCase keys from frontend
        key_map = {
            "venueId": "venue_id",
            "isOnline": "is_online",
            "isGlobal": "is_global",
            "riskTierId": "risk_tier_id",
            "minCertLevel": "min_cert_level",
            "complianceChecklistComplete": "compliance_checklist_complete",
            "collisionAcknowledged": "collision_acknowledged",
        }
        for src, dst in key_map.items():
            if src in data and dst not in data:
                data[dst] = data[src]

        # Normalize empty strings to None for optional fields
        for field in ("address", "city", "country", "reminder_week", "reminder_day", "reminder_hours"):
            if field in data and data[field] == "":
                data[field] = None

        # Ensure time is HH:MM:SS
        time_val = data.get("time")
        if isinstance(time_val, str) and len(time_val) == 5 and ":" in time_val:
            data["time"] = f"{time_val}:00"
        return data

    @validates("title")
    def _clean_event_title(self, value, **kwargs):
        return _clean_text(value)

    @validates("description")
    def _clean_event_description(self, value, **kwargs):
        return _clean_text(value)

    @validates("venue_id")
    def _normalize_venue_id(self, value, **kwargs):
        # Frontend sends 0 when no venue selected; normalize to None
        if value == 0:
            return None
        return value


class VenueSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    address = fields.String(required=True, validate=validate.Length(min=3, max=200))
    city = fields.String(required=True, validate=validate.Length(min=2, max=100))
    country = fields.String(required=True, validate=validate.Length(min=2, max=100))
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    is_online = fields.Boolean(load_default=False)
    is_global = fields.Boolean(load_default=False)

    @validates("name")
    def _clean_venue_name(self, value, **kwargs):
        return _clean_text(value)


class ArticleSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=3, max=200))
    content = fields.String(required=True, validate=validate.Length(min=3))
    category = fields.String(required=True, validate=validate.OneOf(["News", "Opinion", "Creative"]))
    microcosm_id = fields.Integer(allow_none=True)

    @validates("title")
    def _clean_article_title(self, value, **kwargs):
        return _clean_text(value)

    @validates("content")
    def _clean_article_content(self, value, **kwargs):
        return _clean_text(value)


class CommentSchema(Schema):
    content = fields.String(required=True, validate=validate.Length(min=1, max=2000))

    @validates("content")
    def _clean_comment(self, value, **kwargs):
        return _clean_text(value)


class MessageSchema(Schema):
    receiver_id = fields.Integer(required=True)
    content = fields.String(required=True, validate=validate.Length(min=1, max=2000))

    @validates("content")
    def _clean_message(self, value, **kwargs):
        return _clean_text(value)


class MicrocosmSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=2, max=80))
    description = fields.String(allow_none=True, validate=validate.Length(max=255))

    @validates("name")
    def _clean_microcosm_name(self, value, **kwargs):
        return _clean_text(value)


class NotificationSchema(Schema):
    user_id = fields.Integer(required=True)
    message = fields.String(required=True, validate=validate.Length(min=1, max=255))

    @validates("message")
    def _clean_notification(self, value, **kwargs):
        return _clean_text(value)


class FeedbackSchema(Schema):
    type = fields.String(required=True, validate=validate.Length(min=2, max=50))
    item_id = fields.Integer(required=True)
    content = fields.String(required=True, validate=validate.Length(min=1, max=2000))

    @validates("content")
    def _clean_feedback(self, value, **kwargs):
        return _clean_text(value)


class TicketSchema(Schema):
    event_id = fields.Integer(required=True)
    ticket_type = fields.String(required=True, validate=validate.Length(min=1, max=50))
    price = fields.Float(required=True)


class TodoSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=100))

    @validates("title")
    def _clean_todo_title(self, value, **kwargs):
        return _clean_text(value)


class UserUpdateSchema(Schema):
    points = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=10_000_000))
    level = fields.Integer(allow_none=True, validate=validate.Range(min=1, max=10_000))
    points_to_level_up = fields.Integer(allow_none=True, validate=validate.Range(min=1, max=10_000_000))


class ConsentUpdateSchema(Schema):
    consents = fields.Dict(required=True)


class MembershipPlanSchema(Schema):
    node_id = fields.Integer(required=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    amount_cents = fields.Integer(required=True, validate=validate.Range(min=0, max=100_000_000))
    credit_grant_monthly = fields.Integer(load_default=0, validate=validate.Range(min=0, max=100_000))
    pool_allocation_pct = fields.String(allow_none=True, validate=validate.Length(max=200))
    stripe_price_id = fields.String(required=True, validate=validate.Length(min=2, max=200))
    is_active = fields.Boolean(load_default=True)


class CheckoutSessionSchema(Schema):
    plan_id = fields.Integer(required=True)
    node_id = fields.Integer(allow_none=True)
    success_url = fields.String(allow_none=True, validate=validate.Length(max=500))
    cancel_url = fields.String(allow_none=True, validate=validate.Length(max=500))


_DUMB_DUMB_MISLEADING_TERMS = (
    "real product",
    "physical product",
    "will be shipped",
    "ships to you",
    "shipping included",
    "delivered to your door",
    "arrives in",
    "mail you",
    "postal delivery",
)

_DUMB_DUMB_NEGATION_RE = re.compile(
    r"\b(?:not|no|never|without|isn't|is not|aren't|are not|won't|will not|don't|do not|doesn't|does not|can't|cannot)\b"
)


def _is_negated_claim(text, start_index):
    window = text[max(0, start_index - 40):start_index]
    return bool(_DUMB_DUMB_NEGATION_RE.search(window))


def _validate_dumb_dumb_copy(values):
    combined = " ".join([str(v or "").lower() for v in values])
    for term in _DUMB_DUMB_MISLEADING_TERMS:
        for match in re.finditer(re.escape(term), combined):
            if _is_negated_claim(combined, match.start()):
                continue
            raise ValidationError(
                "Parody copy cannot imply a physical product shipment or hide the real funding destination."
            )


class DumbDumbListSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=3, max=120))
    slug = fields.String(
        allow_none=True,
        load_default=None,
        validate=validate.Regexp(r"^[a-z0-9-]{3,140}$"),
    )
    intro_text = fields.String(allow_none=True, load_default="", validate=validate.Length(max=800))
    parody_disclaimer = fields.String(required=True, validate=validate.Length(min=20, max=500))
    is_public = fields.Boolean(load_default=True)
    is_active = fields.Boolean(load_default=True)

    @pre_load
    def _normalize(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        for key in ("title", "intro_text", "parody_disclaimer", "slug"):
            if key in data and isinstance(data[key], str):
                data[key] = _clean_text(data[key]).strip()
        return data

    @validates_schema
    def _validate_copy(self, data, **kwargs):
        _validate_dumb_dumb_copy([data.get("title"), data.get("intro_text"), data.get("parody_disclaimer")])


class DumbDumbItemSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=3, max=120))
    parody_description = fields.String(allow_none=True, load_default="", validate=validate.Length(max=600))
    image_url = fields.String(allow_none=True, load_default=None, validate=validate.Length(max=500))
    source_url = fields.String(
        allow_none=True,
        load_default=None,
        validate=validate.URL(schemes={"http", "https"}, error="Source URL must be a valid http(s) URL."),
    )
    source_site_name = fields.String(allow_none=True, load_default=None, validate=validate.Length(max=120))
    icon_key = fields.String(allow_none=True, load_default=None, validate=validate.Length(max=80))
    price_cents = fields.Integer(required=True, validate=validate.Range(min=100, max=500_000))
    currency = fields.String(load_default="usd", validate=validate.Length(min=3, max=12))
    mutual_aid_pool_id = fields.Integer(required=True)
    impact_title = fields.String(required=True, validate=validate.Length(min=3, max=160))
    impact_description = fields.String(required=True, validate=validate.Length(min=8, max=500))
    quantity_limit = fields.Integer(allow_none=True, load_default=None, validate=validate.Range(min=1, max=10_000))
    is_active = fields.Boolean(load_default=True)

    @pre_load
    def _normalize(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        for key in (
            "title",
            "parody_description",
            "image_url",
            "source_url",
            "source_site_name",
            "icon_key",
            "impact_title",
            "impact_description",
            "currency",
        ):
            if key in data and isinstance(data[key], str):
                cleaned = _clean_text(data[key]).strip()
                data[key] = cleaned.lower() if key == "currency" else cleaned
        return data

    @validates_schema
    def _validate_copy(self, data, **kwargs):
        _validate_dumb_dumb_copy([data.get("title"), data.get("parody_description")])


class DumbDumbCheckoutSchema(Schema):
    item_id = fields.Integer(required=True)
    success_url = fields.String(allow_none=True, validate=validate.Length(max=500))
    cancel_url = fields.String(allow_none=True, validate=validate.Length(max=500))
    mode = fields.String(load_default="live", validate=validate.OneOf(["live", "demo"]))


class DumbDumbSourcePreviewSchema(Schema):
    source_url = fields.String(
        required=True,
        validate=validate.URL(schemes={"http", "https"}, error="Source URL must be a valid http(s) URL."),
    )

    @pre_load
    def _normalize(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        if "source_url" in data and isinstance(data["source_url"], str):
            data["source_url"] = _clean_text(data["source_url"]).strip()
        return data


class DumbDumbAnalyticsSchema(Schema):
    event_name = fields.String(
        required=True,
        validate=validate.OneOf(
            [
                "dumb_dumb_frontpage_view",
                "dumb_dumb_list_view",
                "dumb_dumb_item_click",
                "dumb_dumb_checkout_started",
                "dumb_dumb_purchase_completed",
                "dumb_dumb_creator_item_created",
            ]
        ),
    )
    entity_id = fields.String(allow_none=True, load_default=None, validate=validate.Length(max=120))
    entity_type = fields.String(allow_none=True, load_default="dumb_dumb", validate=validate.Length(max=80))
    props = fields.Dict(load_default=dict)
