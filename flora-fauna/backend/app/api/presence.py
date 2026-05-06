from __future__ import annotations

from flask import Blueprint, Response, current_app, request
from flask_jwt_extended import get_jwt
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from ..extensions import db, limiter
from ..models import (
    PresenceCollection,
    PresenceConnection,
    PresenceEnquiry,
    PresenceInvoiceSupport,
    PresenceNfcTag,
    PresenceNode,
    PresenceProcurementProfile,
    PresenceProofItem,
    PresenceQuote,
    PresenceService,
    PresenceTemplate,
    PresenceVariation,
    PresenceWork,
    PresenceWorkHandover,
)
from ..security.control_plane import control_plane_required, log_control_event
from ..security.control_tenant_scope import resolve_effective_control_managed_node_ids
from ..security.policy import get_current_user
from ..services.presence_service import (
    PRESENCE_ANALYTICS_EVENTS,
    PRESENCE_NODE_STATUSES,
    PresenceValidationError,
    analytics_summary,
    create_presence_connection,
    create_presence_collection,
    create_presence_enquiry,
    create_presence_handover,
    create_presence_interaction,
    create_presence_invoice_support,
    create_presence_nfc_tag,
    create_presence_node,
    create_presence_proof_item,
    create_presence_quote,
    create_presence_quote_request,
    create_presence_service,
    create_presence_variation,
    create_presence_work,
    normalize_slug,
    pseudo_qr_svg,
    public_presence_node_by_slug,
    publish_presence_node,
    record_presence_source_hit,
    record_presence_event,
    seed_presence_templates,
    serialize_collection,
    serialize_connection,
    serialize_enquiry,
    serialize_handover,
    serialize_invoice_support,
    serialize_interaction,
    serialize_nfc_tag,
    serialize_presence_node,
    serialize_procurement_profile,
    serialize_proof_item,
    serialize_quote,
    serialize_service,
    serialize_variation,
    serialize_work,
    source_tag_for_node,
    transition_presence_node,
    update_presence_connection,
    update_presence_collection,
    update_enquiry_status,
    update_presence_handover,
    update_presence_invoice_support,
    update_presence_nfc_tag,
    update_presence_node,
    update_presence_proof_item,
    update_presence_quote,
    update_presence_service,
    update_presence_variation,
    update_presence_work,
    upsert_procurement_profile,
    presence_vcard,
)
from .utils import error, ok


presence_bp = Blueprint("presence", __name__, url_prefix="/presence")
control_presence_bp = Blueprint("control_presence", __name__, url_prefix="/control/presence")


def _validation_error(exc: PresenceValidationError):
    return error("validation_error", str(exc), 400, details=getattr(exc, "details", None) or None)


def _current_control_scope():
    user = get_current_user()
    claims = get_jwt() or {}
    allowed_node_ids = resolve_effective_control_managed_node_ids(user=user, claims=claims)
    return user, claims, allowed_node_ids


def _presence_query_for_control():
    user, _claims, allowed_node_ids = _current_control_scope()
    query = PresenceNode.query
    if allowed_node_ids is None:
        return query

    filters = []
    if allowed_node_ids:
        filters.append(PresenceNode.tenant_id.in_(sorted(allowed_node_ids)))
    if user:
        filters.append(PresenceNode.owner_user_id == user.id)
    if not filters:
        return query.filter(False)
    return query.filter(or_(*filters))


def _require_node_control_access(node: PresenceNode, *, allow_owner: bool = True):
    user, _claims, allowed_node_ids = _current_control_scope()
    if allowed_node_ids is None:
        return None
    if node.tenant_id and node.tenant_id in allowed_node_ids:
        return None
    if allow_owner and user and node.owner_user_id == user.id:
        return None
    return error(
        "tenant_scope_forbidden",
        "Cross-tenant Presence Node access is not allowed for this operator.",
        403,
        details={"requested_tenant_id": node.tenant_id, "allowed_node_ids": sorted(allowed_node_ids or [])},
    )


def _require_payload_tenant_scope(data: dict):
    user, _claims, allowed_node_ids = _current_control_scope()
    if allowed_node_ids is None:
        return None
    requested_tenant_id = data.get("tenant_id")
    if requested_tenant_id is None and user:
        requested_tenant_id = user.node_id
    try:
        requested_tenant_id = int(requested_tenant_id) if requested_tenant_id is not None else None
    except (TypeError, ValueError):
        requested_tenant_id = None
    if requested_tenant_id and requested_tenant_id in allowed_node_ids:
        return None
    if requested_tenant_id is None and user:
        return None
    return error(
        "tenant_scope_forbidden",
        "Cross-tenant Presence Node writes are not allowed for this operator.",
        403,
        details={"requested_tenant_id": requested_tenant_id, "allowed_node_ids": sorted(allowed_node_ids or [])},
    )


