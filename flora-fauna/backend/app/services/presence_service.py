from __future__ import annotations

import hashlib
import json
import re
from datetime import timedelta
from typing import Any
from urllib.parse import quote, urlparse

import bleach
from flask import current_app, request
from sqlalchemy import func

from ..extensions import db
from ..models import (
    Node,
    PresenceAnalyticsEvent,
    PresenceAvailabilityChip,
    PresenceBusinessFunction,
    PresenceConnection,
    PresenceCollection,
    PresenceCredential,
    PresenceEnquiry,
    PresenceInteraction,
    PresenceInvoiceSupport,
    PresenceLink,
    PresenceNfcTag,
    PresenceNode,
    PresenceNodeSection,
    PresencePortfolioItem,
    PresenceProcurementProfile,
    PresenceProofItem,
    PresenceQuote,
    PresenceQuoteLineItem,
    PresenceService,
    PresenceTemplate,
    PresenceVariation,
    PresenceWork,
    PresenceWorkHandover,
    User,
)
from ..time_utils import now_utc


PRESENCE_NODE_STATUSES = {
    "draft",
    "pending_review",
    "published",
    "unpublished",
    "suspended",
    "archived",
}
PRESENCE_NODE_VISIBILITIES = {"public", "unlisted", "private", "admin-only", "private_admin_only"}
PRESENCE_PUBLIC_VISIBILITIES = {"public", "unlisted"}
PRESENCE_PRIVATE_VISIBILITIES = {"private", "admin-only", "private_admin_only"}
PRESENCE_NODE_DISPLAY_MODES = {
    # Portfolio-first launch modes
    "profile_card",
    "showcase",
    "portfolio_presence_kit",
    "signature_artist",
    "editorial_portfolio",
    "studio_practice",
    # Gallery / portal modes
    "artist_gallery",
    "gallery_portal",
    "minimal_portal",
    # Practitioner / service modes
    "opportunity_profile",
    "premium_profile",
    "practitioner_profile",
    # Organisation / venue modes
    "venue_profile",
    "organisation_profile",
    "white_label_network_entry",
    # Alpha foundation modes
    "professional_contract",
    "tradie_profile",
    "field_service_profile",
}
PRESENCE_PLAN_TYPES = {
    "showcase",
    "basic",
    "opportunity_kit",
    "premium",
    "professional_contract",
    "artist_presence",
    "practitioner_presence",
    "tradie_field_service",
    "organisation_venue",
    "white_label_network",
}
PRESENCE_NODE_TYPES = {
    "practitioner",
    "artist",
    "creative",
    "founder",
    "consultant",
    "fractional_executive",
    "advisor",
    "tradie",
    "field_service",
    "venue",
    "organisation",
    "project",
    "event_organiser",
    "community_worker",
    "coach",
    "custom",
}
PRESENCE_ENQUIRY_STATUSES = {
    "new",
    "read",
    "replied",
    "converted",
    "archived",
    "spam",
    "deleted",
}
PRESENCE_ANALYTICS_EVENTS = {
    "node_viewed",
    "link_clicked",
    "enquiry_started",
    "enquiry_submitted",
    "quote_requested",
    "qr_viewed",
    "qr_scanned",
    "nfc_scanned",
    "vcard_downloaded",
    "portfolio_item_clicked",
    "work_clicked",
    "collection_clicked",
    "service_clicked",
    "proof_clicked",
    "case_study_clicked",
    "social_clicked",
    "quote_viewed",
    "variation_viewed",
    "handover_viewed",
}
PRESENCE_BUSINESS_FUNCTION_TYPES = {
    "advanced_enquiry_routing",
    "analytics",
    "services",
    "testimonials",
    "credentials",
    "booking_link",
    "donation_link",
    "team_nodes",
    "organisation_affiliation",
    "directory_listing",
    "map_listing",
    "archive_linkage",
    "marketplace_ready",
    "professional_contract",
    "capability_statement",
    "proof_ledger",
    "procurement_profile",
    "private_deal_room",
    "press_kit",
    "sponsorship",
    "grant_impact_proof",
    "tradie_field_service",
    "quote_requests",
    "variation_approval",
    "invoice_support",
    "proof_of_work_handover",
    "nfc_lead_capture",
    "relationship_ledger",
    "referral_review_loop",
    "client_portal",
}
PRESENCE_NFC_TAG_TYPES = {
    "business_card",
    "keyring",
    "van_sticker",
    "site_sign",
    "equipment_tag",
    "service_tag",
    "artwork_tag",
    "event_badge",
    "venue_plaque",
    "custom",
}
PRESENCE_CONNECTION_STATUSES = {
    "anonymous_scan",
    "scanned",
    "enquired",
    "contacted",
    "quoted",
    "quote_approved",
    "job_booked",
    "job_completed",
    "invoiced",
    "paid",
    "reviewed",
    "referred",
    "repeat_client",
    "archived",
}
PRESENCE_INTERACTION_TYPES = {
    "nfc_scanned",
    "qr_scanned",
    "page_viewed",
    "enquiry_submitted",
    "quote_requested",
    "quote_sent",
    "quote_approved",
    "variation_requested",
    "variation_approved",
    "invoice_link_added",
    "handover_created",
    "review_requested",
    "referral_created",
    "manual_note",
}
PRESENCE_QUOTE_STATUSES = {"draft", "sent", "viewed", "approved", "declined", "expired", "converted_to_job", "archived"}
PRESENCE_VARIATION_STATUSES = {"draft", "sent", "approved", "declined", "cancelled", "archived"}

