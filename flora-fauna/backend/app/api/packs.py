from datetime import datetime

from flask import Blueprint, request, g

from ..extensions import db
from ..models import (
    DiscoveryPack,
    DiscoveryPackItem,
    DiscoveryPackCompletion,
    Action,
    Event,
    ImpactCreditTx,
    Node,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from .utils import ok, error


packs_bp = Blueprint("packs", __name__, url_prefix="/packs")


def _pack_summary(pack):
    count = DiscoveryPackItem.query.filter_by(pack_id=pack.id).count()
    return {
        "id": pack.id,
        "name": pack.name,
        "description": pack.description,
        "city": pack.city,
        "country": pack.country,
        "center_lat": pack.center_lat,
        "center_lng": pack.center_lng,
        "reward_points": pack.reward_points,
        "item_count": count,
        "created_at": pack.created_at.isoformat() if pack.created_at else None,
    }


@packs_bp.route("", methods=["GET"])
def list_packs():
    query = DiscoveryPack.query
    if getattr(g, "node_id", None):
        query = query.filter_by(node_id=g.node_id)
    packs = query.order_by(DiscoveryPack.created_at.desc()).all()
    payload = [_pack_summary(p) for p in packs]
    return ok({"packs": payload})


@packs_bp.route("", methods=["POST"])
@alpha_jwt_required()
def create_pack():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return error("validation_error", "name is required", status=400)
    pack = DiscoveryPack(
        node_id=user.node_id,
        name=name[:200],
        description=(payload.get("description") or "")[:500],
        city=(payload.get("city") or "")[:100] or None,
        country=(payload.get("country") or "")[:100] or None,
        center_lat=payload.get("center_lat"),
        center_lng=payload.get("center_lng"),
        reward_points=int(payload.get("reward_points") or 0),
        created_by=user.id,
    )
    db.session.add(pack)
    db.session.commit()

    items = payload.get("items") or []
    for item in items:
        item_type = (item.get("item_type") or "").lower()
        item_id = item.get("item_id")
        if item_type in {"action", "event"} and item_id:
            db.session.add(DiscoveryPackItem(pack_id=pack.id, item_type=item_type, item_id=int(item_id)))
    db.session.commit()
    return ok(_pack_summary(pack), status=201)


@packs_bp.route("/<int:pack_id>", methods=["GET"])
def get_pack(pack_id):
    pack = DiscoveryPack.query.get_or_404(pack_id)
    if getattr(g, "node_id", None) and pack.node_id != g.node_id:
        return error("not_found", "Pack not found", status=404)
    items = DiscoveryPackItem.query.filter_by(pack_id=pack.id).all()
    action_ids = [i.item_id for i in items if i.item_type == "action"]
    event_ids = [i.item_id for i in items if i.item_type == "event"]
    actions = Action.query.filter(Action.id.in_(action_ids)).all() if action_ids else []
    events = Event.query.filter(Event.id.in_(event_ids)).all() if event_ids else []
    payload_items = [{
        "item_type": "action",
        "item": action.to_dict(),
    } for action in actions] + [{
        "item_type": "event",
        "item": event.to_dict(),
    } for event in events]
    return ok({
        "pack": _pack_summary(pack),
        "items": payload_items,
    })


@packs_bp.route("/<int:pack_id>/complete", methods=["POST"])
@alpha_jwt_required()
def complete_pack(pack_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    pack = DiscoveryPack.query.get_or_404(pack_id)
    if getattr(g, "node_id", None) and pack.node_id != g.node_id:
        return error("not_found", "Pack not found", status=404)
    existing = DiscoveryPackCompletion.query.filter_by(pack_id=pack.id, user_id=user.id).first()
    if existing:
        return ok({"completed": True, "reward_points": existing.reward_points})
    reward = int(pack.reward_points or 0)
    completion = DiscoveryPackCompletion(
        pack_id=pack.id,
        user_id=user.id,
        reward_points=reward,
    )
    db.session.add(completion)
    if reward > 0:
        default_node = Node.query.filter_by(is_default=True).first()
        node_id = user.node_id or (default_node.id if default_node else 1)
        db.session.add(ImpactCreditTx(
            user_id=user.id,
            node_id=node_id,
            tx_type="earn",
            amount=reward,
            description=f"Completed discovery pack: {pack.name}",
            reference_id=str(pack.id),
        ))
    db.session.commit()
    return ok({"completed": True, "reward_points": reward})