@presence_bp.route("/public/<string:slug>", methods=["GET"])
@limiter.limit("240 per hour")
def get_public_presence_node(slug):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    try:
        record_presence_event(
            node,
            "node_viewed",
            metadata={"source": "public_route"},
            anonymous_session_id=request.args.get("sid"),
        )
        db.session.commit()
    except Exception:
        current_app.logger.warning("Presence public analytics write failed", exc_info=True)
        db.session.rollback()
    return ok(serialize_presence_node(node, public=True))


@presence_bp.route("/public/<string:slug>/works/<int:work_id>", methods=["GET"])
@limiter.limit("240 per hour")
def get_public_presence_work(slug, work_id):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    work = next((w for w in node.works if w.id == work_id), None)
    if not work or not work.is_visible:
        return error("not_found", "Work not found", 404)
    collection = None
    if work.collection_id:
        collection = next((c for c in node.collections if c.id == work.collection_id and c.is_visible), None)
    try:
        record_presence_event(
            node,
            "portfolio_item_clicked",
            metadata={"source": "public_work_detail", "work_id": work_id},
            anonymous_session_id=request.args.get("sid"),
        )
        db.session.commit()
    except Exception:
        current_app.logger.warning("Presence work analytics write failed", exc_info=True)
        db.session.rollback()
    return ok(
        {
            "node": serialize_presence_node(node, public=True, include_children=False),
            "work": serialize_work(work),
            "collection": serialize_collection(collection, include_admin=False) if collection else None,
        }
    )


@presence_bp.route("/public/<string:slug>/collections/<int:collection_id>", methods=["GET"])
@limiter.limit("240 per hour")
def get_public_presence_collection(slug, collection_id):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    collection = next((c for c in node.collections if c.id == collection_id), None)
    if not collection or not collection.is_visible:
        return error("not_found", "Collection not found", 404)
    works = [
        serialize_work(w)
        for w in sorted(node.works, key=lambda row: (row.sort_order or 0, row.id or 0))
        if w.collection_id == collection.id and w.is_visible
    ]
    try:
        record_presence_event(
            node,
            "portfolio_item_clicked",
            metadata={"source": "public_collection_detail", "collection_id": collection_id},
            anonymous_session_id=request.args.get("sid"),
        )
        db.session.commit()
    except Exception:
        current_app.logger.warning("Presence collection analytics write failed", exc_info=True)
        db.session.rollback()
    return ok(
        {
            "node": serialize_presence_node(node, public=True, include_children=False),
            "collection": serialize_collection(collection, include_admin=False),
            "works": works,
        }
    )


@presence_bp.route("/public/<string:slug>/enquiries", methods=["POST"])
@limiter.limit("8 per minute; 40 per hour")
def submit_public_presence_enquiry(slug):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    try:
        enquiry = create_presence_enquiry(node, request.get_json(silent=True) or {})
        db.session.commit()
        return ok(
            {
                "id": enquiry.id,
                "status": enquiry.status,
                "message": "Enquiry submitted.",
            },
            201,
        )
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except Exception:
        current_app.logger.exception("Presence enquiry submission failed")
        db.session.rollback()
        return error("service_unavailable", "Enquiry submission temporarily unavailable", 503)


@presence_bp.route("/public/<string:slug>/nfc-hit", methods=["POST"])
@limiter.limit("60 per minute; 300 per hour")
def submit_public_presence_nfc_hit(slug):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    try:
        data = request.get_json(silent=True) or {}
        result = record_presence_source_hit(node, data)
        db.session.commit()
        tag = result.get("source_tag")
        return ok(
            {
                "captured": True,
                "event_type": result.get("event_type"),
                "source_tag_id": getattr(tag, "id", None),
            },
            201,
        )
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except Exception:
        current_app.logger.exception("Presence NFC hit capture failed")
        db.session.rollback()
        return error("service_unavailable", "Source tracking temporarily unavailable", 503)


@presence_bp.route("/public/<string:slug>/quote-request", methods=["POST"])
@limiter.limit("6 per minute; 30 per hour")
def submit_public_presence_quote_request(slug):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    try:
        result = create_presence_quote_request(node, request.get_json(silent=True) or {})
        db.session.commit()
        return ok(
            {
                "enquiry_id": result["enquiry"].id,
                "connection_id": result["connection"].id,
                "quote_id": result["quote"].id,
                "status": result["enquiry"].status,
                "message": "Quote request submitted.",
            },
            201,
        )
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except Exception:
        current_app.logger.exception("Presence quote request submission failed")
        db.session.rollback()
        return error("service_unavailable", "Quote request temporarily unavailable", 503)


