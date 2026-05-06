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
    create_presence_service,
    create_presence_work,
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
        publish_presence_node(node)
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
