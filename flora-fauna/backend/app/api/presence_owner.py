"""Owner-facing Presence API blueprint.

Mounted at /api/presence/owner/*. Authenticated by Supabase JWT via the existing
alpha_jwt_required + get_current_user pattern. NOT host-gated and does NOT use the
control-plane shared secret. The owner blueprint exposes the subset of presence
operations that a node owner needs to run their own portfolio (no cross-tenant
operations, no platform-admin actions, no template management, no seed endpoints).

Authorization: a request is permitted only if the resolved user is either:
  - PresenceNode.owner_user_id == user.id, or
  - user.role == "platform_admin" (staff impersonation override)
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import (
    PresenceCollection,
    PresenceEnquiry,
    PresenceNfcTag,
    PresenceNode,
    PresenceService,
    PresenceWork,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services.presence_service import (
    PresenceValidationError,
    analytics_summary,
    create_presence_collection,
    create_presence_nfc_tag,
    create_presence_node,
    create_presence_service,
    create_presence_work,
    ensure_unique_presence_slug,
    normalize_slug,
    publish_presence_node,
    serialize_collection,
    serialize_enquiry,
    serialize_nfc_tag,
    serialize_presence_node,
    serialize_service,
    serialize_work,
    transition_presence_node,
    update_enquiry_status,
    update_presence_collection,
    update_presence_nfc_tag,
    update_presence_node,
    update_presence_service,
    update_presence_work,
)


presence_owner_bp = Blueprint("presence_owner", __name__, url_prefix="/presence/owner")


_OWNER_NODE_MUTABLE_FIELDS = {
    "display_name",
    "headline",
    "bio",
    "theme_config",
    "visual_mood",
    "profile_image_url",
    "cover_image_url",
    "practice_statement",
    "curatorial_statement",
}


def _ok(data, status=200):
    return jsonify({"ok": True, "data": data}), status


def _err(code, message, status=400, **extra):
    payload = {"ok": False, "error": {"code": code, "message": message}}
    if extra:
        payload["error"]["details"] = extra
    return jsonify(payload), status


def _validation_error(exc: PresenceValidationError):
    return _err("validation_error", str(exc), 400)


def _resolve_owner_user():
    """Return the authenticated owner user or None. Caller must check None and 401."""
    return get_current_user()


def _require_owner_node_access(node: PresenceNode):
    """Return None if the current user owns the node (or is platform_admin), else an error response."""
    user = _resolve_owner_user()
    if not user:
        return _err("unauthorized", "Authentication required", 401)
    if getattr(user, "role", None) == "platform_admin":
        return None
    if node.owner_user_id and node.owner_user_id == user.id:
        return None
    return _err("forbidden", "You do not have access to this Presence Node", 403)


def _load_owned_node(node_id: int):
    """Fetch a node and authorize. Returns (node, error_response)."""
    node = PresenceNode.query.get(node_id)
    if not node:
        return None, _err("not_found", "Presence Node not found", 404)
    err = _require_owner_node_access(node)
    if err:
        return None, err
    return node, None


def _owner_node_payload(node: PresenceNode, *, include_children: bool, include_analytics: bool = False):
    payload = serialize_presence_node(node, public=False, include_admin=False, include_children=include_children)
    payload.pop("organisation", None)

    procurement_profile = payload.get("procurement_profile")
    if isinstance(procurement_profile, dict):
        procurement_profile.pop("node_id", None)
        procurement_profile.pop("abn_acn_or_registration", None)
        procurement_profile.pop("procurement_contact_email", None)
        procurement_profile.pop("compliance_notes", None)

    if include_analytics:
        payload["analytics"] = analytics_summary(node)
    return payload


def _owner_node_detail_response(node: PresenceNode):
    return _ok(_owner_node_payload(node, include_children=True, include_analytics=True))


def _filter_owner_node_update_payload(data):
    if not isinstance(data, dict):
        return data
    return {key: value for key, value in data.items() if key in _OWNER_NODE_MUTABLE_FIELDS}


def _require_owner_suspend_access():
    user = _resolve_owner_user()
    if not user:
        return _err("unauthorized", "Authentication required", 401)
    if getattr(user, "role", None) == "platform_admin":
        return None
    return _err("forbidden", "Suspending a Presence Node is control-plane only", 403)


# ---------------------------------------------------------------------------
# Safe self-service draft Presence creation
#
# A verified beta user may create one private/draft/unpublished starter
# Presence from onboarding. This endpoint is the only owner-side creation path.
#
# Hard rules (enforced by tests):
#   - auth required
#   - status forced to "draft", visibility forced to "private"
#   - published_at is never set
#   - owner_user_id is set from the authenticated user (never trusted from payload)
#   - duplicate slug → 409
#   - duplicate starter node per user → 409 (one-per-user rule)
#   - public route hides the result (status=draft, visibility=private)
# ---------------------------------------------------------------------------

_BETA_PRESENCE_TYPES = {
    "artist", "practitioner", "venue_collective", "organisation",
    "creative_professional", "consultant", "service_professional", "other",
}
_BETA_PURPOSES = {
    "portfolio", "gallery", "practitioner_profile", "venue_collective",
    "organisation", "professional_profile", "service_profile", "other",
}
_BETA_CTAS = {
    "contact", "conversation", "viewing", "work_enquiry",
    "commission_request", "quote_request", "visit_partner_support", "other",
}
_BETA_TEMPLATES = {
    "minimal_artist_portal", "gallery_wall", "editorial_portfolio",
    "studio_practice", "practitioner_pathway", "venue_collective_node", "unsure",
}
_BETA_MOODS = {
    "nocturne", "gallery_white", "warm_studio", "editorial_paper",
    "care_path", "public_noticeboard", "institutional_dusk", "signal_field",
    # extended in self-serve onboarding pass
    "earth_craft", "clean_professional",
}
_BETA_INTENSITIES = {
    "restrained", "expressive", "atmospheric", "flagship",
}

# Map beta-onboarding template_direction → PresenceNode.display_mode (the
# value the public renderer routes on). Keep the mapping conservative.
_TEMPLATE_TO_DISPLAY_MODE = {
    "minimal_artist_portal": "minimal_portal",
    "gallery_wall": "artist_gallery",
    "editorial_portfolio": "editorial_portfolio",
    "studio_practice": "studio_practice",
    "practitioner_pathway": "practitioner_profile",
    "venue_collective_node": "venue_profile",
    # "unsure" → leave unset and use the default for the node_type
}

_PRESENCE_TYPE_TO_NODE_TYPE = {
    "artist": "artist",
    "practitioner": "practitioner",
    "venue_collective": "venue",
    "organisation": "organisation",
    "creative_professional": "creative",
    "consultant": "consultant",
    "service_professional": "tradie",
    "other": "custom",
}

_BETA_CTA_LABELS = {
    "contact": "Contact me",
    "conversation": "Book a conversation",
    "viewing": "Request a viewing",
    "work_enquiry": "Enquire about a work",
    "commission_request": "Commission request",
    "quote_request": "Request a quote",
    "visit_partner_support": "Visit / partner / support",
    "other": "Send a message",
}


def _trim(value, max_len):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len]


@presence_owner_bp.route("/beta/start", methods=["POST"])
@alpha_jwt_required()
def start_beta_presence():
    """Create one DRAFT, PRIVATE, UNPUBLISHED Presence for the calling user.

    This is the safe self-service entry point used by /beta/onboarding once a
    user is verified. It NEVER publishes, NEVER assigns ownership to anyone
    other than the caller, and NEVER returns owner-private fields beyond the
    caller's own draft.
    """
    user = _resolve_owner_user()
    if not user:
        return _err("unauthorized", "Authentication required", 401)

    payload = request.get_json(silent=True) or {}

    display_name = _trim(payload.get("display_name"), 160)
    if not display_name:
        return _err("validation_error", "display_name is required", 422)

    presence_type = _trim(payload.get("presence_type"), 80) or "other"
    if presence_type not in _BETA_PRESENCE_TYPES:
        return _err("validation_error", f"Unsupported presence_type: {presence_type}", 422)
    primary_purpose = _trim(payload.get("primary_purpose"), 80)
    if primary_purpose and primary_purpose not in _BETA_PURPOSES:
        return _err("validation_error", f"Unsupported primary_purpose: {primary_purpose}", 422)
    primary_cta = _trim(payload.get("primary_cta"), 80)
    if primary_cta and primary_cta not in _BETA_CTAS:
        return _err("validation_error", f"Unsupported primary_cta: {primary_cta}", 422)
    template_direction = _trim(payload.get("template_direction"), 80)
    if template_direction and template_direction not in _BETA_TEMPLATES:
        return _err("validation_error", f"Unsupported template_direction: {template_direction}", 422)
    visual_mood = _trim(payload.get("visual_mood"), 80)
    if visual_mood and visual_mood not in _BETA_MOODS:
        return _err("validation_error", f"Unsupported visual_mood: {visual_mood}", 422)
    intensity = _trim(payload.get("intensity"), 40)
    if intensity and intensity not in _BETA_INTENSITIES:
        return _err("validation_error", f"Unsupported intensity: {intensity}", 422)

    # One-starter-per-user rule. Platform admins are exempt (they may need
    # multiple starter nodes for staff demos).
    if getattr(user, "role", None) != "platform_admin":
        existing = (
            PresenceNode.query.filter_by(owner_user_id=user.id)
            .first()
        )
        if existing:
            return _err(
                "duplicate_starter",
                "You already have a Presence Node — open Studio to continue shaping it.",
                409,
                node_id=existing.id,
            )

    # Slug derivation + uniqueness. We use ensure_unique_presence_slug which
    # appends a numeric suffix on collision, but if the user explicitly
    # requested a slug that's already taken, return 409 instead of silently
    # appending — beta users should know about the collision.
    raw_slug = _trim(payload.get("desired_slug"), 160)
    if raw_slug:
        try:
            requested = normalize_slug(raw_slug, fallback="")
        except PresenceValidationError as exc:
            return _validation_error(exc)
        if not requested:
            return _err(
                "validation_error",
                "desired_slug must contain letters or numbers.",
                422,
            )
        existing_slug_node = PresenceNode.query.filter_by(slug=requested).first()
        if existing_slug_node:
            return _err(
                "duplicate_slug",
                "That public address is already taken. Choose another.",
                409,
            )
        slug = requested
    else:
        slug = None  # let create_presence_node derive from display_name

    node_type = _PRESENCE_TYPE_TO_NODE_TYPE.get(presence_type, "custom")
    display_mode = _TEMPLATE_TO_DISPLAY_MODE.get(template_direction or "")

    # description is the wizard's "short intro / world statement" field, but
    # the wizard may also pass a longer world_statement explicitly. Prefer
    # description for bio (matches existing v1.1 contract); world_statement
    # supplements it if separate.
    bio_text = _trim(payload.get("description"), 4000)
    world_statement = _trim(payload.get("world_statement"), 4000)
    if not bio_text and world_statement:
        # Use world_statement as bio when description is empty.
        bio_text = world_statement
    proof_note = _trim(payload.get("proof_note"), 4000)
    headline_text = _trim(payload.get("headline"), 280)
    location_label = _trim(payload.get("location_label"), 180)

    primary_cta_label = _BETA_CTA_LABELS.get(primary_cta) if primary_cta else None

    # theme_config.beta_intent records the full onboarding intent so Studio
    # and the renderer can use it. Onboarding version is bumped when the wizard
    # gains new mappable questions.
    beta_intent: dict = {
        "template_direction": template_direction,
        "visual_mood": visual_mood,
        "intensity": intensity,
        "primary_purpose": primary_purpose,
        "primary_cta": primary_cta,
        "presence_type": presence_type,
        "beta_mode": _trim(payload.get("beta_mode"), 40) or "draft_self_build",
        "world_statement": world_statement,
        "proof_note": proof_note,
        "onboarding_version": "v2-self-serve-2026-05-08",
        "launch_mode": "self_serve_draft",
    }

    node_payload = {
        "display_name": display_name,
        "node_type": node_type,
        "plan_type": "basic",
        # CRITICAL: force draft + private regardless of any payload field.
        "status": "draft",
        "visibility": "private",
        "headline": headline_text,
        "bio": bio_text,
        "location_label": location_label,
        "primary_cta_label": primary_cta_label,
        "visual_mood": visual_mood,
        "theme_config": {"beta_intent": beta_intent},
    }
    # If the user supplied a proof_note, persist it as the public proof_summary
    # so it survives without depending on theme_config readers.
    if proof_note:
        node_payload["proof_summary"] = proof_note
    if slug:
        node_payload["slug"] = slug
    if display_mode:
        node_payload["display_mode"] = display_mode

    try:
        node = create_presence_node(node_payload, actor=user)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except Exception:
        db.session.rollback()
        return _err("service_unavailable", "Draft creation temporarily unavailable", 503)

    # Defensive re-assertion — the safety contract of this endpoint is that
    # the resulting row is draft + private, regardless of what create_presence_node
    # did with the payload.
    if node.status != "draft":
        node.status = "draft"
    if node.visibility != "private":
        node.visibility = "private"
    if node.published_at is not None:
        node.published_at = None
    # owner_user_id should already be the caller, but enforce explicitly.
    if node.owner_user_id != user.id and getattr(user, "role", None) != "platform_admin":
        node.owner_user_id = user.id

    db.session.commit()

    return _ok(_owner_node_payload(node, include_children=True), 201)


@presence_owner_bp.route("/nodes", methods=["GET"])
@alpha_jwt_required()
def list_owner_nodes():
    user = _resolve_owner_user()
    if not user:
        return _err("unauthorized", "Authentication required", 401)
    if getattr(user, "role", None) == "platform_admin":
        nodes = PresenceNode.query.order_by(PresenceNode.updated_at.desc()).limit(200).all()
    else:
        nodes = (
            PresenceNode.query.filter_by(owner_user_id=user.id)
            .order_by(PresenceNode.updated_at.desc())
            .all()
        )
    rows = [_owner_node_payload(node, include_children=False) for node in nodes]
    return _ok(rows)


@presence_owner_bp.route("/nodes/<int:node_id>", methods=["GET"])
@alpha_jwt_required()
def get_owner_node(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    return _owner_node_detail_response(node)


@presence_owner_bp.route("/nodes/<int:node_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_owner_node(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    try:
        update_presence_node(node, _filter_owner_node_update_payload(request.get_json(silent=True) or {}))
        db.session.commit()
        return _owner_node_detail_response(node)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/nodes/<int:node_id>/publish", methods=["POST"])
@alpha_jwt_required()
def publish_owner_node(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    try:
        if node.status in {"suspended", "archived"}:
            return _err(
                "forbidden",
                "Suspended or archived Presences can only be restored by platform staff.",
                403,
            )
        publish_presence_node(node)
        node.visibility = "public"
        db.session.commit()
        return _owner_node_detail_response(node)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/nodes/<int:node_id>/unpublish", methods=["POST"])
@alpha_jwt_required()
def unpublish_owner_node(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    try:
        transition_presence_node(node, "unpublished")
        db.session.commit()
        return _owner_node_detail_response(node)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/nodes/<int:node_id>/suspend", methods=["POST"])
@alpha_jwt_required()
def suspend_owner_node(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    suspend_err = _require_owner_suspend_access()
    if suspend_err:
        return suspend_err
    try:
        transition_presence_node(node, "suspended")
        db.session.commit()
        return _owner_node_detail_response(node)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


# --- Works ---


@presence_owner_bp.route("/nodes/<int:node_id>/works", methods=["GET"])
@alpha_jwt_required()
def list_owner_works(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    works = (
        PresenceWork.query.filter_by(node_id=node.id)
        .order_by(PresenceWork.sort_order.asc(), PresenceWork.id.asc())
        .all()
    )
    return _ok([serialize_work(item) for item in works])


@presence_owner_bp.route("/nodes/<int:node_id>/works", methods=["POST"])
@alpha_jwt_required()
def create_owner_work(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    try:
        work = create_presence_work(node, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_work(work), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/works/<int:work_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_owner_work(work_id):
    work = PresenceWork.query.get(work_id)
    if not work:
        return _err("not_found", "Work not found", 404)
    node = PresenceNode.query.get(work.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    try:
        update_presence_work(work, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_work(work))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/works/<int:work_id>", methods=["DELETE"])
@alpha_jwt_required()
def delete_owner_work(work_id):
    work = PresenceWork.query.get(work_id)
    if not work:
        return _err("not_found", "Work not found", 404)
    node = PresenceNode.query.get(work.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    db.session.delete(work)
    db.session.commit()
    return _ok({"deleted": True, "id": work_id})


# --- Collections ---


@presence_owner_bp.route("/nodes/<int:node_id>/collections", methods=["GET"])
@alpha_jwt_required()
def list_owner_collections(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    collections = (
        PresenceCollection.query.filter_by(node_id=node.id)
        .order_by(PresenceCollection.sort_order.asc(), PresenceCollection.id.asc())
        .all()
    )
    return _ok([serialize_collection(item, include_admin=True) for item in collections])


@presence_owner_bp.route("/nodes/<int:node_id>/collections", methods=["POST"])
@alpha_jwt_required()
def create_owner_collection(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    try:
        collection = create_presence_collection(node, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_collection(collection, include_admin=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/collections/<int:collection_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_owner_collection(collection_id):
    collection = PresenceCollection.query.get(collection_id)
    if not collection:
        return _err("not_found", "Collection not found", 404)
    node = PresenceNode.query.get(collection.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    try:
        update_presence_collection(collection, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_collection(collection, include_admin=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/collections/<int:collection_id>", methods=["DELETE"])
@alpha_jwt_required()
def delete_owner_collection(collection_id):
    collection = PresenceCollection.query.get(collection_id)
    if not collection:
        return _err("not_found", "Collection not found", 404)
    node = PresenceNode.query.get(collection.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    PresenceWork.query.filter_by(collection_id=collection.id).update({"collection_id": None})
    db.session.delete(collection)
    db.session.commit()
    return _ok({"deleted": True, "id": collection_id})


# --- Services ---


@presence_owner_bp.route("/nodes/<int:node_id>/services", methods=["GET"])
@alpha_jwt_required()
def list_owner_services(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    services = (
        PresenceService.query.filter_by(node_id=node.id)
        .order_by(PresenceService.sort_order.asc(), PresenceService.id.asc())
        .all()
    )
    return _ok([serialize_service(item) for item in services])


@presence_owner_bp.route("/nodes/<int:node_id>/services", methods=["POST"])
@alpha_jwt_required()
def create_owner_service(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    try:
        service = create_presence_service(node, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_service(service), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/services/<int:service_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_owner_service(service_id):
    service = PresenceService.query.get(service_id)
    if not service:
        return _err("not_found", "Service not found", 404)
    node = PresenceNode.query.get(service.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    try:
        update_presence_service(service, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_service(service))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/services/<int:service_id>", methods=["DELETE"])
@alpha_jwt_required()
def delete_owner_service(service_id):
    service = PresenceService.query.get(service_id)
    if not service:
        return _err("not_found", "Service not found", 404)
    node = PresenceNode.query.get(service.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    db.session.delete(service)
    db.session.commit()
    return _ok({"deleted": True, "id": service_id})


# --- Enquiries ---


@presence_owner_bp.route("/nodes/<int:node_id>/enquiries", methods=["GET"])
@alpha_jwt_required()
def list_owner_enquiries(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    query = PresenceEnquiry.query.filter_by(node_id=node.id)
    status = request.args.get("status")
    if status:
        query = query.filter(PresenceEnquiry.status == status)
    enquiries = query.order_by(PresenceEnquiry.created_at.desc()).limit(200).all()
    return _ok([serialize_enquiry(item) for item in enquiries])


@presence_owner_bp.route("/enquiries/<int:enquiry_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_owner_enquiry(enquiry_id):
    enquiry = PresenceEnquiry.query.get(enquiry_id)
    if not enquiry:
        return _err("not_found", "Enquiry not found", 404)
    node = PresenceNode.query.get(enquiry.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    try:
        update_enquiry_status(enquiry, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_enquiry(enquiry))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


# --- NFC tags ---


@presence_owner_bp.route("/nodes/<int:node_id>/nfc-tags", methods=["GET"])
@alpha_jwt_required()
def list_owner_nfc_tags(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    tags = (
        PresenceNfcTag.query.filter_by(node_id=node.id)
        .order_by(PresenceNfcTag.created_at.desc())
        .all()
    )
    return _ok([serialize_nfc_tag(tag) for tag in tags])


@presence_owner_bp.route("/nodes/<int:node_id>/nfc-tags", methods=["POST"])
@alpha_jwt_required()
def create_owner_nfc_tag(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    try:
        tag = create_presence_nfc_tag(node, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_nfc_tag(tag), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/nfc-tags/<int:tag_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_owner_nfc_tag(tag_id):
    tag = PresenceNfcTag.query.get(tag_id)
    if not tag:
        return _err("not_found", "NFC tag not found", 404)
    node = PresenceNode.query.get(tag.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    try:
        update_presence_nfc_tag(tag, request.get_json(silent=True) or {})
        db.session.commit()
        return _ok(serialize_nfc_tag(tag))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_owner_bp.route("/nfc-tags/<int:tag_id>", methods=["DELETE"])
@alpha_jwt_required()
def delete_owner_nfc_tag(tag_id):
    tag = PresenceNfcTag.query.get(tag_id)
    if not tag:
        return _err("not_found", "NFC tag not found", 404)
    node = PresenceNode.query.get(tag.node_id)
    if not node:
        return _err("not_found", "Presence Node not found", 404)
    auth_err = _require_owner_node_access(node)
    if auth_err:
        return auth_err
    db.session.delete(tag)
    db.session.commit()
    return _ok({"deleted": True, "id": tag_id})


# --- Analytics ---


@presence_owner_bp.route("/nodes/<int:node_id>/analytics", methods=["GET"])
@alpha_jwt_required()
def get_owner_analytics(node_id):
    node, err = _load_owned_node(node_id)
    if err:
        return err
    return _ok(analytics_summary(node))