@presence_bp.route("/public/<string:slug>/vcard", methods=["GET"])
@limiter.limit("120 per hour")
def get_public_presence_vcard(slug):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    try:
        record_presence_event(node, "vcard_downloaded", metadata={"source": "public_route"}, anonymous_session_id=request.args.get("sid"))
        db.session.commit()
    except Exception:
        db.session.rollback()
    return Response(
        presence_vcard(node),
        mimetype="text/vcard",
        headers={"Content-Disposition": f'attachment; filename="{normalize_slug(node.slug)}.vcf"'},
    )


@presence_bp.route("/public/<string:slug>/qr", methods=["GET"])
@limiter.limit("120 per hour")
def get_public_presence_qr(slug):
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    try:
        record_presence_event(node, "qr_viewed", metadata={"source": "public_route"}, anonymous_session_id=request.args.get("sid"))
        db.session.commit()
    except Exception:
        db.session.rollback()
    return Response(pseudo_qr_svg(node), mimetype="image/svg+xml")


@presence_bp.route("/analytics/event", methods=["POST"])
@limiter.limit("120 per minute")
def capture_presence_analytics_event():
    data = request.get_json(silent=True) or {}
    event_type = str(data.get("event_type") or "").strip()
    if event_type not in PRESENCE_ANALYTICS_EVENTS:
        return error("validation_error", "Unsupported analytics event type", 400)
    slug = normalize_slug(data.get("slug"))
    node = public_presence_node_by_slug(slug)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    record_presence_event(
        node,
        event_type,
        metadata=data.get("metadata") if isinstance(data.get("metadata"), dict) else {},
        anonymous_session_id=data.get("anonymous_session_id"),
    )
    db.session.commit()
    return ok({"captured": True})