_SLUG_RE = re.compile(r"[^a-z0-9-]+")
_MULTI_DASH_RE = re.compile(r"-{2,}")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class PresenceValidationError(ValueError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.details = details or {}


def _clean_text(value: Any, *, max_length: int | None = None, allow_basic_html: bool = False) -> str | None:
    if value is None:
        return None
    raw = str(value)
    tags = ["b", "strong", "i", "em", "br", "p", "ul", "ol", "li"] if allow_basic_html else []
    cleaned = bleach.clean(raw, tags=tags, strip=True)
    cleaned = cleaned.strip()
    if max_length is not None:
        cleaned = cleaned[:max_length].strip()
    return cleaned or None


def normalize_slug(raw: Any, *, fallback: str = "presence-node") -> str:
    source = str(raw or fallback).strip().lower()
    source = _SLUG_RE.sub("-", source)
    source = _MULTI_DASH_RE.sub("-", source).strip("-")
    return (source or fallback)[:180].strip("-") or fallback


def ensure_unique_presence_slug(slug: str, *, current_node_id: int | None = None) -> str:
    base_slug = normalize_slug(slug)
    candidate = base_slug
    suffix = 2
    while True:
        query = PresenceNode.query.filter(PresenceNode.slug == candidate)
        if current_node_id:
            query = query.filter(PresenceNode.id != current_node_id)
        if not query.first():
            return candidate
        suffix_text = f"-{suffix}"
        candidate = f"{base_slug[: 180 - len(suffix_text)]}{suffix_text}"
        suffix += 1


def _is_public_http_url(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    hostname = (parsed.hostname or "").strip().lower()
    if not hostname or hostname in {"localhost", "127.0.0.1", "0.0.0.0"}:
        return False
    if hostname.endswith(".local") or hostname.endswith(".internal"):
        return False
    return True


def normalize_url(value: Any, *, allow_relative: bool = False) -> str | None:
    cleaned = _clean_text(value, max_length=700)
    if not cleaned:
        return None
    if allow_relative and cleaned.startswith("/") and not cleaned.startswith("//"):
        return cleaned
    if _is_public_http_url(cleaned):
        return cleaned
    raise PresenceValidationError("URL must be a public http(s) URL.")


def _bool(value: Any, default: bool = True) -> bool:
    if value is None:
        return default
    return bool(value)


def _int_or_none(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return []


def _float_or_none(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed


def _date_or_none(value: Any):
    if not value:
        return None
    if hasattr(value, "isoformat"):
        return value
    try:
        from datetime import datetime

        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except (TypeError, ValueError):
        return None


def public_url_for_node(node: PresenceNode, *, host_url: str | None = None) -> str:
    base = (host_url or request.host_url or current_app.config.get("FRONTEND_BASE_URL") or "").rstrip("/")
    return f"{base}/p/{quote(node.slug)}"


def _template_payload(template: PresenceTemplate | None) -> dict[str, Any] | None:
    if not template:
        return None
    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "node_type": template.node_type,
        "display_mode": template.display_mode,
        "preview_image_url": template.preview_image_url,
        "theme_schema": template.theme_schema or {},
        "layout_schema": template.layout_schema or {},
        "section_schema": template.section_schema or {},
        "supports_landing_portal": bool(template.supports_landing_portal),
        "supports_collections": bool(template.supports_collections),
        "supports_business_functions": bool(template.supports_business_functions),
        "supports_tradie_functions": bool(template.supports_tradie_functions),
        "supports_professional_contract": bool(template.supports_professional_contract),
        "is_active": bool(template.is_active),
        "is_premium": bool(template.is_premium),
        "created_at": template.created_at.isoformat() if template.created_at else None,
        "updated_at": template.updated_at.isoformat() if template.updated_at else None,
    }


def _node_org_payload(node: PresenceNode) -> dict[str, Any] | None:
    tenant = Node.query.get(node.tenant_id) if node.tenant_id else None
    if not tenant:
        return None
    return {
        "id": tenant.id,
        "slug": tenant.slug,
        "name": tenant.name,
        "status": tenant.status,
    }


def serialize_presence_node(
    node: PresenceNode,
    *,
    public: bool = False,
    include_children: bool = True,
    include_admin: bool = False,
) -> dict[str, Any]:
    payload = {
        "id": node.id,
        "slug": node.slug,
        "display_name": node.display_name,
        "headline": node.headline,
        "bio": node.bio,
        "node_type": node.node_type,
        "display_mode": node.display_mode,
        "plan_type": node.plan_type,
        "status": node.status if not public else "published",
        "visibility": node.visibility if not public else node.visibility,
        "template_id": node.template_id,
        "template": _template_payload(PresenceTemplate.query.get(node.template_id)) if node.template_id else None,
        "theme_config": node.theme_config or {},
        "visual_mood": node.visual_mood,
        "custom_typography_config": node.custom_typography_config or {},
        "custom_spacing_config": node.custom_spacing_config or {},
        "profile_image_url": node.profile_image_url,
        "cover_image_url": node.cover_image_url,
        "location_label": node.location_label,
        "service_area": node.service_area,
        "primary_cta_label": node.primary_cta_label,
        "primary_cta_url": node.primary_cta_url,
        "landing_enabled": bool(node.landing_enabled),
        "landing_title": node.landing_title,
        "landing_subtitle": node.landing_subtitle,
        "landing_background_url": node.landing_background_url,
        "landing_enter_label": node.landing_enter_label,
        "practice_statement": node.practice_statement,
        "curatorial_statement": node.curatorial_statement,
        "capability_statement": node.capability_statement,
        "proof_summary": node.proof_summary,
        "procurement_summary": node.procurement_summary,
        "business_functions_enabled": bool(node.business_functions_enabled),
        "directory_ready": bool(node.directory_ready),
        "map_ready": bool(node.map_ready),
        "archive_ready": bool(node.archive_ready),
        "marketplace_ready": bool(node.marketplace_ready),
        "white_label_ready": bool(node.white_label_ready),
        "public_email": node.public_email,
        "public_phone": node.public_phone,
        "organisation": _node_org_payload(node),
        "public_url": public_url_for_node(node),
        "created_at": node.created_at.isoformat() if node.created_at else None,
        "updated_at": node.updated_at.isoformat() if node.updated_at else None,
        "published_at": node.published_at.isoformat() if node.published_at else None,
        "seo": {
            "title": f"{node.display_name} {node.headline or ''}".strip(),
            "description": (node.bio or node.headline or node.display_name or "")[:180],
            "canonical_url": public_url_for_node(node),
            "image": node.cover_image_url or node.profile_image_url,
        },
    }
    if include_admin and not public:
        payload.update(
            {
                "owner_user_id": node.owner_user_id,
                "tenant_id": node.tenant_id,
                "organisation_id": node.organisation_id,
                "archived_at": node.archived_at.isoformat() if node.archived_at else None,
            }
        )
    if include_children:
        payload.update(
            {
                "sections": [
                    serialize_section(item)
                    for item in sorted(node.sections, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_visible
                ],
                "links": [
                    serialize_link(item)
                    for item in sorted(node.links, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_visible
                ],
                "services": [
                    serialize_service(item)
                    for item in sorted(node.services, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_visible
                ],
                "proof_items": [
                    serialize_proof_item(item)
                    for item in sorted(node.proof_items, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_public
                ],
                "credentials": [
                    serialize_credential(item)
                    for item in sorted(node.credentials, key=lambda row: (row.credential_type or "", row.id or 0))
                    if include_admin or item.is_public
                ],
                "procurement_profile": serialize_procurement_profile(
                    sorted(node.procurement_profiles, key=lambda row: row.id or 0)[0],
                    public=public and not include_admin,
                )
                if node.procurement_profiles
                else None,
                "collections": [
                    serialize_collection(item, include_admin=include_admin)
                    for item in sorted(node.collections, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_visible
                ],
                "works": [
                    serialize_work(item)
                    for item in sorted(node.works, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_visible
                ],
                "portfolio_items": [
                    serialize_portfolio_item(item)
                    for item in sorted(node.portfolio_items, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_visible
                ],
                "availability_chips": [
                    serialize_availability_chip(item)
                    for item in sorted(node.availability_chips, key=lambda row: (row.sort_order or 0, row.id or 0))
                    if include_admin or item.is_active
                ],
                "business_functions": [
                    serialize_business_function(item)
                    for item in sorted(node.business_functions, key=lambda row: (row.function_type or "", row.id or 0))
                    if include_admin or item.is_enabled
                ],
            }
        )
        if include_admin and not public:
            payload.update(
                {
                    "nfc_tags": [serialize_nfc_tag(item) for item in sorted(node.nfc_tags, key=lambda row: (row.created_at or now_utc(), row.id or 0))],
                    "connections": [
                        serialize_connection(item)
                        for item in sorted(node.connections, key=lambda row: (row.last_interaction_at or row.created_at or now_utc()), reverse=True)
                    ][:50],
                    "quotes": [serialize_quote(item) for item in sorted(node.quotes, key=lambda row: (row.updated_at or now_utc()), reverse=True)[:50]],
                    "variations": [serialize_variation(item) for item in sorted(node.variations, key=lambda row: (row.updated_at or now_utc()), reverse=True)[:50]],
                    "invoice_support_records": [
                        serialize_invoice_support(item)
                        for item in sorted(node.invoice_support_records, key=lambda row: (row.updated_at or now_utc()), reverse=True)[:50]
                    ],
                    "handovers": [serialize_handover(item) for item in sorted(node.handovers, key=lambda row: (row.updated_at or now_utc()), reverse=True)[:50]],
                }
            )
    return payload


def serialize_section(item: PresenceNodeSection) -> dict[str, Any]:
    return {
        "id": item.id,
        "section_type": item.section_type,
        "title": item.title,
        "content": item.content,
        "sort_order": item.sort_order,
        "is_visible": bool(item.is_visible),
        "config": item.config or {},
    }


def serialize_collection(item: PresenceCollection, *, include_admin: bool = False) -> dict[str, Any]:
    return {
        "id": item.id,
        "node_id": item.node_id if include_admin else None,
        "title": item.title,
        "description": item.description,
        "cover_image_url": item.cover_image_url,
        "sort_order": item.sort_order,
        "is_visible": bool(item.is_visible),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_work(item: PresenceWork) -> dict[str, Any]:
    return {
        "id": item.id,
        "collection_id": item.collection_id,
        "slug": item.slug,
        "title": item.title,
        "year": item.year,
        "medium": item.medium,
        "dimensions": item.dimensions,
        "description": item.description,
        "image_url": item.image_url,
        "thumbnail_url": item.thumbnail_url,
        "gallery_images": item.gallery_images or [],
        "external_url": item.external_url,
        "availability_status": item.availability_status,
        "price_label": item.price_label,
        "exhibition_history": item.exhibition_history,
        "notes": item.notes,
        "sort_order": item.sort_order,
        "is_visible": bool(item.is_visible),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_link(item: PresenceLink) -> dict[str, Any]:
    return {
        "id": item.id,
        "label": item.label,
        "url": item.url,
        "link_type": item.link_type,
        "icon": item.icon,
        "sort_order": item.sort_order,
        "is_visible": bool(item.is_visible),
    }


def serialize_service(item: PresenceService) -> dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "problem_solved": item.problem_solved,
        "who_it_is_for": item.who_it_is_for,
        "format": item.format,
        "deliverables": item.deliverables,
        "price_label": item.price_label,
        "duration_label": item.duration_label,
        "cta_label": item.cta_label,
        "cta_url": item.cta_url,
        "enquiry_type": item.enquiry_type,
        "sort_order": item.sort_order,
        "is_visible": bool(item.is_visible),
    }


def serialize_proof_item(item: PresenceProofItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "client_label": item.client_label,
        "industry": item.industry,
        "challenge": item.challenge,
        "approach": item.approach,
        "outcome": item.outcome,
        "metrics": item.metrics or {},
        "testimonial": item.testimonial,
        "media_urls": item.media_urls or [],
        "is_public": bool(item.is_public),
        "sort_order": item.sort_order,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_credential(item: PresenceCredential) -> dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "issuer": item.issuer,
        "credential_type": item.credential_type,
        "issued_at": item.issued_at.isoformat() if item.issued_at else None,
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
        "verification_url": item.verification_url,
        "is_public": bool(item.is_public),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_procurement_profile(item: PresenceProcurementProfile, *, public: bool = False) -> dict[str, Any]:
    payload = {
        "id": item.id,
        "business_name": item.business_name,
        "regions_served": item.regions_served or [],
        "contract_types": item.contract_types or [],
        "rate_label": item.rate_label,
        "insurance_status": item.insurance_status,
        "nda_ready": bool(item.nda_ready),
        "payment_terms_label": item.payment_terms_label,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }
    if not public:
        payload.update(
            {
                "node_id": item.node_id,
                "abn_acn_or_registration": item.abn_acn_or_registration,
                "procurement_contact_email": item.procurement_contact_email,
                "compliance_notes": item.compliance_notes,
            }
        )
    return payload


def serialize_portfolio_item(item: PresencePortfolioItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "media_url": item.media_url,
        "thumbnail_url": item.thumbnail_url,
        "external_url": item.external_url,
        "media_type": item.media_type,
        "sort_order": item.sort_order,
        "is_visible": bool(item.is_visible),
    }


def serialize_availability_chip(item: PresenceAvailabilityChip) -> dict[str, Any]:
    return {
        "id": item.id,
        "label": item.label,
        "chip_type": item.chip_type,
        "is_active": bool(item.is_active),
        "sort_order": item.sort_order,
    }


def serialize_business_function(item: PresenceBusinessFunction) -> dict[str, Any]:
    return {
        "id": item.id,
        "function_type": item.function_type,
        "is_enabled": bool(item.is_enabled),
        "config": item.config or {},
    }


def serialize_nfc_tag(item: PresenceNfcTag) -> dict[str, Any]:
    return {
        "id": item.id,
        "node_id": item.node_id,
        "tag_uid": item.tag_uid,
        "label": item.label,
        "tag_type": item.tag_type,
        "destination_url": item.destination_url,
        "source_code": item.source_code,
        "is_active": bool(item.is_active),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_connection(item: PresenceConnection, *, include_interactions: bool = False) -> dict[str, Any]:
    payload = {
        "id": item.id,
        "node_id": item.node_id,
        "contact_name": item.contact_name,
        "contact_email": item.contact_email,
        "contact_phone": item.contact_phone,
        "organisation": item.organisation,
        "source_type": item.source_type,
        "source_tag_id": item.source_tag_id,
        "status": item.status,
        "consent_status": item.consent_status,
        "notes": item.notes,
        "last_interaction_at": item.last_interaction_at.isoformat() if item.last_interaction_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }
    if include_interactions:
        payload["interactions"] = [
            serialize_interaction(row)
            for row in sorted(item.interactions, key=lambda interaction: interaction.occurred_at or now_utc(), reverse=True)
        ]
    return payload


def serialize_interaction(item: PresenceInteraction) -> dict[str, Any]:
    return {
        "id": item.id,
        "node_id": item.node_id,
        "connection_id": item.connection_id,
        "interaction_type": item.interaction_type,
        "source_type": item.source_type,
        "source_tag_id": item.source_tag_id,
        "metadata": item.metadata_json or {},
        "occurred_at": item.occurred_at.isoformat() if item.occurred_at else None,
    }


def _decimal_to_float(value: Any) -> float | None:
    return float(value) if value is not None else None


def serialize_quote(item: PresenceQuote) -> dict[str, Any]:
    return {
        "id": item.id,
        "node_id": item.node_id,
        "connection_id": item.connection_id,
        "title": item.title,
        "status": item.status,
        "description": item.description,
        "total_amount": _decimal_to_float(item.total_amount),
        "currency": item.currency,
        "terms": item.terms,
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
        "approved_at": item.approved_at.isoformat() if item.approved_at else None,
        "line_items": [
            {
                "id": row.id,
                "quote_id": row.quote_id,
                "label": row.label,
                "description": row.description,
                "quantity": _decimal_to_float(row.quantity),
                "unit_price": _decimal_to_float(row.unit_price),
                "total_price": _decimal_to_float(row.total_price),
                "sort_order": row.sort_order,
            }
            for row in sorted(item.line_items, key=lambda line: (line.sort_order or 0, line.id or 0))
        ],
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_variation(item: PresenceVariation) -> dict[str, Any]:
    return {
        "id": item.id,
        "quote_id": item.quote_id,
        "node_id": item.node_id,
        "connection_id": item.connection_id,
        "title": item.title,
        "reason": item.reason,
        "description": item.description,
        "price_delta": _decimal_to_float(item.price_delta),
        "time_delta": item.time_delta,
        "evidence_urls": item.evidence_urls or [],
        "status": item.status,
        "approved_by_name": item.approved_by_name,
        "approved_at": item.approved_at.isoformat() if item.approved_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_invoice_support(item: PresenceInvoiceSupport) -> dict[str, Any]:
    return {
        "id": item.id,
        "node_id": item.node_id,
        "connection_id": item.connection_id,
        "quote_id": item.quote_id,
        "external_invoice_url": item.external_invoice_url,
        "invoice_number": item.invoice_number,
        "status": item.status,
        "amount": _decimal_to_float(item.amount),
        "currency": item.currency,
        "notes": item.notes,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_handover(item: PresenceWorkHandover) -> dict[str, Any]:
    return {
        "id": item.id,
        "node_id": item.node_id,
        "connection_id": item.connection_id,
        "quote_id": item.quote_id,
        "summary": item.summary,
        "before_images": item.before_images or [],
        "after_images": item.after_images or [],
        "work_notes": item.work_notes,
        "materials_used": item.materials_used,
        "warranty_notes": item.warranty_notes,
        "customer_acceptance_status": item.customer_acceptance_status,
        "accepted_at": item.accepted_at.isoformat() if item.accepted_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_enquiry(item: PresenceEnquiry) -> dict[str, Any]:
    return {
        "id": item.id,
        "node_id": item.node_id,
        "organisation_id": item.organisation_id,
        "tenant_id": item.tenant_id,
        "connection_id": item.connection_id,
        "enquiry_type": item.enquiry_type,
        "name": item.name,
        "email": item.email,
        "phone": item.phone,
        "company": item.company,
        "role_title": item.role_title,
        "budget_range": item.budget_range,
        "timeline": item.timeline,
        "project_type": item.project_type,
        "urgency": item.urgency,
        "decision_maker_status": item.decision_maker_status,
        "message": item.message,
        "preferred_contact_method": item.preferred_contact_method,
        "metadata": item.metadata_json or {},
        "source_url": item.source_url,
        "source_type": item.source_type,
        "source_tag_id": item.source_tag_id,
        "status": item.status,
        "assigned_to_user_id": item.assigned_to_user_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def validate_node_payload(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")

    required = [] if partial else ["display_name"]
    missing = [field for field in required if not str(data.get(field) or "").strip()]
    if missing:
        raise PresenceValidationError("Required fields are missing.", {"missing": missing})

    payload: dict[str, Any] = {}
    if "display_name" in data:
        payload["display_name"] = _clean_text(data.get("display_name"), max_length=180)
        if not payload["display_name"]:
            raise PresenceValidationError("display_name is required.")
    if "headline" in data:
        payload["headline"] = _clean_text(data.get("headline"), max_length=220)
    if "bio" in data:
        payload["bio"] = _clean_text(data.get("bio"), max_length=3000, allow_basic_html=True)
    if "node_type" in data:
        node_type = str(data.get("node_type") or "custom").strip()
        if node_type not in PRESENCE_NODE_TYPES:
            raise PresenceValidationError("Unsupported node_type.", {"allowed": sorted(PRESENCE_NODE_TYPES)})
        payload["node_type"] = node_type
    if "display_mode" in data:
        display_mode = str(data.get("display_mode") or "profile_card").strip()
        if display_mode not in PRESENCE_NODE_DISPLAY_MODES:
            raise PresenceValidationError("Unsupported display_mode.", {"allowed": sorted(PRESENCE_NODE_DISPLAY_MODES)})
        payload["display_mode"] = display_mode
    if "plan_type" in data or "tier" in data:
        plan_type = str(data.get("plan_type") or data.get("tier") or "basic").strip()
        if plan_type not in PRESENCE_PLAN_TYPES:
            raise PresenceValidationError("Unsupported plan_type.", {"allowed": sorted(PRESENCE_PLAN_TYPES)})
        payload["plan_type"] = plan_type
    if "status" in data:
        status = str(data.get("status") or "").strip()
        if status not in PRESENCE_NODE_STATUSES:
            raise PresenceValidationError("Unsupported status.", {"allowed": sorted(PRESENCE_NODE_STATUSES)})
        payload["status"] = status
    if "visibility" in data:
        visibility = str(data.get("visibility") or "public").strip()
        if visibility in {"private-admin-only", "private/admin-only"}:
            visibility = "private_admin_only"
        if visibility not in PRESENCE_NODE_VISIBILITIES:
            raise PresenceValidationError("Unsupported visibility.", {"allowed": sorted(PRESENCE_NODE_VISIBILITIES)})
        payload["visibility"] = visibility
    if "slug" in data:
        payload["slug"] = normalize_slug(data.get("slug"))
    if "owner_user_id" in data:
        payload["owner_user_id"] = _int_or_none(data.get("owner_user_id"))
    if "organisation_id" in data:
        payload["organisation_id"] = _int_or_none(data.get("organisation_id"))
    if "tenant_id" in data:
        payload["tenant_id"] = _int_or_none(data.get("tenant_id"))
    if "template_id" in data:
        payload["template_id"] = _int_or_none(data.get("template_id"))
    if "theme_config" in data:
        payload["theme_config"] = _json_object(data.get("theme_config"))
    if "custom_typography_config" in data:
        payload["custom_typography_config"] = _json_object(data.get("custom_typography_config"))
    if "custom_spacing_config" in data:
        payload["custom_spacing_config"] = _json_object(data.get("custom_spacing_config"))
    for key in ("profile_image_url", "cover_image_url", "landing_background_url"):
        if key in data:
            payload[key] = normalize_url(data.get(key)) if data.get(key) else None
    for key, limit in (
        ("location_label", 180),
        ("service_area", 220),
        ("primary_cta_label", 100),
        ("visual_mood", 120),
        ("landing_title", 180),
        ("landing_subtitle", 260),
        ("landing_enter_label", 80),
    ):
        if key in data:
            payload[key] = _clean_text(data.get(key), max_length=limit)
    if "primary_cta_url" in data:
        payload["primary_cta_url"] = normalize_url(data.get("primary_cta_url")) if data.get("primary_cta_url") else None
    for key in ("landing_enabled", "business_functions_enabled", "directory_ready", "map_ready", "archive_ready", "marketplace_ready", "white_label_ready"):
        if key in data:
            payload[key] = _bool(data.get(key), False)
    if "practice_statement" in data:
        payload["practice_statement"] = _clean_text(data.get("practice_statement"), max_length=6000, allow_basic_html=True)
    if "curatorial_statement" in data:
        payload["curatorial_statement"] = _clean_text(data.get("curatorial_statement"), max_length=6000, allow_basic_html=True)
    if "capability_statement" in data:
        payload["capability_statement"] = _clean_text(data.get("capability_statement"), max_length=6000, allow_basic_html=True)
    if "proof_summary" in data:
        payload["proof_summary"] = _clean_text(data.get("proof_summary"), max_length=4000, allow_basic_html=True)
    if "procurement_summary" in data:
        payload["procurement_summary"] = _clean_text(data.get("procurement_summary"), max_length=4000, allow_basic_html=True)
    if "public_email" in data:
        email = _clean_text(data.get("public_email"), max_length=180)
        if email and not _EMAIL_RE.match(email):
            raise PresenceValidationError("public_email must be a valid email address.")
        payload["public_email"] = email
    if "public_phone" in data:
        payload["public_phone"] = _clean_text(data.get("public_phone"), max_length=80)
    return payload


def _replace_children(node: PresenceNode, attr: str, model, rows: list[dict[str, Any]], normalizer):
    for existing in list(getattr(node, attr)):
        db.session.delete(existing)
    db.session.flush()
    for index, raw in enumerate(rows or []):
        normalized = normalizer(raw or {}, index)
        if normalized:
            db.session.add(model(node_id=node.id, **normalized))


def _normalize_section(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    section_type = _clean_text(raw.get("section_type") or raw.get("type"), max_length=80)
    if not section_type:
        return None
    return {
        "section_type": section_type,
        "title": _clean_text(raw.get("title"), max_length=180),
        "content": _clean_text(raw.get("content"), max_length=3000, allow_basic_html=True),
        "sort_order": int(raw.get("sort_order", index) or 0),
        "is_visible": _bool(raw.get("is_visible"), True),
        "config": _json_object(raw.get("config")),
    }


def _normalize_collection(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    title = _clean_text(raw.get("title"), max_length=180)
    if not title:
        return None
    return {
        "title": title,
        "description": _clean_text(raw.get("description"), max_length=1600, allow_basic_html=True),
        "cover_image_url": normalize_url(raw.get("cover_image_url")) if raw.get("cover_image_url") else None,
        "sort_order": int(raw.get("sort_order", index) or 0),
        "is_visible": _bool(raw.get("is_visible"), True),
    }


def _normalize_work(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    title = _clean_text(raw.get("title"), max_length=180)
    if not title:
        return None
    slug = normalize_slug(raw.get("slug") or title)
    if index:
        slug = raw.get("slug") and slug or f"{slug}-{index + 1}"
    gallery_images = []
    if isinstance(raw.get("gallery_images"), list):
        for image in raw.get("gallery_images") or []:
            try:
                url = normalize_url(image)
            except PresenceValidationError:
                continue
            if url:
                gallery_images.append(url)
            if len(gallery_images) >= 12:
                break
    return {
        "collection_id": _int_or_none(raw.get("collection_id")),
        "slug": slug,
        "title": title,
        "year": _clean_text(raw.get("year"), max_length=40),
        "medium": _clean_text(raw.get("medium"), max_length=180),
        "dimensions": _clean_text(raw.get("dimensions"), max_length=120),
        "description": _clean_text(raw.get("description"), max_length=2400, allow_basic_html=True),
        "image_url": normalize_url(raw.get("image_url")) if raw.get("image_url") else None,
        "thumbnail_url": normalize_url(raw.get("thumbnail_url")) if raw.get("thumbnail_url") else None,
        "gallery_images": gallery_images,
        "external_url": normalize_url(raw.get("external_url")) if raw.get("external_url") else None,
        "availability_status": _clean_text(raw.get("availability_status"), max_length=80),
        "price_label": _clean_text(raw.get("price_label"), max_length=100),
        "exhibition_history": _clean_text(raw.get("exhibition_history"), max_length=3000, allow_basic_html=True),
        "notes": _clean_text(raw.get("notes"), max_length=2000, allow_basic_html=True),
        "sort_order": int(raw.get("sort_order", index) or 0),
        "is_visible": _bool(raw.get("is_visible"), True),
    }


def _normalize_link(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    label = _clean_text(raw.get("label"), max_length=120)
    url = normalize_url(raw.get("url")) if raw.get("url") else None
    if not label or not url:
        return None
    return {
        "label": label,
        "url": url,
        "link_type": _clean_text(raw.get("link_type"), max_length=80) or "website",
        "icon": _clean_text(raw.get("icon"), max_length=80),
        "sort_order": int(raw.get("sort_order", index) or 0),
        "is_visible": _bool(raw.get("is_visible"), True),
    }


def _normalize_service(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    title = _clean_text(raw.get("title"), max_length=160)
    if not title:
        return None
    cta_url = normalize_url(raw.get("cta_url")) if raw.get("cta_url") else None
    return {
        "title": title,
        "description": _clean_text(raw.get("description"), max_length=1400, allow_basic_html=True),
        "problem_solved": _clean_text(raw.get("problem_solved"), max_length=1400, allow_basic_html=True),
        "who_it_is_for": _clean_text(raw.get("who_it_is_for"), max_length=1400, allow_basic_html=True),
        "format": _clean_text(raw.get("format"), max_length=120),
        "deliverables": _clean_text(raw.get("deliverables"), max_length=1800, allow_basic_html=True),
        "price_label": _clean_text(raw.get("price_label"), max_length=100),
        "duration_label": _clean_text(raw.get("duration_label"), max_length=100),
        "cta_label": _clean_text(raw.get("cta_label"), max_length=100),
        "cta_url": cta_url,
        "enquiry_type": _clean_text(raw.get("enquiry_type"), max_length=80),
        "sort_order": int(raw.get("sort_order", index) or 0),
        "is_visible": _bool(raw.get("is_visible"), True),
    }


def _normalize_portfolio(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    title = _clean_text(raw.get("title"), max_length=180)
    if not title:
        return None
    return {
        "title": title,
        "description": _clean_text(raw.get("description"), max_length=1200, allow_basic_html=True),
        "media_url": normalize_url(raw.get("media_url")) if raw.get("media_url") else None,
        "thumbnail_url": normalize_url(raw.get("thumbnail_url")) if raw.get("thumbnail_url") else None,
        "external_url": normalize_url(raw.get("external_url")) if raw.get("external_url") else None,
        "media_type": _clean_text(raw.get("media_type"), max_length=80) or "image",
        "sort_order": int(raw.get("sort_order", index) or 0),
        "is_visible": _bool(raw.get("is_visible"), True),
    }


def _normalize_chip(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    label = _clean_text(raw.get("label"), max_length=120)
    if not label:
        return None
    return {
        "label": label,
        "chip_type": _clean_text(raw.get("chip_type"), max_length=80) or "availability",
        "is_active": _bool(raw.get("is_active"), True),
        "sort_order": int(raw.get("sort_order", index) or 0),
    }


def _normalize_business_function(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    function_type = _clean_text(raw.get("function_type"), max_length=80)
    if not function_type:
        return None
    if function_type not in PRESENCE_BUSINESS_FUNCTION_TYPES:
        raise PresenceValidationError("Unsupported business function type.", {"allowed": sorted(PRESENCE_BUSINESS_FUNCTION_TYPES)})
    return {
        "function_type": function_type,
        "is_enabled": _bool(raw.get("is_enabled"), True),
        "config": _json_object(raw.get("config")),
    }


def _normalize_proof(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    title = _clean_text(raw.get("title"), max_length=180)
    if not title:
        return None
    media_urls = []
    for url in _json_list(raw.get("media_urls")):
        if isinstance(url, str) and _is_public_http_url(url):
            media_urls.append(url)
    return {
        "title": title,
        "client_label": _clean_text(raw.get("client_label"), max_length=160),
        "industry": _clean_text(raw.get("industry"), max_length=120),
        "challenge": _clean_text(raw.get("challenge"), max_length=2400, allow_basic_html=True),
        "approach": _clean_text(raw.get("approach"), max_length=2400, allow_basic_html=True),
        "outcome": _clean_text(raw.get("outcome"), max_length=2400, allow_basic_html=True),
        "metrics": _json_object(raw.get("metrics")),
        "testimonial": _clean_text(raw.get("testimonial"), max_length=2400, allow_basic_html=True),
        "media_urls": media_urls,
        "is_public": _bool(raw.get("is_public"), True),
        "sort_order": int(raw.get("sort_order", index) or 0),
    }


def _normalize_credential(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    title = _clean_text(raw.get("title"), max_length=180)
    if not title:
        return None
    return {
        "title": title,
        "issuer": _clean_text(raw.get("issuer"), max_length=180),
        "credential_type": _clean_text(raw.get("credential_type"), max_length=80) or "credential",
        "issued_at": _date_or_none(raw.get("issued_at")),
        "expires_at": _date_or_none(raw.get("expires_at")),
        "verification_url": normalize_url(raw.get("verification_url")) if raw.get("verification_url") else None,
        "is_public": _bool(raw.get("is_public"), True),
    }


def _normalize_procurement(raw: dict[str, Any]) -> dict[str, Any]:
    email = _clean_text(raw.get("procurement_contact_email"), max_length=180)
    if email and not _EMAIL_RE.match(email):
        raise PresenceValidationError("procurement_contact_email must be a valid email address.")
    return {
        "business_name": _clean_text(raw.get("business_name"), max_length=180),
        "abn_acn_or_registration": _clean_text(raw.get("abn_acn_or_registration"), max_length=120),
        "regions_served": _json_list(raw.get("regions_served")),
        "contract_types": _json_list(raw.get("contract_types")),
        "rate_label": _clean_text(raw.get("rate_label"), max_length=120),
        "insurance_status": _clean_text(raw.get("insurance_status"), max_length=120),
        "nda_ready": _bool(raw.get("nda_ready"), False),
        "procurement_contact_email": email,
        "compliance_notes": _clean_text(raw.get("compliance_notes"), max_length=3000, allow_basic_html=True),
        "payment_terms_label": _clean_text(raw.get("payment_terms_label"), max_length=120),
    }


def _normalize_nfc_tag(raw: dict[str, Any]) -> dict[str, Any]:
    label = _clean_text(raw.get("label"), max_length=160)
    if not label:
        raise PresenceValidationError("label is required.")
    tag_type = _clean_text(raw.get("tag_type"), max_length=80) or "custom"
    if tag_type not in PRESENCE_NFC_TAG_TYPES:
        raise PresenceValidationError("Unsupported NFC tag type.", {"allowed": sorted(PRESENCE_NFC_TAG_TYPES)})
    source_code = normalize_slug(raw.get("source_code") or label, fallback="nfc-source")[:120]
    return {
        "tag_uid": _clean_text(raw.get("tag_uid"), max_length=180),
        "label": label,
        "tag_type": tag_type,
        "destination_url": normalize_url(raw.get("destination_url"), allow_relative=True) if raw.get("destination_url") else None,
        "source_code": source_code,
        "is_active": _bool(raw.get("is_active"), True),
    }


def _normalize_connection(raw: dict[str, Any]) -> dict[str, Any]:
    status = _clean_text(raw.get("status"), max_length=80) or "scanned"
    if status not in PRESENCE_CONNECTION_STATUSES:
        raise PresenceValidationError("Unsupported connection status.", {"allowed": sorted(PRESENCE_CONNECTION_STATUSES)})
    email = _clean_text(raw.get("contact_email") or raw.get("email"), max_length=180)
    if email and not _EMAIL_RE.match(email):
        raise PresenceValidationError("contact_email must be a valid email address.")
    return {
        "contact_name": _clean_text(raw.get("contact_name") or raw.get("name"), max_length=160),
        "contact_email": email,
        "contact_phone": _clean_text(raw.get("contact_phone") or raw.get("phone"), max_length=80),
        "organisation": _clean_text(raw.get("organisation") or raw.get("company"), max_length=180),
        "source_type": _clean_text(raw.get("source_type"), max_length=80) or "manual",
        "source_tag_id": _int_or_none(raw.get("source_tag_id")),
        "status": status,
        "consent_status": _clean_text(raw.get("consent_status"), max_length=80) or "unknown",
        "notes": _clean_text(raw.get("notes"), max_length=3000, allow_basic_html=True),
        "last_interaction_at": _date_or_none(raw.get("last_interaction_at")),
    }


def _normalize_quote(raw: dict[str, Any]) -> dict[str, Any]:
    title = _clean_text(raw.get("title"), max_length=180)
    if not title:
        raise PresenceValidationError("title is required.")
    status = _clean_text(raw.get("status"), max_length=80) or "draft"
    if status not in PRESENCE_QUOTE_STATUSES:
        raise PresenceValidationError("Unsupported quote status.", {"allowed": sorted(PRESENCE_QUOTE_STATUSES)})
    return {
        "connection_id": _int_or_none(raw.get("connection_id")),
        "title": title,
        "status": status,
        "description": _clean_text(raw.get("description"), max_length=4000, allow_basic_html=True),
        "total_amount": _float_or_none(raw.get("total_amount")),
        "currency": _clean_text(raw.get("currency"), max_length=12) or "AUD",
        "terms": _clean_text(raw.get("terms"), max_length=4000, allow_basic_html=True),
        "expires_at": _date_or_none(raw.get("expires_at")),
        "approved_at": _date_or_none(raw.get("approved_at")),
    }


def _normalize_variation(raw: dict[str, Any]) -> dict[str, Any]:
    title = _clean_text(raw.get("title"), max_length=180)
    if not title:
        raise PresenceValidationError("title is required.")
    status = _clean_text(raw.get("status"), max_length=80) or "draft"
    if status not in PRESENCE_VARIATION_STATUSES:
        raise PresenceValidationError("Unsupported variation status.", {"allowed": sorted(PRESENCE_VARIATION_STATUSES)})
    evidence_urls = [url for url in _json_list(raw.get("evidence_urls")) if isinstance(url, str) and _is_public_http_url(url)]
    return {
        "quote_id": _int_or_none(raw.get("quote_id")),
        "connection_id": _int_or_none(raw.get("connection_id")),
        "title": title,
        "reason": _clean_text(raw.get("reason"), max_length=2000, allow_basic_html=True),
        "description": _clean_text(raw.get("description"), max_length=4000, allow_basic_html=True),
        "price_delta": _float_or_none(raw.get("price_delta")),
        "time_delta": _clean_text(raw.get("time_delta"), max_length=120),
        "evidence_urls": evidence_urls,
        "status": status,
        "approved_by_name": _clean_text(raw.get("approved_by_name"), max_length=160),
        "approved_at": _date_or_none(raw.get("approved_at")),
    }


def _normalize_invoice_support(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "connection_id": _int_or_none(raw.get("connection_id")),
        "quote_id": _int_or_none(raw.get("quote_id")),
        "external_invoice_url": normalize_url(raw.get("external_invoice_url")) if raw.get("external_invoice_url") else None,
        "invoice_number": _clean_text(raw.get("invoice_number"), max_length=120),
        "status": _clean_text(raw.get("status"), max_length=80) or "draft",
        "amount": _float_or_none(raw.get("amount")),
        "currency": _clean_text(raw.get("currency"), max_length=12) or "AUD",
        "notes": _clean_text(raw.get("notes"), max_length=3000, allow_basic_html=True),
    }


def _normalize_handover(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "connection_id": _int_or_none(raw.get("connection_id")),
        "quote_id": _int_or_none(raw.get("quote_id")),
        "summary": _clean_text(raw.get("summary"), max_length=4000, allow_basic_html=True),
        "before_images": [url for url in _json_list(raw.get("before_images")) if isinstance(url, str) and _is_public_http_url(url)],
        "after_images": [url for url in _json_list(raw.get("after_images")) if isinstance(url, str) and _is_public_http_url(url)],
        "work_notes": _clean_text(raw.get("work_notes"), max_length=4000, allow_basic_html=True),
        "materials_used": _clean_text(raw.get("materials_used"), max_length=2400, allow_basic_html=True),
        "warranty_notes": _clean_text(raw.get("warranty_notes"), max_length=2400, allow_basic_html=True),
        "customer_acceptance_status": _clean_text(raw.get("customer_acceptance_status"), max_length=80) or "pending",
        "accepted_at": _date_or_none(raw.get("accepted_at")),
    }


def _normalize_quote_line_item(raw: dict[str, Any], index: int) -> dict[str, Any] | None:
    label = _clean_text(raw.get("label"), max_length=180)
    if not label:
        return None
    quantity = _float_or_none(raw.get("quantity"))
    unit_price = _float_or_none(raw.get("unit_price"))
    total_price = _float_or_none(raw.get("total_price"))
    if total_price is None and quantity is not None and unit_price is not None:
        total_price = quantity * unit_price
    return {
        "label": label,
        "description": _clean_text(raw.get("description"), max_length=1600, allow_basic_html=True),
        "quantity": quantity if quantity is not None else 1,
        "unit_price": unit_price,
        "total_price": total_price,
        "sort_order": int(raw.get("sort_order", index) or 0),
    }


def _validate_optional_node_child_ids(
    node: PresenceNode,
    *,
    connection_id: int | None = None,
    quote_id: int | None = None,
    source_tag_id: int | None = None,
) -> None:
    if connection_id and not PresenceConnection.query.filter_by(id=connection_id, node_id=node.id).first():
        raise PresenceValidationError("connection_id must belong to this Presence Node.")
    if quote_id and not PresenceQuote.query.filter_by(id=quote_id, node_id=node.id).first():
        raise PresenceValidationError("quote_id must belong to this Presence Node.")
    if source_tag_id and not PresenceNfcTag.query.filter_by(id=source_tag_id, node_id=node.id).first():
        raise PresenceValidationError("source_tag_id must belong to this Presence Node.")


def source_tag_for_node(node: PresenceNode, data: dict[str, Any]) -> PresenceNfcTag | None:
    source_tag_id = _int_or_none(data.get("source_tag_id"))
    if source_tag_id:
        return PresenceNfcTag.query.filter_by(id=source_tag_id, node_id=node.id).first()
    source_code = _clean_text(data.get("source_code") or data.get("nfc") or data.get("source"), max_length=120)
    if source_code:
        normalized = normalize_slug(source_code, fallback=source_code)
        return PresenceNfcTag.query.filter_by(node_id=node.id, source_code=normalized, is_active=True).first()
    return None


def _public_source_type(data: dict[str, Any], tag: PresenceNfcTag | None = None) -> str | None:
    source_type = _clean_text(data.get("source_type"), max_length=80)
    if source_type:
        return source_type
    source = _clean_text(data.get("source") or data.get("nfc") or data.get("source_code"), max_length=120)
    if tag:
        return tag.tag_type
    if source:
        return "nfc" if "nfc" in source.lower() else "qr"
    return None


def sync_presence_children(node: PresenceNode, data: dict[str, Any]) -> None:
    if "sections" in data:
        _replace_children(node, "sections", PresenceNodeSection, data.get("sections") or [], _normalize_section)
    if "collections" in data:
        _replace_children(node, "collections", PresenceCollection, data.get("collections") or [], _normalize_collection)
    if "works" in data:
        _replace_children(node, "works", PresenceWork, data.get("works") or [], _normalize_work)
    if "links" in data:
        _replace_children(node, "links", PresenceLink, data.get("links") or [], _normalize_link)
    if "services" in data:
        _replace_children(node, "services", PresenceService, data.get("services") or [], _normalize_service)
    if "portfolio_items" in data:
        _replace_children(node, "portfolio_items", PresencePortfolioItem, data.get("portfolio_items") or [], _normalize_portfolio)
    if "availability_chips" in data:
        _replace_children(
            node,
            "availability_chips",
            PresenceAvailabilityChip,
            data.get("availability_chips") or [],
            _normalize_chip,
        )
    if "business_functions" in data:
        _replace_children(
            node,
            "business_functions",
            PresenceBusinessFunction,
            data.get("business_functions") or [],
            _normalize_business_function,
        )
    if "proof_items" in data:
        _replace_children(node, "proof_items", PresenceProofItem, data.get("proof_items") or [], _normalize_proof)
    if "credentials" in data:
        _replace_children(node, "credentials", PresenceCredential, data.get("credentials") or [], _normalize_credential)
    if "procurement_profile" in data and isinstance(data.get("procurement_profile"), dict):
        upsert_procurement_profile(node, data.get("procurement_profile") or {})


def _default_display_mode(node_type: str | None, plan_type: str | None = None) -> str:
    if plan_type == "professional_contract" or node_type in {"fractional_executive", "advisor"}:
        return "professional_contract"
    if plan_type == "opportunity_kit":
        return "opportunity_profile"
    if plan_type == "tradie_field_service" or node_type in {"tradie", "field_service"}:
        return "tradie_profile"
    if plan_type == "artist_presence" or node_type in {"artist", "creative"}:
        return "artist_gallery"
    if node_type == "practitioner":
        return "practitioner_profile"
    if node_type == "venue":
        return "venue_profile"
    if node_type == "organisation":
        return "organisation_profile"
    if plan_type == "premium":
        return "premium_profile"
    if plan_type == "white_label_network":
        return "white_label_network_entry"
    return "profile_card"


def create_presence_node(data: dict[str, Any], *, actor: User | None) -> PresenceNode:
    payload = validate_node_payload(data, partial=False)
    if not payload.get("slug"):
        payload["slug"] = normalize_slug(payload.get("display_name"))
    payload["slug"] = ensure_unique_presence_slug(payload["slug"])
    payload.setdefault("status", "draft")
    payload.setdefault("visibility", "public")
    payload.setdefault("node_type", "custom")
    payload.setdefault("plan_type", "basic")
    payload.setdefault("display_mode", _default_display_mode(payload.get("node_type"), payload.get("plan_type")))
    if actor and not payload.get("owner_user_id"):
        payload["owner_user_id"] = actor.id
    if actor and not payload.get("tenant_id"):
        payload["tenant_id"] = actor.node_id

    node = PresenceNode(**payload)
    db.session.add(node)
    db.session.flush()
    sync_presence_children(node, data)
    db.session.flush()
    return node


def update_presence_node(node: PresenceNode, data: dict[str, Any]) -> PresenceNode:
    payload = validate_node_payload(data, partial=True)
    if "slug" in payload:
        payload["slug"] = ensure_unique_presence_slug(payload["slug"], current_node_id=node.id)
    for key, value in payload.items():
        setattr(node, key, value)
    sync_presence_children(node, data)
    db.session.flush()
    return node


def validate_collection_payload(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")
    if partial:
        payload: dict[str, Any] = {}
        if "title" in data:
            title = _clean_text(data.get("title"), max_length=180)
            if not title:
                raise PresenceValidationError("title is required.")
            payload["title"] = title
        if "description" in data:
            payload["description"] = _clean_text(data.get("description"), max_length=1600, allow_basic_html=True)
        if "cover_image_url" in data:
            payload["cover_image_url"] = normalize_url(data.get("cover_image_url")) if data.get("cover_image_url") else None
        if "sort_order" in data:
            payload["sort_order"] = int(data.get("sort_order") or 0)
        if "is_visible" in data:
            payload["is_visible"] = _bool(data.get("is_visible"), True)
        return payload
    payload = _normalize_collection(data, int(data.get("sort_order", 0) or 0)) or {}
    if not payload.get("title"):
        raise PresenceValidationError("title is required.")
    return payload


def create_presence_collection(node: PresenceNode, data: dict[str, Any]) -> PresenceCollection:
    payload = validate_collection_payload(data, partial=False)
    collection = PresenceCollection(node_id=node.id, **payload)
    db.session.add(collection)
    db.session.flush()
    return collection


def update_presence_collection(collection: PresenceCollection, data: dict[str, Any]) -> PresenceCollection:
    payload = validate_collection_payload(data, partial=True)
    for key, value in payload.items():
        setattr(collection, key, value)
    db.session.flush()
    return collection


def validate_work_payload(node: PresenceNode, data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")
    if partial:
        payload: dict[str, Any] = {}
        if "collection_id" in data:
            payload["collection_id"] = _int_or_none(data.get("collection_id"))
        if "slug" in data:
            payload["slug"] = normalize_slug(data.get("slug"), fallback="work")
        if "title" in data:
            title = _clean_text(data.get("title"), max_length=180)
            if not title:
                raise PresenceValidationError("title is required.")
            payload["title"] = title
        for key, limit in (
            ("year", 40),
            ("medium", 180),
            ("dimensions", 120),
            ("availability_status", 80),
            ("price_label", 100),
        ):
            if key in data:
                payload[key] = _clean_text(data.get(key), max_length=limit)
        for key, limit in (
            ("description", 2400),
            ("exhibition_history", 3000),
            ("notes", 2000),
        ):
            if key in data:
                payload[key] = _clean_text(data.get(key), max_length=limit, allow_basic_html=True)
        for key in ("image_url", "thumbnail_url", "external_url"):
            if key in data:
                payload[key] = normalize_url(data.get(key)) if data.get(key) else None
        if "gallery_images" in data:
            payload["gallery_images"] = [
                normalize_url(image)
                for image in (data.get("gallery_images") or [])
                if isinstance(image, str) and _is_public_http_url(image)
            ][:12]
        if "sort_order" in data:
            payload["sort_order"] = int(data.get("sort_order") or 0)
        if "is_visible" in data:
            payload["is_visible"] = _bool(data.get("is_visible"), True)
    else:
        payload = _normalize_work(data, int(data.get("sort_order", 0) or 0)) or {}
        if not payload.get("title"):
            raise PresenceValidationError("title is required.")
    collection_id = payload.get("collection_id")
    if collection_id and not PresenceCollection.query.filter_by(id=collection_id, node_id=node.id).first():
        raise PresenceValidationError("collection_id must belong to this Presence Node.")
    if payload.get("slug"):
        payload["slug"] = ensure_unique_presence_work_slug(node, payload["slug"], current_work_id=_int_or_none(data.get("id")))
    return payload


def ensure_unique_presence_work_slug(node: PresenceNode, slug: str, *, current_work_id: int | None = None) -> str:
    base_slug = normalize_slug(slug, fallback="work")
    candidate = base_slug
    suffix = 2
    while True:
        query = PresenceWork.query.filter(PresenceWork.node_id == node.id, PresenceWork.slug == candidate)
        if current_work_id:
            query = query.filter(PresenceWork.id != current_work_id)
        if not query.first():
            return candidate
        suffix_text = f"-{suffix}"
        candidate = f"{base_slug[: 180 - len(suffix_text)]}{suffix_text}"
        suffix += 1


def create_presence_work(node: PresenceNode, data: dict[str, Any]) -> PresenceWork:
    payload = validate_work_payload(node, data, partial=False)
    work = PresenceWork(node_id=node.id, **payload)
    db.session.add(work)
    db.session.flush()
    return work


def update_presence_work(work: PresenceWork, data: dict[str, Any]) -> PresenceWork:
    node = PresenceNode.query.get(work.node_id)
    if not node:
        raise PresenceValidationError("Presence Node not found.")
    data_with_id = {**data, "id": work.id}
    payload = validate_work_payload(node, data_with_id, partial=True)
    for key, value in payload.items():
        setattr(work, key, value)
    db.session.flush()
    return work


def validate_service_payload(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")
    if partial:
        payload: dict[str, Any] = {}
        if "title" in data:
            title = _clean_text(data.get("title"), max_length=160)
            if not title:
                raise PresenceValidationError("title is required.")
            payload["title"] = title
        for key, limit, html in (
            ("description", 1400, True),
            ("problem_solved", 1400, True),
            ("who_it_is_for", 1400, True),
            ("format", 120, False),
            ("deliverables", 1800, True),
            ("price_label", 100, False),
            ("duration_label", 100, False),
            ("cta_label", 100, False),
            ("enquiry_type", 80, False),
        ):
            if key in data:
                payload[key] = _clean_text(data.get(key), max_length=limit, allow_basic_html=html)
        if "cta_url" in data:
            payload["cta_url"] = normalize_url(data.get("cta_url")) if data.get("cta_url") else None
        if "sort_order" in data:
            payload["sort_order"] = int(data.get("sort_order") or 0)
        if "is_visible" in data:
            payload["is_visible"] = _bool(data.get("is_visible"), True)
        return payload
    payload = _normalize_service(data, int(data.get("sort_order", 0) or 0)) or {}
    if not payload.get("title"):
        raise PresenceValidationError("title is required.")
    return payload


def create_presence_service(node: PresenceNode, data: dict[str, Any]) -> PresenceService:
    service = PresenceService(node_id=node.id, **validate_service_payload(data, partial=False))
    db.session.add(service)
    db.session.flush()
    return service


def update_presence_service(service: PresenceService, data: dict[str, Any]) -> PresenceService:
    payload = validate_service_payload(data, partial=True)
    for key, value in payload.items():
        setattr(service, key, value)
    db.session.flush()
    return service


def validate_proof_payload(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")
    if partial:
        payload: dict[str, Any] = {}
        if "title" in data:
            title = _clean_text(data.get("title"), max_length=180)
            if not title:
                raise PresenceValidationError("title is required.")
            payload["title"] = title
        for key, limit in (("client_label", 160), ("industry", 120)):
            if key in data:
                payload[key] = _clean_text(data.get(key), max_length=limit)
        for key, limit in (("challenge", 2400), ("approach", 2400), ("outcome", 2400), ("testimonial", 2400)):
            if key in data:
                payload[key] = _clean_text(data.get(key), max_length=limit, allow_basic_html=True)
        if "metrics" in data:
            payload["metrics"] = _json_object(data.get("metrics"))
        if "media_urls" in data:
            payload["media_urls"] = [url for url in _json_list(data.get("media_urls")) if isinstance(url, str) and _is_public_http_url(url)]
        if "sort_order" in data:
            payload["sort_order"] = int(data.get("sort_order") or 0)
        if "is_public" in data:
            payload["is_public"] = _bool(data.get("is_public"), True)
        return payload
    payload = _normalize_proof(data, int(data.get("sort_order", 0) or 0)) or {}
    if not payload.get("title"):
        raise PresenceValidationError("title is required.")
    return payload


def create_presence_proof_item(node: PresenceNode, data: dict[str, Any]) -> PresenceProofItem:
    item = PresenceProofItem(node_id=node.id, **validate_proof_payload(data, partial=False))
    db.session.add(item)
    db.session.flush()
    return item


def update_presence_proof_item(item: PresenceProofItem, data: dict[str, Any]) -> PresenceProofItem:
    payload = validate_proof_payload(data, partial=True)
    for key, value in payload.items():
        setattr(item, key, value)
    db.session.flush()
    return item


def upsert_procurement_profile(node: PresenceNode, data: dict[str, Any]) -> PresenceProcurementProfile:
    payload = _normalize_procurement(data)
    profile = PresenceProcurementProfile.query.filter_by(node_id=node.id).first()
    if not profile:
        profile = PresenceProcurementProfile(node_id=node.id)
        db.session.add(profile)
    for key, value in payload.items():
        setattr(profile, key, value)
    db.session.flush()
    return profile


def create_presence_nfc_tag(node: PresenceNode, data: dict[str, Any]) -> PresenceNfcTag:
    payload = _normalize_nfc_tag(data)
    existing = PresenceNfcTag.query.filter_by(node_id=node.id, source_code=payload["source_code"]).first()
    if existing:
        raise PresenceValidationError("source_code already exists for this Presence Node.")
    tag = PresenceNfcTag(node_id=node.id, **payload)
    db.session.add(tag)
    db.session.flush()
    return tag


def update_presence_nfc_tag(tag: PresenceNfcTag, data: dict[str, Any]) -> PresenceNfcTag:
    node = PresenceNode.query.get(tag.node_id)
    if not node:
        raise PresenceValidationError("Presence Node not found.")
    payload = _normalize_nfc_tag({**serialize_nfc_tag(tag), **data})
    existing = PresenceNfcTag.query.filter(
        PresenceNfcTag.node_id == node.id,
        PresenceNfcTag.source_code == payload["source_code"],
        PresenceNfcTag.id != tag.id,
    ).first()
    if existing:
        raise PresenceValidationError("source_code already exists for this Presence Node.")
    for key, value in payload.items():
        setattr(tag, key, value)
    db.session.flush()
    return tag


def record_presence_source_hit(node: PresenceNode, data: dict[str, Any]) -> dict[str, Any]:
    tag = source_tag_for_node(node, data)
    source_type = _public_source_type(data, tag) or "source_hit"
    source_tag_id = tag.id if tag else None
    source_code = _clean_text(data.get("source_code") or data.get("nfc") or data.get("source"), max_length=120)
    event_type = "nfc_scanned" if source_type and ("nfc" in source_type or source_type in PRESENCE_NFC_TAG_TYPES) else "qr_scanned"
    interaction = create_presence_interaction(
        node,
        event_type,
        source_type=source_type,
        source_tag_id=source_tag_id,
        metadata={
            "source_code": source_code,
            "source_url": _clean_text(data.get("source_url"), max_length=700),
            "anonymous_session_id": _clean_text(data.get("anonymous_session_id"), max_length=120),
        },
    )
    record_presence_event(
        node,
        event_type,
        metadata={"source_type": source_type, "source_tag_id": source_tag_id, "source_code": source_code},
        anonymous_session_id=data.get("anonymous_session_id"),
    )
    return {"interaction": interaction, "source_tag": tag, "event_type": event_type}


def validate_quote_payload(node: PresenceNode, data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")
    if partial:
        payload = _normalize_quote({**{"title": "placeholder"}, **data})
        if "title" not in data:
            payload.pop("title", None)
        if "status" not in data:
            payload.pop("status", None)
        if "currency" not in data:
            payload.pop("currency", None)
    else:
        payload = _normalize_quote(data)
    _validate_optional_node_child_ids(node, connection_id=payload.get("connection_id"))
    return payload


def _replace_quote_line_items(quote: PresenceQuote, rows: list[dict[str, Any]]) -> None:
    for existing in list(quote.line_items):
        db.session.delete(existing)
    db.session.flush()
    for index, raw in enumerate(rows or []):
        payload = _normalize_quote_line_item(raw or {}, index)
        if payload:
            db.session.add(PresenceQuoteLineItem(quote_id=quote.id, **payload))


def create_presence_quote(node: PresenceNode, data: dict[str, Any]) -> PresenceQuote:
    quote = PresenceQuote(node_id=node.id, **validate_quote_payload(node, data, partial=False))
    db.session.add(quote)
    db.session.flush()
    if isinstance(data.get("line_items"), list):
        _replace_quote_line_items(quote, data.get("line_items") or [])
    create_presence_interaction(
        node,
        "quote_sent" if quote.status in {"sent", "viewed", "approved"} else "manual_note",
        connection_id=quote.connection_id,
        metadata={"quote_id": quote.id, "status": quote.status},
    )
    db.session.flush()
    return quote


def update_presence_quote(quote: PresenceQuote, data: dict[str, Any]) -> PresenceQuote:
    node = PresenceNode.query.get(quote.node_id)
    if not node:
        raise PresenceValidationError("Presence Node not found.")
    payload = validate_quote_payload(node, data, partial=True)
    for key, value in payload.items():
        setattr(quote, key, value)
    if isinstance(data.get("line_items"), list):
        _replace_quote_line_items(quote, data.get("line_items") or [])
    if data.get("status") == "approved":
        quote.approved_at = quote.approved_at or now_utc()
        create_presence_interaction(
            node,
            "quote_approved",
            connection_id=quote.connection_id,
            metadata={"quote_id": quote.id, "status": quote.status},
        )
    db.session.flush()
    return quote


def create_presence_variation(node: PresenceNode, data: dict[str, Any]) -> PresenceVariation:
    payload = _normalize_variation(data)
    _validate_optional_node_child_ids(node, connection_id=payload.get("connection_id"), quote_id=payload.get("quote_id"))
    item = PresenceVariation(node_id=node.id, **payload)
    db.session.add(item)
    db.session.flush()
    create_presence_interaction(
        node,
        "variation_approved" if item.status == "approved" else "variation_requested",
        connection_id=item.connection_id,
        metadata={"variation_id": item.id, "quote_id": item.quote_id, "status": item.status},
    )
    return item


def update_presence_variation(item: PresenceVariation, data: dict[str, Any]) -> PresenceVariation:
    node = PresenceNode.query.get(item.node_id)
    if not node:
        raise PresenceValidationError("Presence Node not found.")
    payload = _normalize_variation({**serialize_variation(item), **data})
    _validate_optional_node_child_ids(node, connection_id=payload.get("connection_id"), quote_id=payload.get("quote_id"))
    for key, value in payload.items():
        setattr(item, key, value)
    if data.get("status") == "approved":
        item.approved_at = item.approved_at or now_utc()
        create_presence_interaction(
            node,
            "variation_approved",
            connection_id=item.connection_id,
            metadata={"variation_id": item.id, "quote_id": item.quote_id, "status": item.status},
        )
    db.session.flush()
    return item


def create_presence_invoice_support(node: PresenceNode, data: dict[str, Any]) -> PresenceInvoiceSupport:
    payload = _normalize_invoice_support(data)
    _validate_optional_node_child_ids(node, connection_id=payload.get("connection_id"), quote_id=payload.get("quote_id"))
    item = PresenceInvoiceSupport(node_id=node.id, **payload)
    db.session.add(item)
    db.session.flush()
    create_presence_interaction(
        node,
        "invoice_link_added",
        connection_id=item.connection_id,
        metadata={"invoice_support_id": item.id, "quote_id": item.quote_id, "status": item.status},
    )
    return item


def update_presence_invoice_support(item: PresenceInvoiceSupport, data: dict[str, Any]) -> PresenceInvoiceSupport:
    node = PresenceNode.query.get(item.node_id)
    if not node:
        raise PresenceValidationError("Presence Node not found.")
    payload = _normalize_invoice_support({**serialize_invoice_support(item), **data})
    _validate_optional_node_child_ids(node, connection_id=payload.get("connection_id"), quote_id=payload.get("quote_id"))
    for key, value in payload.items():
        setattr(item, key, value)
    db.session.flush()
    return item


def create_presence_handover(node: PresenceNode, data: dict[str, Any]) -> PresenceWorkHandover:
    payload = _normalize_handover(data)
    _validate_optional_node_child_ids(node, connection_id=payload.get("connection_id"), quote_id=payload.get("quote_id"))
    item = PresenceWorkHandover(node_id=node.id, **payload)
    db.session.add(item)
    db.session.flush()
    create_presence_interaction(
        node,
        "handover_created",
        connection_id=item.connection_id,
        metadata={"handover_id": item.id, "quote_id": item.quote_id},
    )
    return item


def update_presence_handover(item: PresenceWorkHandover, data: dict[str, Any]) -> PresenceWorkHandover:
    node = PresenceNode.query.get(item.node_id)
    if not node:
        raise PresenceValidationError("Presence Node not found.")
    payload = _normalize_handover({**serialize_handover(item), **data})
    _validate_optional_node_child_ids(node, connection_id=payload.get("connection_id"), quote_id=payload.get("quote_id"))
    for key, value in payload.items():
        setattr(item, key, value)
    db.session.flush()
    return item


def publish_presence_node(node: PresenceNode) -> PresenceNode:
    node.status = "published"
    node.visibility = node.visibility or "public"
    node.published_at = now_utc()
    node.archived_at = None
    db.session.flush()
    return node


def transition_presence_node(node: PresenceNode, status: str) -> PresenceNode:
    if status not in {"unpublished", "suspended", "archived"}:
        raise PresenceValidationError("Unsupported transition.")
    node.status = status
    if status == "archived":
        node.archived_at = now_utc()
    db.session.flush()
    return node


def public_presence_node_by_slug(slug: str) -> PresenceNode | None:
    return (
        PresenceNode.query.filter(
            PresenceNode.slug == normalize_slug(slug),
            PresenceNode.status == "published",
            PresenceNode.visibility.in_(sorted(PRESENCE_PUBLIC_VISIBILITIES)),
        )
        .order_by(PresenceNode.id.asc())
        .first()
    )


def hash_request_value(value: str | None) -> str | None:
    if not value:
        return None
    pepper = current_app.config.get("SECRET_KEY") or "presence-local-pepper"
    return hashlib.sha256(f"{pepper}:{value}".encode("utf-8")).hexdigest()


def validate_enquiry_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")
    if _clean_text(data.get("website"), max_length=120):
        raise PresenceValidationError("Spam protection rejected the enquiry.")
    started_at = _int_or_none(data.get("form_started_at"))
    if started_at is not None:
        # Client sends epoch milliseconds; reject impossibly fast submissions.
        now_ms = int(now_utc().timestamp() * 1000)
        if now_ms - started_at < 1800:
            raise PresenceValidationError("Please take a moment before submitting the form.")

    name = _clean_text(data.get("name"), max_length=160)
    email = _clean_text(data.get("email"), max_length=180)
    message = _clean_text(data.get("message"), max_length=3000)
    if not name or not email or not message:
        raise PresenceValidationError("name, email, and message are required.")
    if not _EMAIL_RE.match(email):
        raise PresenceValidationError("email must be a valid email address.")
    if not bool(data.get("consent")):
        raise PresenceValidationError("Consent is required before submitting an enquiry.")
    source_url = normalize_url(data.get("source_url"), allow_relative=True) if data.get("source_url") else None
    return {
        "enquiry_type": _clean_text(data.get("enquiry_type"), max_length=80) or "general",
        "name": name,
        "email": email,
        "phone": _clean_text(data.get("phone"), max_length=80),
        "company": _clean_text(data.get("company") or data.get("organisation"), max_length=180),
        "role_title": _clean_text(data.get("role_title") or data.get("role"), max_length=160),
        "budget_range": _clean_text(data.get("budget_range"), max_length=120),
        "timeline": _clean_text(data.get("timeline"), max_length=120),
        "project_type": _clean_text(data.get("project_type") or data.get("job_type"), max_length=120),
        "urgency": _clean_text(data.get("urgency"), max_length=80),
        "decision_maker_status": _clean_text(data.get("decision_maker_status"), max_length=120),
        "message": message,
        "preferred_contact_method": _clean_text(data.get("preferred_contact_method"), max_length=40) or "email",
        "metadata_json": _json_object(data.get("metadata")),
        "source_url": source_url,
        "source_type": _clean_text(data.get("source_type"), max_length=80),
        "source_tag_id": _int_or_none(data.get("source_tag_id")),
    }


def _connection_payload_from_enquiry(payload: dict[str, Any], *, source_type: str | None, source_tag_id: int | None) -> dict[str, Any]:
    return {
        "contact_name": payload.get("name"),
        "contact_email": payload.get("email"),
        "contact_phone": payload.get("phone"),
        "organisation": payload.get("company"),
        "source_type": source_type or payload.get("source_type") or "enquiry",
        "source_tag_id": source_tag_id,
        "status": "enquired",
        "consent_status": "provided",
        "notes": _clean_text(payload.get("message"), max_length=1200),
        "last_interaction_at": now_utc(),
    }


def create_presence_interaction(
    node: PresenceNode,
    interaction_type: str,
    *,
    connection_id: int | None = None,
    source_type: str | None = None,
    source_tag_id: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> PresenceInteraction:
    if interaction_type not in PRESENCE_INTERACTION_TYPES:
        raise PresenceValidationError("Unsupported interaction type.", {"allowed": sorted(PRESENCE_INTERACTION_TYPES)})
    _validate_optional_node_child_ids(node, connection_id=connection_id, source_tag_id=source_tag_id)
    interaction = PresenceInteraction(
        node_id=node.id,
        connection_id=connection_id,
        interaction_type=interaction_type,
        source_type=_clean_text(source_type, max_length=80),
        source_tag_id=source_tag_id,
        metadata_json=_json_object(metadata),
        occurred_at=now_utc(),
    )
    db.session.add(interaction)
    if connection_id:
        connection = PresenceConnection.query.get(connection_id)
        if connection:
            connection.last_interaction_at = interaction.occurred_at
    db.session.flush()
    return interaction


def create_presence_connection(node: PresenceNode, data: dict[str, Any]) -> PresenceConnection:
    payload = _normalize_connection(data)
    _validate_optional_node_child_ids(node, source_tag_id=payload.get("source_tag_id"))
    if not any(payload.get(field) for field in ("contact_name", "contact_email", "contact_phone", "organisation")):
        raise PresenceValidationError("At least one contact detail is required for a named connection.")
    connection = PresenceConnection(node_id=node.id, **payload)
    if not connection.last_interaction_at:
        connection.last_interaction_at = now_utc()
    db.session.add(connection)
    db.session.flush()
    return connection


def update_presence_connection(connection: PresenceConnection, data: dict[str, Any]) -> PresenceConnection:
    node = PresenceNode.query.get(connection.node_id)
    if not node:
        raise PresenceValidationError("Presence Node not found.")
    payload = _normalize_connection({**serialize_connection(connection), **data})
    _validate_optional_node_child_ids(node, source_tag_id=payload.get("source_tag_id"))
    for key, value in payload.items():
        setattr(connection, key, value)
    db.session.flush()
    return connection


def _create_connection_for_submitted_details(
    node: PresenceNode,
    payload: dict[str, Any],
    *,
    source_type: str | None,
    source_tag_id: int | None,
) -> PresenceConnection:
    connection = create_presence_connection(
        node,
        _connection_payload_from_enquiry(payload, source_type=source_type, source_tag_id=source_tag_id),
    )
    return connection


def create_presence_enquiry(node: PresenceNode, data: dict[str, Any]) -> PresenceEnquiry:
    payload = validate_enquiry_payload(data)
    tag = source_tag_for_node(node, data)
    source_tag_id = tag.id if tag else payload.get("source_tag_id")
    source_type = _public_source_type(data, tag) or payload.get("source_type") or "public_enquiry"
    _validate_optional_node_child_ids(node, source_tag_id=source_tag_id)
    connection = _create_connection_for_submitted_details(node, payload, source_type=source_type, source_tag_id=source_tag_id)
    enquiry = PresenceEnquiry(
        node_id=node.id,
        tenant_id=node.tenant_id,
        organisation_id=node.organisation_id,
        connection_id=connection.id,
        ip_hash=hash_request_value(request.headers.get("X-Forwarded-For") or request.remote_addr),
        user_agent_hash=hash_request_value(request.headers.get("User-Agent")),
        status="new",
        **{**payload, "source_type": source_type, "source_tag_id": source_tag_id},
    )
    db.session.add(enquiry)
    db.session.flush()
    create_presence_interaction(
        node,
        "enquiry_submitted",
        connection_id=connection.id,
        source_type=source_type,
        source_tag_id=source_tag_id,
        metadata={"enquiry_id": enquiry.id, "enquiry_type": enquiry.enquiry_type},
    )
    record_presence_event(
        node,
        "enquiry_submitted",
        metadata={"enquiry_type": enquiry.enquiry_type, "source_type": source_type, "source_tag_id": source_tag_id},
        anonymous_session_id=data.get("anonymous_session_id"),
    )
    return enquiry


def validate_quote_request_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise PresenceValidationError("JSON object payload is required.")
    if _clean_text(data.get("website"), max_length=120):
        raise PresenceValidationError("Spam protection rejected the quote request.")
    started_at = _int_or_none(data.get("form_started_at"))
    if started_at is not None:
        now_ms = int(now_utc().timestamp() * 1000)
        if now_ms - started_at < 1800:
            raise PresenceValidationError("Please take a moment before submitting the form.")

    name = _clean_text(data.get("name"), max_length=160)
    email = _clean_text(data.get("email"), max_length=180)
    description = _clean_text(data.get("description") or data.get("message"), max_length=4000)
    if not name or not email or not description:
        raise PresenceValidationError("name, email, and description are required.")
    if not _EMAIL_RE.match(email):
        raise PresenceValidationError("email must be a valid email address.")
    if not bool(data.get("consent")):
        raise PresenceValidationError("Consent is required before submitting a quote request.")
    metadata = _json_object(data.get("metadata"))
    for key in ("job_type", "address_suburb", "preferred_date", "access_notes", "photo_urls"):
        if key in data:
            metadata[key] = _json_list(data.get(key)) if key == "photo_urls" else _clean_text(data.get(key), max_length=500)
    return {
        "enquiry_type": "quote_request",
        "name": name,
        "email": email,
        "phone": _clean_text(data.get("phone"), max_length=80),
        "company": _clean_text(data.get("company") or data.get("organisation"), max_length=180),
        "budget_range": _clean_text(data.get("budget_range"), max_length=120),
        "timeline": _clean_text(data.get("timeline") or data.get("preferred_date"), max_length=120),
        "project_type": _clean_text(data.get("project_type") or data.get("job_type"), max_length=120),
        "urgency": _clean_text(data.get("urgency"), max_length=80),
        "message": description,
        "preferred_contact_method": _clean_text(data.get("preferred_contact_method"), max_length=40) or "email",
        "metadata_json": metadata,
        "source_url": normalize_url(data.get("source_url"), allow_relative=True) if data.get("source_url") else None,
    }


def create_presence_quote_request(node: PresenceNode, data: dict[str, Any]) -> dict[str, Any]:
    payload = validate_quote_request_payload(data)
    tag = source_tag_for_node(node, data)
    source_tag_id = tag.id if tag else _int_or_none(data.get("source_tag_id"))
    source_type = _public_source_type(data, tag) or "quote_request"
    _validate_optional_node_child_ids(node, source_tag_id=source_tag_id)
    connection = _create_connection_for_submitted_details(node, payload, source_type=source_type, source_tag_id=source_tag_id)
    connection.status = "enquired"

    enquiry = PresenceEnquiry(
        node_id=node.id,
        tenant_id=node.tenant_id,
        organisation_id=node.organisation_id,
        connection_id=connection.id,
        source_type=source_type,
        source_tag_id=source_tag_id,
        ip_hash=hash_request_value(request.headers.get("X-Forwarded-For") or request.remote_addr),
        user_agent_hash=hash_request_value(request.headers.get("User-Agent")),
        status="new",
        **payload,
    )
    db.session.add(enquiry)
    db.session.flush()

    quote = PresenceQuote(
        node_id=node.id,
        connection_id=connection.id,
        title=f"Quote request from {payload['name']}",
        status="draft",
        description=payload["message"],
        currency="AUD",
        terms="Alpha quote-request placeholder. Final quote terms are managed by the node owner.",
    )
    db.session.add(quote)
    db.session.flush()

    create_presence_interaction(
        node,
        "quote_requested",
        connection_id=connection.id,
        source_type=source_type,
        source_tag_id=source_tag_id,
        metadata={"enquiry_id": enquiry.id, "quote_id": quote.id, "project_type": payload.get("project_type")},
    )
    record_presence_event(
        node,
        "quote_requested",
        metadata={"source_type": source_type, "source_tag_id": source_tag_id, "project_type": payload.get("project_type")},
        anonymous_session_id=data.get("anonymous_session_id"),
    )
    return {"enquiry": enquiry, "connection": connection, "quote": quote}


def record_presence_event(
    node: PresenceNode,
    event_type: str,
    *,
    metadata: dict[str, Any] | None = None,
    anonymous_session_id: str | None = None,
) -> PresenceAnalyticsEvent | None:
    if event_type not in PRESENCE_ANALYTICS_EVENTS:
        return None
    event = PresenceAnalyticsEvent(
        node_id=node.id,
        event_type=event_type,
        metadata_json=_json_object(metadata),
        anonymous_session_id=_clean_text(anonymous_session_id, max_length=120),
    )
    db.session.add(event)
    db.session.flush()
    return event


def update_enquiry_status(enquiry: PresenceEnquiry, data: dict[str, Any]) -> PresenceEnquiry:
    status = str(data.get("status") or "").strip()
    if status and status not in PRESENCE_ENQUIRY_STATUSES:
        raise PresenceValidationError("Unsupported enquiry status.", {"allowed": sorted(PRESENCE_ENQUIRY_STATUSES)})
    if status:
        enquiry.status = status
    if "assigned_to_user_id" in data:
        enquiry.assigned_to_user_id = _int_or_none(data.get("assigned_to_user_id"))
    db.session.flush()
    return enquiry


def analytics_summary(node: PresenceNode) -> dict[str, Any]:
    since_7 = now_utc() - timedelta(days=7)
    since_30 = now_utc() - timedelta(days=30)
    total_views = PresenceAnalyticsEvent.query.filter_by(node_id=node.id, event_type="node_viewed").count()
    total_enquiries = PresenceEnquiry.query.filter(PresenceEnquiry.node_id == node.id, PresenceEnquiry.status != "deleted").count()
    total_quote_requests = PresenceAnalyticsEvent.query.filter_by(node_id=node.id, event_type="quote_requested").count()
    last_7_days = (
        PresenceAnalyticsEvent.query.filter(PresenceAnalyticsEvent.node_id == node.id, PresenceAnalyticsEvent.created_at >= since_7)
        .with_entities(PresenceAnalyticsEvent.event_type, func.count(PresenceAnalyticsEvent.id))
        .group_by(PresenceAnalyticsEvent.event_type)
        .all()
    )
    last_30_days = (
        PresenceAnalyticsEvent.query.filter(PresenceAnalyticsEvent.node_id == node.id, PresenceAnalyticsEvent.created_at >= since_30)
        .with_entities(PresenceAnalyticsEvent.event_type, func.count(PresenceAnalyticsEvent.id))
        .group_by(PresenceAnalyticsEvent.event_type)
        .all()
    )
    top_links = (
        PresenceAnalyticsEvent.query.filter_by(node_id=node.id, event_type="link_clicked")
        .with_entities(PresenceAnalyticsEvent.metadata_json, func.count(PresenceAnalyticsEvent.id).label("count"))
        .group_by(PresenceAnalyticsEvent.metadata_json)
        .order_by(func.count(PresenceAnalyticsEvent.id).desc())
        .limit(5)
        .all()
    )
    top_sources = (
        PresenceAnalyticsEvent.query.filter(PresenceAnalyticsEvent.node_id == node.id, PresenceAnalyticsEvent.event_type.in_(["nfc_scanned", "qr_scanned"]))
        .with_entities(PresenceAnalyticsEvent.metadata_json, func.count(PresenceAnalyticsEvent.id).label("count"))
        .group_by(PresenceAnalyticsEvent.metadata_json)
        .order_by(func.count(PresenceAnalyticsEvent.id).desc())
        .limit(5)
        .all()
    )
    recent = (
        PresenceAnalyticsEvent.query.filter_by(node_id=node.id)
        .order_by(PresenceAnalyticsEvent.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "total_views": total_views,
        "total_enquiries": total_enquiries,
        "quote_requests": total_quote_requests,
        "conversion_rate": round((total_enquiries / total_views) * 100, 2) if total_views else 0,
        "last_7_days": {event_type: count for event_type, count in last_7_days},
        "last_30_days": {event_type: count for event_type, count in last_30_days},
        "top_links": [
            {
                "label": (metadata or {}).get("label"),
                "url": (metadata or {}).get("url"),
                "count": count,
            }
            for metadata, count in top_links
        ],
        "top_sources": [
            {
                "source_type": (metadata or {}).get("source_type"),
                "source_code": (metadata or {}).get("source_code"),
                "source_tag_id": (metadata or {}).get("source_tag_id"),
                "count": count,
            }
            for metadata, count in top_sources
        ],
        "recent_events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "metadata": event.metadata_json or {},
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in recent
        ],
    }


def presence_vcard(node: PresenceNode, *, host_url: str | None = None) -> str:
    links = [item for item in sorted(node.links, key=lambda row: (row.sort_order or 0, row.id or 0)) if item.is_visible]
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{_vcard_escape(node.display_name)}",
        f"TITLE:{_vcard_escape(node.headline or '')}",
    ]
    org = _node_org_payload(node)
    if org:
        lines.append(f"ORG:{_vcard_escape(org['name'])}")
    if node.public_email:
        lines.append(f"EMAIL;TYPE=INTERNET:{_vcard_escape(node.public_email)}")
    if node.public_phone:
        lines.append(f"TEL:{_vcard_escape(node.public_phone)}")
    lines.append(f"URL:{public_url_for_node(node, host_url=host_url)}")
    for link in links[:4]:
        lines.append(f"URL:{_vcard_escape(link.url)}")
    if node.location_label:
        lines.append(f"ADR;TYPE=WORK:;;{_vcard_escape(node.location_label)};;;;")
    lines.append("END:VCARD")
    return "\r\n".join(lines) + "\r\n"


def _vcard_escape(value: str | None) -> str:
    return str(value or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _pseudo_qr_svg_fallback(node: PresenceNode, *, size: int = 29, host_url: str | None = None) -> str:
    """Hash-derived SVG used only when the qrcode library is unavailable. NOT scanner-grade."""
    url = public_url_for_node(node, host_url=host_url)
    digest = hashlib.sha256(url.encode("utf-8")).digest()
    cells: list[str] = []
    scale = 8
    margin = 3
    total = (size + margin * 2) * scale

    def is_finder(x: int, y: int) -> bool:
        for ox, oy in ((0, 0), (size - 7, 0), (0, size - 7)):
            if ox <= x < ox + 7 and oy <= y < oy + 7:
                edge = x in {ox, ox + 6} or y in {oy, oy + 6}
                center = ox + 2 <= x <= ox + 4 and oy + 2 <= y <= oy + 4
                return edge or center
        return False

    for y in range(size):
        for x in range(size):
            bit = digest[(x * 7 + y * 11) % len(digest)] >> ((x + y) % 8) & 1
            if is_finder(x, y) or (bit and (x + y) % 3 != 0):
                cells.append(
                    f'<rect x="{(x + margin) * scale}" y="{(y + margin) * scale}" width="{scale}" height="{scale}" rx="1" />'
                )
    title = bleach.clean(url, tags=[], strip=True)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total}" height="{total}" viewBox="0 0 {total} {total}" role="img">'
        f"<title>{title}</title>"
        f'<rect width="{total}" height="{total}" fill="#fff8ef" rx="12" />'
        f'<g fill="#1e0227">{"".join(cells)}</g>'
        "</svg>"
    )


def presence_qr_svg(node: PresenceNode, *, host_url: str | None = None) -> str:
    """Generate a scanner-grade SVG QR code for a Presence Node's public URL.

    Uses the qrcode library when available. Falls back to a hash-derived placeholder
    SVG (with a logged warning) if qrcode is not installed, so dev environments
    without the dependency still serve a response.
    """
    url = public_url_for_node(node, host_url=host_url)
    title_text = bleach.clean(url, tags=[], strip=True)
    try:
        import qrcode
        import qrcode.image.svg as qrcode_svg
        from io import BytesIO
    except ImportError:  # pragma: no cover - dev fallback path
        try:
            current_app.logger.warning("qrcode library not installed; using non-scanner-grade fallback QR for %s", url)
        except Exception:
            pass
        return _pseudo_qr_svg_fallback(node, host_url=host_url)

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(image_factory=qrcode_svg.SvgPathImage)
    buf = BytesIO()
    img.save(buf)
    raw = buf.getvalue().decode("utf-8")
    # Strip XML declaration and inject a <title> for accessibility.
    if raw.startswith("<?xml"):
        idx = raw.find("?>")
        if idx >= 0:
            raw = raw[idx + 2 :].lstrip()
    if "<svg" in raw and "<title>" not in raw:
        raw = raw.replace("<svg", '<svg role="img"', 1)
        raw = raw.replace(">", f"><title>{title_text}</title>", 1)
    return raw


# Backwards-compatible alias for callers that still import the original name.
pseudo_qr_svg = presence_qr_svg


def seed_presence_templates() -> list[PresenceTemplate]:
    rows = [
        {
            "name": "Showcase Profile",
            "description": "Starter showcase profile with polished identity, links, contact, QR, vCard, and SEO.",
            "node_type": "custom",
            "display_mode": "profile_card",
            "is_premium": False,
            "supports_landing_portal": False,
            "supports_collections": False,
            "supports_business_functions": False,
            "supports_tradie_functions": False,
            "supports_professional_contract": False,
            "visual_mood": "showcase-editorial",
            "sections": ["header", "bio", "links", "contact", "share"],
        },
        {
            "name": "Presence Opportunity Kit",
            "description": "First paid-tier profile with services, one opportunity module, analytics, and network readiness flags.",
            "node_type": "consultant",
            "display_mode": "opportunity_profile",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "supports_tradie_functions": False,
            "supports_professional_contract": False,
            "visual_mood": "opportunity-polished",
            "sections": ["header", "bio", "offers", "proof", "enquiry", "readiness"],
        },
        {
            "name": "Professional Contract Presence",
            "description": "Procurement-ready consultant profile with capability statement, proof ledger, offers, and deal-intake foundation.",
            "node_type": "consultant",
            "display_mode": "professional_contract",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "supports_tradie_functions": False,
            "supports_professional_contract": True,
            "visual_mood": "contract-credible",
            "sections": ["capability", "industries", "offers", "case_studies", "procurement", "deal_intake"],
        },
        {
            "name": "Consultant / Fractional Executive Presence",
            "description": "Executive advisory presence for capability, offers, case studies, proof, and referral readiness.",
            "node_type": "fractional_executive",
            "display_mode": "professional_contract",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "supports_tradie_functions": False,
            "supports_professional_contract": True,
            "visual_mood": "executive-quiet",
            "sections": ["header", "capability", "offer_cards", "proof_ledger", "procurement", "enquiry"],
        },
        {
            "name": "Basic Profile Card",
            "description": "A polished digital card with links, enquiry, QR, vCard, and basic SEO.",
            "node_type": "custom",
            "display_mode": "profile_card",
            "is_premium": False,
            "supports_landing_portal": False,
            "supports_collections": False,
            "supports_business_functions": False,
            "visual_mood": "warm-minimal",
            "sections": ["header", "bio", "links", "enquiry", "share"],
        },
        {
            "name": "Premium Practitioner Profile",
            "description": "A warm practitioner profile with services, availability, statements, analytics, and richer enquiries.",
            "node_type": "practitioner",
            "display_mode": "practitioner_profile",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": False,
            "supports_business_functions": True,
            "visual_mood": "grounded-care",
            "sections": ["header", "bio", "availability", "services", "credentials", "enquiry"],
        },
        {
            "name": "Minimal Artist Portal",
            "description": "An atmospheric entry screen that opens into artist/gallery content.",
            "node_type": "artist",
            "display_mode": "minimal_portal",
            "is_premium": True,
            "supports_landing_portal": True,
            "supports_collections": True,
            "supports_business_functions": False,
            "visual_mood": "quiet-portal",
            "sections": ["landing", "statement", "selected_works", "contact"],
        },
        {
            "name": "Gallery-First Artist Presence",
            "description": "A boutique gallery microsite with practice statement, curatorial statement, works, and collections.",
            "node_type": "artist",
            "display_mode": "artist_gallery",
            "is_premium": True,
            "supports_landing_portal": True,
            "supports_collections": True,
            "supports_business_functions": False,
            "visual_mood": "gallery-editorial",
            "sections": ["hero", "practice_statement", "collections", "selected_works", "curatorial_statement", "enquiry"],
        },
        {
            "name": "Creative Portfolio Presence",
            "description": "A visual portfolio page for makers, studios, and creative collaborators.",
            "node_type": "creative",
            "display_mode": "premium_profile",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "visual_mood": "studio-polished",
            "sections": ["header", "portfolio", "works", "services", "links", "enquiry"],
        },
        {
            "name": "Tradie / Field Service Presence",
            "description": "Trust-forward trade profile with services, quote requests, proof gallery, NFC tracking, and handover foundations.",
            "node_type": "tradie",
            "display_mode": "tradie_profile",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "supports_tradie_functions": True,
            "supports_professional_contract": False,
            "visual_mood": "field-service-trust",
            "sections": ["header", "licences", "services", "before_after", "quote_request", "proof", "handover"],
        },
        {
            "name": "Organisation / Cultural Centre Profile",
            "description": "A trust-forward organisation presence with mission, programs, gallery, and enquiry routing readiness.",
            "node_type": "organisation",
            "display_mode": "organisation_profile",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "visual_mood": "cultural-institution",
            "sections": ["mission", "about", "programs", "team", "gallery", "enquiry"],
        },
        {
            "name": "Venue / Place Profile",
            "description": "A place profile for venues, studios, and community rooms with hire enquiry readiness.",
            "node_type": "venue",
            "display_mode": "venue_profile",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "visual_mood": "place-led",
            "sections": ["hero", "location", "accessibility", "gallery", "hire_enquiry"],
        },
        {
            "name": "Mudyin Practitioner/Affiliate",
            "description": "A Mudyin-ready practitioner affiliate template with cultural care and enquiry affordances.",
            "node_type": "practitioner",
            "display_mode": "practitioner_profile",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": False,
            "supports_business_functions": True,
            "visual_mood": "mudyin-care",
            "sections": ["header", "practice", "services", "availability", "affiliation", "enquiry"],
        },
        {
            "name": "Portfolio Presence Kit",
            "description": "A premium creative portfolio with works, collections, practice statement, and enquiry — the flagship portfolio launch template.",
            "node_type": "creative",
            "display_mode": "portfolio_presence_kit",
            "is_premium": True,
            "supports_landing_portal": True,
            "supports_collections": True,
            "supports_business_functions": True,
            "supports_tradie_functions": False,
            "supports_professional_contract": False,
            "visual_mood": "portfolio-editorial",
            "sections": ["header", "practice_statement", "collections", "selected_works", "services", "enquiry", "share"],
        },
        {
            "name": "Signature Artist / Creative Presence",
            "description": "A cinematic, warm artist presence built around identity, story, selected works, and contact — for artists who want presence over catalogue.",
            "node_type": "artist",
            "display_mode": "signature_artist",
            "is_premium": True,
            "supports_landing_portal": True,
            "supports_collections": True,
            "supports_business_functions": False,
            "supports_tradie_functions": False,
            "supports_professional_contract": False,
            "visual_mood": "signature-warm",
            "sections": ["landing", "practice_statement", "selected_works", "curatorial_statement", "enquiry"],
        },
        {
            "name": "Editorial Portfolio",
            "description": "A clean, text-forward editorial portfolio for photographers, writers, designers, and visual storytellers.",
            "node_type": "creative",
            "display_mode": "editorial_portfolio",
            "is_premium": True,
            "supports_landing_portal": False,
            "supports_collections": True,
            "supports_business_functions": True,
            "supports_tradie_functions": False,
            "supports_professional_contract": False,
            "visual_mood": "editorial-quiet",
            "sections": ["header", "statement", "portfolio", "collections", "services", "enquiry"],
        },
        {
            "name": "Studio Practice",
            "description": "A studio-first portfolio presence for painters, sculptors, and multidisciplinary artists with deep practice and exhibition history.",
            "node_type": "artist",
            "display_mode": "studio_practice",
            "is_premium": True,
            "supports_landing_portal": True,
            "supports_collections": True,
            "supports_business_functions": False,
            "supports_tradie_functions": False,
            "supports_professional_contract": False,
            "visual_mood": "studio-practice",
            "sections": ["hero", "practice_statement", "curatorial_statement", "collections", "selected_works", "exhibition_history", "enquiry"],
        },
    ]
    templates: list[PresenceTemplate] = []
    for row in rows:
        template = PresenceTemplate.query.filter_by(name=row["name"]).first()
        if not template:
            template = PresenceTemplate(
                is_active=True,
            )
            db.session.add(template)
        template.name = row["name"]
        template.description = row["description"]
        template.node_type = row["node_type"]
        template.display_mode = row["display_mode"]
        template.is_premium = row["is_premium"]
        template.supports_landing_portal = row["supports_landing_portal"]
        template.supports_collections = row["supports_collections"]
        template.supports_business_functions = row["supports_business_functions"]
        template.supports_tradie_functions = row.get("supports_tradie_functions", False)
        template.supports_professional_contract = row.get("supports_professional_contract", False)
        template.theme_schema = {
            "accent": "#e0b115",
            "surface": "boutique",
            "visual_mood": row["visual_mood"],
            "typography": {"heading": "serif-editorial", "body": "system"},
        }
        template.layout_schema = {"sections": row["sections"], "display_mode": row["display_mode"]}
        template.section_schema = {
            "supports": row["sections"],
            "landing_portal": row["supports_landing_portal"],
            "collections": row["supports_collections"],
            "business_functions": row["supports_business_functions"],
            "tradie_functions": row.get("supports_tradie_functions", False),
            "professional_contract": row.get("supports_professional_contract", False),
        }
        templates.append(template)
    db.session.flush()
    return templates


def seed_presence_demo_data() -> dict[str, Any]:
    templates = {template.name: template for template in seed_presence_templates()}
    tenant = Node.query.filter_by(slug="mudyin").first()
    if not tenant:
        tenant = Node(slug="mudyin", name="Mudyin Healing Centre", status="active")
        db.session.add(tenant)
        db.session.flush()

    owner = User.query.filter_by(username="presence-demo-owner").first()
    if not owner:
        owner = User(
            username="presence-demo-owner",
            email="presence-demo-owner@example.com",
            pseudonym="Presence Demo Owner",
            password="hash",
            role="node_admin",
            node_id=tenant.id,
            points=0,
            level=1,
            points_to_level_up=100,
        )
        db.session.add(owner)
        db.session.flush()

    demo_nodes = [
        {
            "slug": "showcase-profile-demo",
            "display_name": "Ari Vale",
            "headline": "Studio profile for introductions, links, and enquiries",
            "node_type": "custom",
            "display_mode": "profile_card",
            "plan_type": "showcase",
            "template_id": templates["Showcase Profile"].id,
            "location_label": "Sydney",
            "service_area": "Online introductions",
            "directory_ready": True,
        },
        {
            "slug": "opportunity-kit-demo",
            "display_name": "Northline Studio",
            "headline": "Opportunity kit for partnerships, services, and referrals",
            "node_type": "consultant",
            "display_mode": "opportunity_profile",
            "plan_type": "opportunity_kit",
            "template_id": templates["Presence Opportunity Kit"].id,
            "location_label": "Australia",
            "service_area": "Remote projects and partnership calls",
            "business_functions_enabled": True,
            "directory_ready": True,
            "map_ready": True,
            "proof_summary": "Built to show legitimacy quickly: offer, proof, next step, and contact flow.",
            "proof_items": [
                {
                    "title": "Pilot partner launch",
                    "client_label": "Community program",
                    "industry": "Civic technology",
                    "challenge": "Turn a scattered offer into a credible public opportunity.",
                    "approach": "Clarified the offer, proof points, and direct enquiry path.",
                    "outcome": "Partner conversations became easier to route and qualify.",
                    "metrics": {"qualified_enquiries": 7},
                }
            ],
        },
        {
            "slug": "professional-contract-demo",
            "display_name": "Elian Ward",
            "headline": "Fractional operations advisor for service businesses",
            "node_type": "advisor",
            "display_mode": "professional_contract",
            "plan_type": "professional_contract",
            "template_id": templates["Professional Contract Presence"].id,
            "location_label": "Melbourne / remote",
            "service_area": "Australia and New Zealand",
            "business_functions_enabled": True,
            "directory_ready": True,
            "archive_ready": True,
            "capability_statement": "Elian helps growing service teams install clean operating rhythms, procurement-friendly delivery plans, and decision visibility.",
            "proof_summary": "Experience across founder-led teams, public-interest vendors, and professional services.",
            "procurement_summary": "Available for advisory retainers, implementation sprints, and board-ready operating reviews.",
            "procurement_profile": {
                "business_name": "Elian Ward Advisory",
                "abn_acn_or_registration": "00 000 000 000",
                "regions_served": ["Australia", "New Zealand", "Remote"],
                "contract_types": ["Retainer", "Sprint", "Advisory"],
                "rate_label": "Retainers from $4,500/month",
                "insurance_status": "Professional indemnity held",
                "nda_ready": True,
                "procurement_contact_email": "hello@example.org",
                "payment_terms_label": "14 days",
            },
            "proof_items": [
                {
                    "title": "Operating model reset",
                    "client_label": "Senior services firm",
                    "industry": "Professional services",
                    "challenge": "Unclear delivery ownership and weak executive visibility.",
                    "approach": "Installed a lightweight rhythm for commitments, escalation, and weekly evidence.",
                    "outcome": "Fewer stalled decisions and clearer handovers.",
                    "metrics": {"cycle_time_reduction": "22%"},
                }
            ],
        },
        {
            "slug": "fractional-exec-demo",
            "display_name": "Mara Chen",
            "headline": "Fractional COO for cultural and creative infrastructure",
            "node_type": "fractional_executive",
            "display_mode": "professional_contract",
            "plan_type": "professional_contract",
            "template_id": templates["Consultant / Fractional Executive Presence"].id,
            "location_label": "Sydney / remote",
            "service_area": "Institutions, studios, and civic ventures",
            "capability_statement": "Mara translates ambitious cultural work into operating systems, grant-ready delivery plans, and accountable partnerships.",
            "procurement_summary": "Prepared for retained advisory, governance review, and implementation support.",
            "business_functions_enabled": True,
            "directory_ready": True,
        },
        {
            "slug": "harbour-electrical",
            "display_name": "Harbour Electrical",
            "headline": "Licensed electrician for homes, studios, and small venues",
            "node_type": "tradie",
            "display_mode": "tradie_profile",
            "plan_type": "tradie_field_service",
            "template_id": templates["Tradie / Field Service Presence"].id,
            "location_label": "Inner West Sydney",
            "service_area": "Marrickville, Newtown, Leichhardt, and nearby suburbs",
            "business_functions_enabled": True,
            "directory_ready": True,
            "map_ready": True,
            "capability_statement": "Residential and small commercial electrical work with clear quoting, site notes, and handover records.",
            "proof_summary": "Before/after records, licence fields, proof-of-work handover, and review loop ready for pilot jobs.",
            "procurement_summary": "Invoice links and external accounting references are stored as support records only in alpha.",
            "credentials": [
                {
                    "title": "Electrical contractor licence",
                    "issuer": "NSW Fair Trading",
                    "credential_type": "licence",
                    "verification_url": "https://example.org/licence",
                },
                {
                    "title": "Public liability insurance",
                    "issuer": "Placeholder insurer",
                    "credential_type": "insurance",
                    "is_public": True,
                },
            ],
            "proof_items": [
                {
                    "title": "Studio lighting handover",
                    "client_label": "Creative studio",
                    "industry": "Creative workspace",
                    "challenge": "Replace unsafe temporary lighting with tidy, compliant fittings.",
                    "approach": "Documented before state, installed new fittings, and handed over usage notes.",
                    "outcome": "Safer workspace with clear proof of completed work.",
                }
            ],
            "services": [
                {
                    "title": "Small electrical repairs",
                    "description": "Fault finding, fittings, switches, power points, and safe minor upgrades.",
                    "problem_solved": "Gets small electrical issues handled without turning the job into a major project.",
                    "price_label": "Quote on request",
                    "duration_label": "1-3 hours typical",
                    "enquiry_type": "quote_request",
                },
                {
                    "title": "Studio and venue check",
                    "description": "Walkthrough for small venues, studios, and community rooms preparing for events.",
                    "price_label": "From $220",
                    "enquiry_type": "venue_check",
                },
            ],
            "nfc_tags_seed": [
                {"label": "NFC business card", "tag_type": "business_card", "source_code": "nfc-card"},
                {"label": "Van sticker", "tag_type": "van_sticker", "source_code": "van-sticker"},
            ],
        },
        {
            "slug": "mudyin-healing-centre",
            "display_name": "Mudyin Healing Centre",
            "headline": "Community-led healing, learning, and cultural care",
            "node_type": "organisation",
            "display_mode": "organisation_profile",
            "plan_type": "organisation_venue",
            "template_id": templates["Organisation / Cultural Centre Profile"].id,
            "location_label": "Western Sydney",
            "service_area": "Sydney and online",
            "business_functions_enabled": True,
            "directory_ready": True,
            "map_ready": True,
            "archive_ready": True,
            "white_label_ready": True,
            "practice_statement": "Mudyin Healing Centre hosts practitioners, learning circles, and community-led care programs.",
        },
        {
            "slug": "mina-river-practitioner",
            "display_name": "Mina River",
            "headline": "Trauma-informed bodywork and reflective practice",
            "node_type": "practitioner",
            "display_mode": "practitioner_profile",
            "plan_type": "premium",
            "template_id": templates["Mudyin Practitioner/Affiliate"].id,
            "location_label": "Parramatta and online",
            "service_area": "In-person sessions and telehealth",
            "practice_statement": "Mina works slowly, with consent and grounding, supporting clients to notice what the body can safely release.",
            "directory_ready": True,
            "map_ready": True,
        },
        {
            "slug": "kira-stone-creative",
            "display_name": "Kira Stone Studio",
            "headline": "Illustration, public art, and community storytelling",
            "node_type": "artist",
            "display_mode": "artist_gallery",
            "plan_type": "artist_presence",
            "template_id": templates["Gallery-First Artist Presence"].id,
            "location_label": "Sydney",
            "service_area": "Murals, workshops, commissions",
            "landing_enabled": True,
            "landing_title": "Kira Stone Studio",
            "landing_subtitle": "Public art, memory work, and community image-making.",
            "landing_background_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
            "landing_enter_label": "Enter studio",
            "practice_statement": "Kira's practice uses colour, place, and gathered stories to make public surfaces feel held by the communities around them.",
            "curatorial_statement": "Selected works trace a movement from intimate sketchbooks to large collaborative wall pieces.",
            "archive_ready": True,
            "marketplace_ready": True,
            "collections": [
                {
                    "title": "Public Walls",
                    "description": "Murals and participatory street-facing works.",
                    "cover_image_url": "https://images.unsplash.com/photo-1518005020951-eccb494ad742",
                },
                {
                    "title": "Works on Paper",
                    "description": "Studies, editions, and intimate image fragments.",
                    "cover_image_url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f",
                },
            ],
            "works": [
                {
                    "title": "River Memory Wall",
                    "year": "2025",
                    "medium": "Acrylic and community story fragments",
                    "dimensions": "18m wall",
                    "description": "A public wall built through workshops with local families.",
                    "image_url": "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
                    "availability_status": "commissioned",
                },
                {
                    "title": "Small Fires Study",
                    "year": "2026",
                    "medium": "Gouache on cotton rag",
                    "dimensions": "42 x 59 cm",
                    "description": "A preparatory work from a larger series on gathering and protection.",
                    "image_url": "https://images.unsplash.com/photo-1547891654-e66ed7ebb968",
                    "availability_status": "available",
                    "price_label": "POA",
                },
            ],
        },
        {
            "slug": "lena-moss-portal",
            "display_name": "Lena Moss",
            "headline": "Atmospheric works on paper and installation",
            "node_type": "artist",
            "display_mode": "minimal_portal",
            "plan_type": "artist_presence",
            "template_id": templates["Minimal Artist Portal"].id,
            "location_label": "Blue Mountains",
            "service_area": "Exhibitions, commissions, studio visits",
            "landing_enabled": True,
            "landing_title": "Lena Moss",
            "landing_subtitle": "Quiet works for thresholds, weather, and memory.",
            "landing_background_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
            "landing_enter_label": "Enter",
            "practice_statement": "Lena builds sparse visual fields from weather notes, field recordings, and repeated marks.",
            "curatorial_statement": "The alpha portal presents a small selection of works suitable for invitation-only review.",
            "archive_ready": True,
            "collections": [{"title": "Threshold Studies", "description": "Works made around doors, windows, and held light."}],
            "works": [
                {
                    "title": "Threshold Study 1",
                    "year": "2026",
                    "medium": "Ink, graphite, and pigment",
                    "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5",
                    "availability_status": "available",
                }
            ],
        },
        {
            "slug": "waratah-room",
            "display_name": "Waratah Room",
            "headline": "A small venue for workshops, circles, and quiet gatherings",
            "node_type": "venue",
            "display_mode": "venue_profile",
            "plan_type": "organisation_venue",
            "template_id": templates["Venue / Place Profile"].id,
            "location_label": "Inner West Sydney",
            "service_area": "Half-day and evening hire",
            "business_functions_enabled": True,
            "directory_ready": True,
            "map_ready": True,
        },
        {
            "slug": "sami-vale-consulting",
            "display_name": "Sami Vale",
            "headline": "Founder advisor for civic platforms and ethical growth",
            "node_type": "consultant",
            "display_mode": "premium_profile",
            "plan_type": "premium",
            "template_id": templates["Creative Portfolio Presence"].id,
            "location_label": "Australia",
            "service_area": "Remote advisory and strategy sprints",
            "business_functions_enabled": True,
            "directory_ready": True,
        },
        # --- Portfolio-first launch demo nodes ---
        {
            "slug": "mira-cole-portfolio-kit",
            "display_name": "Mira Cole",
            "headline": "Textile artist working with country, dye, and weave",
            "node_type": "creative",
            "display_mode": "portfolio_presence_kit",
            "plan_type": "premium",
            "template_id": templates["Portfolio Presence Kit"].id,
            "location_label": "Castlemaine, Australia",
            "service_area": "Studio practice, commissions, exhibitions",
            "practice_statement": "Mira works with hand-dyed cotton and wool, gathering colour from native plants and household scraps. Each piece carries the rhythm of the season it was made in.",
            "curatorial_statement": "The Portfolio Kit collects two years of small studies and three larger commissions, organised by the dye process that began them.",
            "directory_ready": True,
            "archive_ready": True,
            "marketplace_ready": True,
            "collections": [
                {
                    "title": "Plant Dye Studies",
                    "description": "Small woven samples organised by season and source plant.",
                    "cover_image_url": "https://images.unsplash.com/photo-1547891654-e66ed7ebb968",
                },
                {
                    "title": "Commission Archive",
                    "description": "Larger commissioned pieces installed in private and public settings.",
                    "cover_image_url": "https://images.unsplash.com/photo-1518005020951-eccb494ad742",
                },
            ],
            "works": [
                {
                    "title": "Eucalypt Series IV",
                    "year": "2026",
                    "medium": "Hand-dyed cotton and linen, woven panel",
                    "dimensions": "120 x 90 cm",
                    "description": "A woven panel using dye drawn from local eucalypt bark over a season of slow gathering.",
                    "image_url": "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
                    "availability_status": "available",
                    "price_label": "On request",
                },
                {
                    "title": "Field Notes (small study)",
                    "year": "2025",
                    "medium": "Cotton, wool, marigold dye",
                    "dimensions": "28 x 22 cm",
                    "description": "A study piece exploring how dye carries across two fibres.",
                    "image_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
                    "availability_status": "sold",
                },
            ],
        },
        {
            "slug": "noor-okafor-signature-artist",
            "display_name": "Noor Okafor",
            "headline": "Painter and visual storyteller",
            "node_type": "artist",
            "display_mode": "signature_artist",
            "plan_type": "artist_presence",
            "template_id": templates["Signature Artist / Creative Presence"].id,
            "location_label": "Naarm / Melbourne",
            "service_area": "Studio commissions and selected exhibitions",
            "landing_enabled": True,
            "landing_title": "Noor Okafor",
            "landing_subtitle": "Painting at the edges of memory and family.",
            "landing_background_url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f",
            "landing_enter_label": "Enter",
            "practice_statement": "Noor paints the half-light around inherited stories — kitchens, doorways, the shapes a family makes in their own house. Oil on linen, often layered slowly across months.",
            "curatorial_statement": "The signature presence offers a curated selection of works for review by collectors, curators, and invited guests.",
            "archive_ready": True,
            "collections": [
                {
                    "title": "House Light",
                    "description": "Selected paintings from the 2024–2026 House Light cycle.",
                    "cover_image_url": "https://images.unsplash.com/photo-1547891654-e66ed7ebb968",
                },
            ],
            "works": [
                {
                    "title": "Mother in Doorway",
                    "year": "2025",
                    "medium": "Oil on linen",
                    "dimensions": "150 x 110 cm",
                    "description": "From the House Light cycle. A painting about waiting and being seen.",
                    "image_url": "https://images.unsplash.com/photo-1518005020951-eccb494ad742",
                    "availability_status": "exhibition",
                    "price_label": "POA",
                },
                {
                    "title": "Kitchen at 6pm",
                    "year": "2026",
                    "medium": "Oil on linen",
                    "dimensions": "80 x 60 cm",
                    "description": "An interior study at the hour when the house holds the most quiet.",
                    "image_url": "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
                    "availability_status": "available",
                    "price_label": "POA",
                },
            ],
        },
        {
            "slug": "editorial-yorke-collier",
            "display_name": "Yorke Collier",
            "headline": "Documentary photographer and writer",
            "node_type": "creative",
            "display_mode": "editorial_portfolio",
            "plan_type": "premium",
            "template_id": templates["Editorial Portfolio"].id,
            "location_label": "London / Sydney",
            "service_area": "Editorial commissions and longform projects",
            "practice_statement": "Yorke photographs and writes about labour, place, and the rituals that hold ordinary work together. Recent commissions include three longform photo essays for independent magazines.",
            "directory_ready": True,
            "archive_ready": True,
            "collections": [
                {
                    "title": "Longform 2024–2026",
                    "description": "Three commissioned essays in their published edits.",
                    "cover_image_url": "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
                },
            ],
            "works": [
                {
                    "title": "Night Shift, Western Sydney",
                    "year": "2025",
                    "medium": "Photo essay (32 plates) and 4,200-word text",
                    "description": "An essay made over six months with a community of overnight transit cleaners.",
                    "image_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
                    "availability_status": "published",
                },
                {
                    "title": "Harbour Pilots",
                    "year": "2026",
                    "medium": "Photo essay and audio companion",
                    "description": "A field study of harbour pilots and their daily handovers.",
                    "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5",
                    "availability_status": "in_progress",
                },
            ],
        },
        {
            "slug": "studio-anika-wells",
            "display_name": "Anika Wells",
            "headline": "Sculptor and installation artist",
            "node_type": "artist",
            "display_mode": "studio_practice",
            "plan_type": "artist_presence",
            "template_id": templates["Studio Practice"].id,
            "location_label": "Hobart / Tasmania",
            "service_area": "Studio practice, exhibitions, residencies",
            "landing_enabled": True,
            "landing_title": "Studio: Anika Wells",
            "landing_subtitle": "Sculpture, paper, and the weight of slow attention.",
            "landing_background_url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f",
            "landing_enter_label": "Enter studio",
            "practice_statement": "Anika builds quiet objects from cast paper, salvaged wood, and waxed thread. The studio practice is patient and material — works often take a year.",
            "curatorial_statement": "This page documents the current studio cycle: works in progress, finished pieces, and exhibition history.",
            "archive_ready": True,
            "marketplace_ready": True,
            "collections": [
                {
                    "title": "Held Things",
                    "description": "Cast paper objects from the 2026 studio cycle.",
                    "cover_image_url": "https://images.unsplash.com/photo-1518005020951-eccb494ad742",
                },
                {
                    "title": "Exhibition History",
                    "description": "Documentation of installed and exhibited works.",
                    "cover_image_url": "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
                },
            ],
            "works": [
                {
                    "title": "Cradle (after the fall)",
                    "year": "2026",
                    "medium": "Cast paper, salvaged hardwood, waxed linen",
                    "dimensions": "60 x 40 x 30 cm",
                    "description": "A held object from the Held Things series.",
                    "image_url": "https://images.unsplash.com/photo-1547891654-e66ed7ebb968",
                    "availability_status": "available",
                    "price_label": "On request",
                },
                {
                    "title": "Long Quiet",
                    "year": "2025",
                    "medium": "Cast paper, copper wire",
                    "dimensions": "Variable installation",
                    "description": "Installed at the Salamanca Walks 2025 studio open.",
                    "image_url": "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
                    "availability_status": "exhibition",
                },
            ],
        },
    ]
    created = []
    for item in demo_nodes:
        existing = PresenceNode.query.filter_by(slug=item["slug"]).first()
        if existing:
            continue
        collections = item.pop("collections", [])
        works = item.pop("works", [])
        data = {
            **item,
            "tenant_id": tenant.id,
            "organisation_id": tenant.id,
            "owner_user_id": owner.id,
            "status": "published",
            "visibility": "public",
            "bio": (
                "A pilot Presence Node for invite-only alpha testing. It includes public-safe contact pathways, "
                "service signals, links, portfolio highlights, and structured enquiry capture."
            ),
            "primary_cta_label": "Send enquiry",
            "primary_cta_url": "https://example.org/contact",
            "public_email": "hello@example.org",
            "links": [
                {"label": "Website", "url": "https://example.org", "link_type": "website", "icon": "globe"},
                {"label": "Instagram", "url": "https://example.org/social", "link_type": "social", "icon": "instagram"},
            ],
            "services": [
                {
                    "title": "Introductory session",
                    "description": "A focused first conversation to understand fit and next steps.",
                    "price_label": "From $90",
                    "duration_label": "45 min",
                    "cta_label": "Enquire",
                    "cta_url": "https://example.org/book",
                }
            ],
            "availability_chips": [
                {"label": "Taking enquiries", "chip_type": "availability"},
                {"label": "Online available", "chip_type": "format"},
            ],
            "portfolio_items": [
                {
                    "title": "Pilot highlight",
                    "description": "A placeholder-safe portfolio item for alpha review.",
                    "media_url": "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
                    "thumbnail_url": "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
                    "external_url": "https://example.org/work",
                    "media_type": "image",
                }
            ],
            "sections": [
                {"section_type": "about", "title": "About", "content": "Built for trusted introductions and light-touch CRM capture."}
            ],
        }
        node = create_presence_node(data, actor=owner)
        created_collections = [create_presence_collection(node, row) for row in collections]
        for index, work in enumerate(works):
            if created_collections and not work.get("collection_id"):
                work["collection_id"] = created_collections[min(index, len(created_collections) - 1)].id
            create_presence_work(node, work)
        for tag_data in item.pop("nfc_tags_seed", []):
            create_presence_nfc_tag(node, tag_data)
        if item["slug"] == "harbour-electrical":
            tag = PresenceNfcTag.query.filter_by(node_id=node.id, source_code="nfc-card").first()
            if tag:
                create_presence_interaction(
                    node,
                    "nfc_scanned",
                    source_type=tag.tag_type,
                    source_tag_id=tag.id,
                    metadata={"source_code": tag.source_code, "demo": True},
                )
            connection = create_presence_connection(
                node,
                {
                    "contact_name": "Jordan Park",
                    "contact_email": "jordan@example.org",
                    "source_type": "quote_request",
                    "source_tag_id": tag.id if tag else None,
                    "status": "quoted",
                    "consent_status": "provided",
                    "notes": "Demo relationship ledger contact created after details were submitted.",
                },
            )
            quote = create_presence_quote(
                node,
                {
                    "connection_id": connection.id,
                    "title": "Studio lighting repair",
                    "status": "sent",
                    "description": "Replace two fittings and tidy exposed cabling.",
                    "total_amount": 780,
                    "currency": "AUD",
                    "terms": "Alpha demo quote, not payable.",
                    "line_items": [
                        {"label": "Labour", "quantity": 4, "unit_price": 120},
                        {"label": "Materials allowance", "quantity": 1, "unit_price": 300},
                    ],
                },
            )
            create_presence_variation(
                node,
                {
                    "quote_id": quote.id,
                    "connection_id": connection.id,
                    "title": "Add outdoor sensor",
                    "reason": "Client requested an extra sensor after site review.",
                    "description": "Install one extra outdoor sensor light.",
                    "price_delta": 180,
                    "status": "draft",
                },
            )
            create_presence_invoice_support(
                node,
                {
                    "connection_id": connection.id,
                    "quote_id": quote.id,
                    "external_invoice_url": "https://example.org/invoice/harbour-demo",
                    "invoice_number": "DEMO-INV-001",
                    "status": "draft",
                    "amount": 780,
                },
            )
            create_presence_handover(
                node,
                {
                    "connection_id": connection.id,
                    "quote_id": quote.id,
                    "summary": "Lighting repair demo handover.",
                    "work_notes": "Before/after records and warranty notes can be attached in alpha.",
                    "customer_acceptance_status": "pending",
                },
            )
        publish_presence_node(node)
        created.append(node.slug)
    db.session.flush()
    return {"tenant_id": tenant.id, "created": created}
