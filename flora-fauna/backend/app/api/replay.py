from flask import Blueprint, request

from ..services.replay_engine_service import replay_events
from ..security.policy import require_permission
from .utils import ok


replay_bp = Blueprint("replay", __name__, url_prefix="/replay")


@replay_bp.route("/", methods=["GET"])
@require_permission("formulas:read")
def replay():
    event_types = request.args.getlist("event_type")
    node_id = request.args.get("node_id")
    events, snapshot_hash = replay_events(event_types=event_types or None, node_id=int(node_id) if node_id else None)
    return ok({"events": events, "snapshot_hash": snapshot_hash})