@control_presence_bp.route("/nodes", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def list_control_presence_nodes():
    query = _presence_query_for_control()
    status = request.args.get("status")
    if status:
        query = query.filter(PresenceNode.status == status)
    node_type = request.args.get("node_type") or request.args.get("type")
    if node_type:
        query = query.filter(PresenceNode.node_type == node_type)
    display_mode = request.args.get("display_mode")
    if display_mode:
        query = query.filter(PresenceNode.display_mode == display_mode)
    tenant_id = request.args.get("tenant_id", type=int)
    if tenant_id:
        query = query.filter(PresenceNode.tenant_id == tenant_id)
    organisation_id = request.args.get("organisation_id", type=int)
    if organisation_id:
        query = query.filter(PresenceNode.organisation_id == organisation_id)
    owner_user_id = request.args.get("owner_user_id", type=int)
    if owner_user_id:
        query = query.filter(PresenceNode.owner_user_id == owner_user_id)
    template_id = request.args.get("template_id", type=int)
    if template_id:
        query = query.filter(PresenceNode.template_id == template_id)

    nodes = query.order_by(PresenceNode.updated_at.desc(), PresenceNode.id.desc()).limit(200).all()
    return ok([serialize_presence_node(node, include_children=False, include_admin=True) for node in nodes])


@control_presence_bp.route("/nodes", methods=["POST"])
@control_plane_required(scopes=["presence.node.create"])
def create_control_presence_node():
    data = request.get_json(silent=True) or {}
    scope_error = _require_payload_tenant_scope(data)
    if scope_error:
        return scope_error
    actor = get_current_user()
    try:
        node = create_presence_node(data, actor=actor)
        db.session.commit()
        log_control_event("presence.node.create", getattr(actor, "id", None), "presence_node", str(node.id), {"slug": node.slug})
        return ok(serialize_presence_node(node, include_admin=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "Presence Node slug already exists", 409)


@control_presence_bp.route("/nodes/<int:node_id>", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def get_control_presence_node(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    return ok(
        {
            **serialize_presence_node(node, include_admin=True),
            "analytics": analytics_summary(node),
        }
    )


@control_presence_bp.route("/nodes/<int:node_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.node.update"])
def update_control_presence_node(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    data = request.get_json(silent=True) or {}
    if "tenant_id" in data:
        scope_error = _require_payload_tenant_scope(data)
        if scope_error:
            return scope_error
    actor = get_current_user()
    try:
        update_presence_node(node, data)
        db.session.commit()
        log_control_event("presence.node.update", getattr(actor, "id", None), "presence_node", str(node.id), {"slug": node.slug})
        return ok(serialize_presence_node(node, include_admin=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "Presence Node slug already exists", 409)


@control_presence_bp.route("/nodes/<int:node_id>", methods=["DELETE"])
@control_plane_required(scopes=["presence.node.delete"])
def delete_control_presence_node(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    transition_presence_node(node, "archived")
    db.session.commit()
    log_control_event("presence.node.delete", getattr(actor, "id", None), "presence_node", str(node.id), {"slug": node.slug})
    return ok(serialize_presence_node(node, include_admin=True))


@control_presence_bp.route("/nodes/<int:node_id>/publish", methods=["POST"])
@control_plane_required(scopes=["presence.node.publish"])
def publish_control_presence_node(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    publish_presence_node(node)
    db.session.commit()
    log_control_event("presence.node.publish", getattr(actor, "id", None), "presence_node", str(node.id), {"slug": node.slug})
    return ok(serialize_presence_node(node, include_admin=True))


def _status_transition_route(node_id: int, status: str, action: str):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    transition_presence_node(node, status)
    db.session.commit()
    log_control_event(action, getattr(actor, "id", None), "presence_node", str(node.id), {"slug": node.slug, "status": status})
    return ok(serialize_presence_node(node, include_admin=True))


@control_presence_bp.route("/nodes/<int:node_id>/unpublish", methods=["POST"])
@control_plane_required(scopes=["presence.node.publish"])
def unpublish_control_presence_node(node_id):
    return _status_transition_route(node_id, "unpublished", "presence.node.unpublish")


@control_presence_bp.route("/nodes/<int:node_id>/suspend", methods=["POST"])
@control_plane_required(scopes=["presence.node.suspend"])
def suspend_control_presence_node(node_id):
    return _status_transition_route(node_id, "suspended", "presence.node.suspend")


@control_presence_bp.route("/nodes/<int:node_id>/archive", methods=["POST"])
@control_plane_required(scopes=["presence.node.archive"])
def archive_control_presence_node(node_id):
    return _status_transition_route(node_id, "archived", "presence.node.archive")


@control_presence_bp.route("/nodes/<int:node_id>/enquiries", methods=["GET"])
@control_plane_required(scopes=["presence.enquiry.read"])
def list_control_presence_enquiries(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    query = PresenceEnquiry.query.filter_by(node_id=node.id)
    status = request.args.get("status")
    if status:
        query = query.filter(PresenceEnquiry.status == status)
    enquiry_type = request.args.get("enquiry_type")
    if enquiry_type:
        query = query.filter(PresenceEnquiry.enquiry_type == enquiry_type)
    enquiries = query.order_by(PresenceEnquiry.created_at.desc()).limit(200).all()
    return ok([serialize_enquiry(item) for item in enquiries])


@control_presence_bp.route("/enquiries/<int:enquiry_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.enquiry.update"])
def update_control_presence_enquiry(enquiry_id):
    enquiry = PresenceEnquiry.query.get(enquiry_id)
    if not enquiry:
        return error("not_found", "Presence enquiry not found", 404)
    node = PresenceNode.query.get(enquiry.node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_enquiry_status(enquiry, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event(
            "presence.enquiry.update",
            getattr(actor, "id", None),
            "presence_enquiry",
            str(enquiry.id),
            {"status": enquiry.status, "node_id": node.id},
        )
        return ok(serialize_enquiry(enquiry))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/nodes/<int:node_id>/collections", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def list_control_presence_collections(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    collections = PresenceCollection.query.filter_by(node_id=node.id).order_by(PresenceCollection.sort_order.asc(), PresenceCollection.id.asc()).all()
    return ok([serialize_collection(item, include_admin=True) for item in collections])


@control_presence_bp.route("/nodes/<int:node_id>/collections", methods=["POST"])
@control_plane_required(scopes=["presence.collection.manage"])
def create_control_presence_collection(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        collection = create_presence_collection(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.collection.create", getattr(actor, "id", None), "presence_collection", str(collection.id), {"node_id": node.id})
        return ok(serialize_collection(collection, include_admin=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/collections/<int:collection_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.collection.manage"])
def update_control_presence_collection(collection_id):
    collection = PresenceCollection.query.get(collection_id)
    if not collection:
        return error("not_found", "Presence collection not found", 404)
    node = PresenceNode.query.get(collection.node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_collection(collection, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.collection.update", getattr(actor, "id", None), "presence_collection", str(collection.id), {"node_id": node.id})
        return ok(serialize_collection(collection, include_admin=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/collections/<int:collection_id>", methods=["DELETE"])
@control_plane_required(scopes=["presence.collection.manage"])
def delete_control_presence_collection(collection_id):
    collection = PresenceCollection.query.get(collection_id)
    if not collection:
        return error("not_found", "Presence collection not found", 404)
    node = PresenceNode.query.get(collection.node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    PresenceWork.query.filter_by(collection_id=collection.id).update({"collection_id": None})
    db.session.delete(collection)
    db.session.commit()
    log_control_event("presence.collection.delete", getattr(actor, "id", None), "presence_collection", str(collection_id), {"node_id": node.id})
    return ok({"deleted": True, "id": collection_id})


@control_presence_bp.route("/nodes/<int:node_id>/works", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def list_control_presence_works(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    works = PresenceWork.query.filter_by(node_id=node.id).order_by(PresenceWork.sort_order.asc(), PresenceWork.id.asc()).all()
    return ok([serialize_work(item) for item in works])


@control_presence_bp.route("/nodes/<int:node_id>/works", methods=["POST"])
@control_plane_required(scopes=["presence.work.manage"])
def create_control_presence_work(node_id):
    node = PresenceNode.query.get(node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        work = create_presence_work(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.work.create", getattr(actor, "id", None), "presence_work", str(work.id), {"node_id": node.id})
        return ok(serialize_work(work), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "Presence work slug already exists for this node", 409)


@control_presence_bp.route("/works/<int:work_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.work.manage"])
def update_control_presence_work(work_id):
    work = PresenceWork.query.get(work_id)
    if not work:
        return error("not_found", "Presence work not found", 404)
    node = PresenceNode.query.get(work.node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_work(work, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.work.update", getattr(actor, "id", None), "presence_work", str(work.id), {"node_id": node.id})
        return ok(serialize_work(work))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "Presence work slug already exists for this node", 409)


@control_presence_bp.route("/works/<int:work_id>", methods=["DELETE"])
@control_plane_required(scopes=["presence.work.manage"])
def delete_control_presence_work(work_id):
    work = PresenceWork.query.get(work_id)
    if not work:
        return error("not_found", "Presence work not found", 404)
    node = PresenceNode.query.get(work.node_id)
    if not node:
        return error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return access_error
    actor = get_current_user()
    db.session.delete(work)
    db.session.commit()
    log_control_event("presence.work.delete", getattr(actor, "id", None), "presence_work", str(work_id), {"node_id": node.id})
    return ok({"deleted": True, "id": work_id})


def _control_node_by_id(node_id: int):
    node = PresenceNode.query.get(node_id)
    if not node:
        return None, error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return None, access_error
    return node, None


def _resource_node(resource, label: str):
    if not resource:
        return None, error("not_found", f"{label} not found", 404)
    node = PresenceNode.query.get(resource.node_id)
    if not node:
        return None, error("not_found", "Presence Node not found", 404)
    access_error = _require_node_control_access(node)
    if access_error:
        return None, access_error
    return node, None


@control_presence_bp.route("/nodes/<int:node_id>/services", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def list_control_presence_services(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    rows = PresenceService.query.filter_by(node_id=node.id).order_by(PresenceService.sort_order.asc(), PresenceService.id.asc()).all()
    return ok([serialize_service(item) for item in rows])


@control_presence_bp.route("/nodes/<int:node_id>/services", methods=["POST"])
@control_plane_required(scopes=["presence.service.manage"])
def create_control_presence_service(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        item = create_presence_service(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.service.create", getattr(actor, "id", None), "presence_service", str(item.id), {"node_id": node.id})
        return ok(serialize_service(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/services/<int:service_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.service.manage"])
def update_control_presence_service(service_id):
    item = PresenceService.query.get(service_id)
    node, access_error = _resource_node(item, "Presence service")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_service(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.service.update", getattr(actor, "id", None), "presence_service", str(item.id), {"node_id": node.id})
        return ok(serialize_service(item))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/services/<int:service_id>", methods=["DELETE"])
@control_plane_required(scopes=["presence.service.manage"])
def delete_control_presence_service(service_id):
    item = PresenceService.query.get(service_id)
    node, access_error = _resource_node(item, "Presence service")
    if access_error:
        return access_error
    actor = get_current_user()
    db.session.delete(item)
    db.session.commit()
    log_control_event("presence.service.delete", getattr(actor, "id", None), "presence_service", str(service_id), {"node_id": node.id})
    return ok({"deleted": True, "id": service_id})


@control_presence_bp.route("/nodes/<int:node_id>/proof", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def list_control_presence_proof(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    rows = PresenceProofItem.query.filter_by(node_id=node.id).order_by(PresenceProofItem.sort_order.asc(), PresenceProofItem.id.asc()).all()
    return ok([serialize_proof_item(item) for item in rows])


@control_presence_bp.route("/nodes/<int:node_id>/proof", methods=["POST"])
@control_plane_required(scopes=["presence.proof.manage"])
def create_control_presence_proof(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        item = create_presence_proof_item(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.proof.create", getattr(actor, "id", None), "presence_proof_item", str(item.id), {"node_id": node.id})
        return ok(serialize_proof_item(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/proof/<int:proof_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.proof.manage"])
def update_control_presence_proof(proof_id):
    item = PresenceProofItem.query.get(proof_id)
    node, access_error = _resource_node(item, "Presence proof item")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_proof_item(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.proof.update", getattr(actor, "id", None), "presence_proof_item", str(item.id), {"node_id": node.id})
        return ok(serialize_proof_item(item))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/proof/<int:proof_id>", methods=["DELETE"])
@control_plane_required(scopes=["presence.proof.manage"])
def delete_control_presence_proof(proof_id):
    item = PresenceProofItem.query.get(proof_id)
    node, access_error = _resource_node(item, "Presence proof item")
    if access_error:
        return access_error
    actor = get_current_user()
    db.session.delete(item)
    db.session.commit()
    log_control_event("presence.proof.delete", getattr(actor, "id", None), "presence_proof_item", str(proof_id), {"node_id": node.id})
    return ok({"deleted": True, "id": proof_id})


@control_presence_bp.route("/nodes/<int:node_id>/procurement", methods=["GET", "POST", "PATCH"])
@control_plane_required(scopes=["presence.procurement.manage"])
def manage_control_presence_procurement(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    if request.method == "GET":
        profile = PresenceProcurementProfile.query.filter_by(node_id=node.id).first()
        return ok(serialize_procurement_profile(profile) if profile else None)
    actor = get_current_user()
    try:
        profile = upsert_procurement_profile(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.procurement.upsert", getattr(actor, "id", None), "presence_procurement_profile", str(profile.id), {"node_id": node.id})
        return ok(serialize_procurement_profile(profile), 201 if request.method == "POST" else 200)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/nodes/<int:node_id>/nfc-tags", methods=["GET"])
@control_plane_required(scopes=["presence.connection.read"])
def list_control_presence_nfc_tags(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    rows = PresenceNfcTag.query.filter_by(node_id=node.id).order_by(PresenceNfcTag.created_at.desc(), PresenceNfcTag.id.desc()).all()
    return ok([serialize_nfc_tag(item) for item in rows])


@control_presence_bp.route("/nodes/<int:node_id>/nfc-tags", methods=["POST"])
@control_plane_required(scopes=["presence.nfc.manage"])
def create_control_presence_nfc_tag(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        item = create_presence_nfc_tag(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.nfc.create", getattr(actor, "id", None), "presence_nfc_tag", str(item.id), {"node_id": node.id})
        return ok(serialize_nfc_tag(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "NFC source code already exists for this node", 409)


@control_presence_bp.route("/nfc-tags/<int:tag_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.nfc.manage"])
def update_control_presence_nfc_tag(tag_id):
    item = PresenceNfcTag.query.get(tag_id)
    node, access_error = _resource_node(item, "Presence NFC tag")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_nfc_tag(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.nfc.update", getattr(actor, "id", None), "presence_nfc_tag", str(item.id), {"node_id": node.id})
        return ok(serialize_nfc_tag(item))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "NFC source code already exists for this node", 409)


@control_presence_bp.route("/nfc-tags/<int:tag_id>", methods=["DELETE"])
@control_plane_required(scopes=["presence.nfc.manage"])
def delete_control_presence_nfc_tag(tag_id):
    item = PresenceNfcTag.query.get(tag_id)
    node, access_error = _resource_node(item, "Presence NFC tag")
    if access_error:
        return access_error
    actor = get_current_user()
    item.is_active = False
    db.session.commit()
    log_control_event("presence.nfc.deactivate", getattr(actor, "id", None), "presence_nfc_tag", str(tag_id), {"node_id": node.id})
    return ok(serialize_nfc_tag(item))


@control_presence_bp.route("/nodes/<int:node_id>/connections", methods=["GET"])
@control_plane_required(scopes=["presence.connection.read"])
def list_control_presence_connections(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    status = request.args.get("status")
    query = PresenceConnection.query.filter_by(node_id=node.id)
    if status:
        query = query.filter(PresenceConnection.status == status)
    rows = query.order_by(PresenceConnection.last_interaction_at.desc(), PresenceConnection.id.desc()).limit(200).all()
    return ok([serialize_connection(item) for item in rows])


@control_presence_bp.route("/nodes/<int:node_id>/connections", methods=["POST"])
@control_plane_required(scopes=["presence.connection.update"])
def create_control_presence_connection(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        item = create_presence_connection(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.connection.create", getattr(actor, "id", None), "presence_connection", str(item.id), {"node_id": node.id})
        return ok(serialize_connection(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/connections/<int:connection_id>", methods=["GET"])
@control_plane_required(scopes=["presence.connection.read"])
def get_control_presence_connection(connection_id):
    item = PresenceConnection.query.get(connection_id)
    node, access_error = _resource_node(item, "Presence connection")
    if access_error:
        return access_error
    return ok(serialize_connection(item, include_interactions=True))


@control_presence_bp.route("/connections/<int:connection_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.connection.update"])
def update_control_presence_connection(connection_id):
    item = PresenceConnection.query.get(connection_id)
    node, access_error = _resource_node(item, "Presence connection")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_connection(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.connection.update", getattr(actor, "id", None), "presence_connection", str(item.id), {"node_id": node.id})
        return ok(serialize_connection(item, include_interactions=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/connections/<int:connection_id>/interactions", methods=["POST"])
@control_plane_required(scopes=["presence.connection.update"])
def create_control_presence_connection_interaction(connection_id):
    connection = PresenceConnection.query.get(connection_id)
    node, access_error = _resource_node(connection, "Presence connection")
    if access_error:
        return access_error
    actor = get_current_user()
    data = request.get_json(silent=True) or {}
    try:
        item = create_presence_interaction(
            node,
            data.get("interaction_type") or "manual_note",
            connection_id=connection.id,
            source_type=data.get("source_type") or connection.source_type,
            source_tag_id=data.get("source_tag_id") or connection.source_tag_id,
            metadata=data.get("metadata") if isinstance(data.get("metadata"), dict) else {},
        )
        db.session.commit()
        log_control_event("presence.interaction.create", getattr(actor, "id", None), "presence_interaction", str(item.id), {"node_id": node.id})
        return ok(serialize_interaction(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/nodes/<int:node_id>/quotes", methods=["GET", "POST"])
@control_plane_required(scopes=["presence.quote.manage"])
def list_or_create_control_presence_quotes(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    if request.method == "GET":
        rows = PresenceQuote.query.filter_by(node_id=node.id).order_by(PresenceQuote.updated_at.desc(), PresenceQuote.id.desc()).limit(200).all()
        return ok([serialize_quote(item) for item in rows])
    actor = get_current_user()
    try:
        item = create_presence_quote(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.quote.create", getattr(actor, "id", None), "presence_quote", str(item.id), {"node_id": node.id})
        return ok(serialize_quote(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/quotes/<int:quote_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.quote.manage"])
def update_control_presence_quote(quote_id):
    item = PresenceQuote.query.get(quote_id)
    node, access_error = _resource_node(item, "Presence quote")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_quote(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.quote.update", getattr(actor, "id", None), "presence_quote", str(item.id), {"node_id": node.id, "status": item.status})
        return ok(serialize_quote(item))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/quotes/<int:quote_id>/variations", methods=["GET", "POST"])
@control_plane_required(scopes=["presence.variation.manage"])
def list_or_create_control_presence_quote_variations(quote_id):
    quote = PresenceQuote.query.get(quote_id)
    node, access_error = _resource_node(quote, "Presence quote")
    if access_error:
        return access_error
    if request.method == "GET":
        rows = PresenceVariation.query.filter_by(quote_id=quote.id, node_id=node.id).order_by(PresenceVariation.updated_at.desc(), PresenceVariation.id.desc()).all()
        return ok([serialize_variation(item) for item in rows])
    actor = get_current_user()
    try:
        item = create_presence_variation(node, {**(request.get_json(silent=True) or {}), "quote_id": quote.id})
        db.session.commit()
        log_control_event("presence.variation.create", getattr(actor, "id", None), "presence_variation", str(item.id), {"node_id": node.id})
        return ok(serialize_variation(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/nodes/<int:node_id>/variations", methods=["GET"])
@control_plane_required(scopes=["presence.variation.manage"])
def list_control_presence_node_variations(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    rows = PresenceVariation.query.filter_by(node_id=node.id).order_by(PresenceVariation.updated_at.desc(), PresenceVariation.id.desc()).limit(200).all()
    return ok([serialize_variation(item) for item in rows])


@control_presence_bp.route("/variations/<int:variation_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.variation.manage"])
def update_control_presence_variation(variation_id):
    item = PresenceVariation.query.get(variation_id)
    node, access_error = _resource_node(item, "Presence variation")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_variation(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.variation.update", getattr(actor, "id", None), "presence_variation", str(item.id), {"node_id": node.id, "status": item.status})
        return ok(serialize_variation(item))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/nodes/<int:node_id>/invoice-support", methods=["GET", "POST"])
@control_plane_required(scopes=["presence.quote.manage"])
def list_or_create_control_presence_invoice_support(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    if request.method == "GET":
        rows = PresenceInvoiceSupport.query.filter_by(node_id=node.id).order_by(PresenceInvoiceSupport.updated_at.desc(), PresenceInvoiceSupport.id.desc()).limit(200).all()
        return ok([serialize_invoice_support(item) for item in rows])
    actor = get_current_user()
    try:
        item = create_presence_invoice_support(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.invoice_support.create", getattr(actor, "id", None), "presence_invoice_support", str(item.id), {"node_id": node.id})
        return ok(serialize_invoice_support(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/invoice-support/<int:invoice_support_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.quote.manage"])
def update_control_presence_invoice_support(invoice_support_id):
    item = PresenceInvoiceSupport.query.get(invoice_support_id)
    node, access_error = _resource_node(item, "Presence invoice support record")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_invoice_support(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.invoice_support.update", getattr(actor, "id", None), "presence_invoice_support", str(item.id), {"node_id": node.id})
        return ok(serialize_invoice_support(item))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/nodes/<int:node_id>/handovers", methods=["GET", "POST"])
@control_plane_required(scopes=["presence.handover.manage"])
def list_or_create_control_presence_handovers(node_id):
    node, access_error = _control_node_by_id(node_id)
    if access_error:
        return access_error
    if request.method == "GET":
        rows = PresenceWorkHandover.query.filter_by(node_id=node.id).order_by(PresenceWorkHandover.updated_at.desc(), PresenceWorkHandover.id.desc()).limit(200).all()
        return ok([serialize_handover(item) for item in rows])
    actor = get_current_user()
    try:
        item = create_presence_handover(node, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.handover.create", getattr(actor, "id", None), "presence_handover", str(item.id), {"node_id": node.id})
        return ok(serialize_handover(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/handovers/<int:handover_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.handover.manage"])
def update_control_presence_handover(handover_id):
    item = PresenceWorkHandover.query.get(handover_id)
    node, access_error = _resource_node(item, "Presence handover")
    if access_error:
        return access_error
    actor = get_current_user()
    try:
        update_presence_handover(item, request.get_json(silent=True) or {})
        db.session.commit()
        log_control_event("presence.handover.update", getattr(actor, "id", None), "presence_handover", str(item.id), {"node_id": node.id})
        return ok(serialize_handover(item))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/templates", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def list_control_presence_templates():
    seed_presence_templates()
    db.session.commit()
    templates = PresenceTemplate.query.order_by(PresenceTemplate.is_premium, PresenceTemplate.name).all()
    return ok(
        [
            {
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
            for template in templates
        ]
    )


def _template_payload_from_request(data: dict, *, partial: bool = False):
    if not partial and not str(data.get("name") or "").strip():
        raise PresenceValidationError("name is required")
    payload = {}
    for key in ("name", "description", "node_type", "display_mode", "preview_image_url"):
        if key in data:
            payload[key] = str(data.get(key) or "").strip() or None
    if payload.get("node_type") and payload["node_type"] not in {
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
    }:
        raise PresenceValidationError("Unsupported template node_type")
    if payload.get("display_mode") and payload["display_mode"] not in {
        "profile_card",
        "opportunity_profile",
        "premium_profile",
        "professional_contract",
        "artist_gallery",
        "minimal_portal",
        "gallery_portal",
        "practitioner_profile",
        "tradie_profile",
        "field_service_profile",
        "venue_profile",
        "organisation_profile",
        "white_label_network_entry",
    }:
        raise PresenceValidationError("Unsupported template display_mode")
    for key in ("theme_schema", "layout_schema", "section_schema"):
        if key in data:
            payload[key] = data.get(key) if isinstance(data.get(key), dict) else {}
    for key in (
        "is_active",
        "is_premium",
        "supports_landing_portal",
        "supports_collections",
        "supports_business_functions",
        "supports_tradie_functions",
        "supports_professional_contract",
    ):
        if key in data:
            payload[key] = bool(data.get(key))
    return payload


@control_presence_bp.route("/templates", methods=["POST"])
@control_plane_required(scopes=["presence.template.manage"])
def create_control_presence_template():
    actor = get_current_user()
    try:
        payload = _template_payload_from_request(request.get_json(silent=True) or {})
        template = PresenceTemplate(**payload)
        db.session.add(template)
        db.session.commit()
        log_control_event("presence.template.create", getattr(actor, "id", None), "presence_template", str(template.id), {})
        return ok({"id": template.id, **payload}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@control_presence_bp.route("/templates/<int:template_id>", methods=["PATCH"])
@control_plane_required(scopes=["presence.template.manage"])
def update_control_presence_template(template_id):
    template = PresenceTemplate.query.get(template_id)
    if not template:
        return error("not_found", "Presence template not found", 404)
    actor = get_current_user()
    try:
        payload = _template_payload_from_request(request.get_json(silent=True) or {}, partial=True)
        for key, value in payload.items():
            setattr(template, key, value)
        db.session.commit()
        log_control_event("presence.template.update", getattr(actor, "id", None), "presence_template", str(template.id), {})
        return ok(
            {
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
            }
        )
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
