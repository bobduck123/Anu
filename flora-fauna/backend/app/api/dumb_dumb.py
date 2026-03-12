from flask import Blueprint, g, request
from marshmallow import ValidationError

from ..extensions import db
from ..models import DumbDumbItem, DumbDumbList, DumbDumbPurchase
from ..schemas import (
    DumbDumbAnalyticsSchema,
    DumbDumbCheckoutSchema,
    DumbDumbItemSchema,
    DumbDumbListSchema,
    DumbDumbSourcePreviewSchema,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services import dumb_dumb_service
from .utils import error, ok


dumb_dumb_bp = Blueprint("dumb_dumb", __name__, url_prefix="/dumb-dumb")


@dumb_dumb_bp.route("/hub", methods=["GET"])
def hub():
    ensure_demo = request.args.get("demo", "1") != "0"
    payload = dumb_dumb_service.get_public_hub_payload(getattr(g, "node_id", None), ensure_demo=ensure_demo)
    return ok(payload)


@dumb_dumb_bp.route("/lists", methods=["GET"])
def list_public_lists():
    ensure_demo = request.args.get("demo", "0") == "1"
    if ensure_demo:
        dumb_dumb_service.ensure_demo_data(getattr(g, "node_id", None))
    query = DumbDumbList.query.filter_by(is_public=True, is_active=True)
    if getattr(g, "node_id", None):
        query = query.filter_by(node_id=g.node_id)
    lists = query.order_by(DumbDumbList.updated_at.desc(), DumbDumbList.created_at.desc()).all()
    return ok([dumb_dumb_service.serialize_list(row, include_items=False) for row in lists])


@dumb_dumb_bp.route("/lists/<string:list_slug>", methods=["GET"])
def get_public_list(list_slug: str):
    row = dumb_dumb_service.get_public_list_by_slug(list_slug, node_id_or_slug=getattr(g, "node_id", None))
    if not row:
        return error("not_found", "Dumb Dumb list not found", status=404)
    return ok(dumb_dumb_service.serialize_list(row, include_items=True))


@dumb_dumb_bp.route("/lists/<string:list_slug>/items/<int:item_id>", methods=["GET"])
def get_public_item(list_slug: str, item_id: int):
    item = dumb_dumb_service.get_public_item(list_slug, item_id, node_id_or_slug=getattr(g, "node_id", None))
    if not item or not item.is_active:
        return error("not_found", "Dumb Dumb item not found", status=404)
    payload = dumb_dumb_service.serialize_item(item, include_private=True)
    payload["list"] = dumb_dumb_service.serialize_list(item.list, include_items=False)
    return ok(payload)


@dumb_dumb_bp.route("/purchases/<int:purchase_id>", methods=["GET"])
def get_purchase(purchase_id: int):
    purchase = db.session.get(DumbDumbPurchase, purchase_id)
    if not purchase:
        return error("not_found", "Purchase not found", status=404)
    return ok(dumb_dumb_service.serialize_purchase(purchase))


@dumb_dumb_bp.route("/analytics", methods=["POST"])
def analytics():
    payload = request.get_json() or {}
    try:
        data = DumbDumbAnalyticsSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    try:
        dumb_dumb_service.record_analytics_event(
            event_name=data["event_name"],
            props=data.get("props"),
            entity_type=data.get("entity_type"),
            entity_id=data.get("entity_id"),
            user=get_current_user(),
            node_id=getattr(g, "node_id", None),
        )
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"captured": True}, status=201)


@dumb_dumb_bp.route("/source-preview", methods=["POST"])
@alpha_jwt_required()
def source_preview():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    try:
        data = DumbDumbSourcePreviewSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    try:
        preview = dumb_dumb_service.preview_source_listing(data["source_url"], actor_id=user.id, node_id=user.node_id)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok(preview)


@dumb_dumb_bp.route("/checkout", methods=["POST"])
def checkout():
    payload = request.get_json() or {}
    try:
        data = DumbDumbCheckoutSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    item = db.session.get(DumbDumbItem, data["item_id"])
    if not item:
        return error("not_found", "Dumb Dumb item not found", status=404)
    try:
        result = dumb_dumb_service.start_checkout(
            item=item,
            buyer=get_current_user(),
            success_url=data.get("success_url"),
            cancel_url=data.get("cancel_url"),
            mode=data.get("mode") or "live",
        )
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok(result, status=201)


@dumb_dumb_bp.route("/me/lists", methods=["GET"])
@alpha_jwt_required()
def my_lists():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    rows = dumb_dumb_service.list_lists_for_user(user)
    return ok([dumb_dumb_service.serialize_list(row, include_items=True, include_private=True) for row in rows])


@dumb_dumb_bp.route("/lists", methods=["POST"])
@alpha_jwt_required()
def create_list():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    try:
        data = DumbDumbListSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    row = dumb_dumb_service.create_or_update_list(user, data)
    return ok(dumb_dumb_service.serialize_list(row, include_items=True, include_private=True), status=201)


@dumb_dumb_bp.route("/lists/<int:list_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_list(list_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    row = db.session.get(DumbDumbList, list_id)
    if not row:
        return error("not_found", "List not found", status=404)
    payload = request.get_json() or {}
    try:
        data = DumbDumbListSchema(partial=True).load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    current = dumb_dumb_service.serialize_list(row, include_items=False, include_private=True)
    current.update({k: v for k, v in data.items() if v is not None})
    try:
        updated = dumb_dumb_service.create_or_update_list(user, current, list_row=row)
    except PermissionError as exc:
        return error("forbidden", str(exc), status=403)
    return ok(dumb_dumb_service.serialize_list(updated, include_items=True, include_private=True))


@dumb_dumb_bp.route("/lists/<int:list_id>/items", methods=["POST"])
@alpha_jwt_required()
def create_item(list_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    row = db.session.get(DumbDumbList, list_id)
    if not row:
        return error("not_found", "List not found", status=404)
    payload = request.get_json() or {}
    try:
        data = DumbDumbItemSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    try:
        item = dumb_dumb_service.create_or_update_item(user, row, data)
    except PermissionError as exc:
        return error("forbidden", str(exc), status=403)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok(dumb_dumb_service.serialize_item(item, include_private=True), status=201)


@dumb_dumb_bp.route("/items/<int:item_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_item(item_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    item = db.session.get(DumbDumbItem, item_id)
    if not item:
        return error("not_found", "Item not found", status=404)
    payload = request.get_json() or {}
    try:
        data = DumbDumbItemSchema(partial=True).load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    current = dumb_dumb_service.serialize_item(item, include_private=True)
    current.update({k: v for k, v in data.items() if v is not None})
    current["mutual_aid_pool_id"] = data.get("mutual_aid_pool_id", current["destination_pool"]["id"])
    try:
        updated = dumb_dumb_service.create_or_update_item(user, item.list, current, item=item)
    except PermissionError as exc:
        return error("forbidden", str(exc), status=403)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok(dumb_dumb_service.serialize_item(updated, include_private=True))


@dumb_dumb_bp.route("/admin/purchases", methods=["GET"])
@require_permission("ledger:read")
def admin_purchases():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    rows = dumb_dumb_service.list_admin_purchases(user, status=request.args.get("status"))
    return ok(rows)
