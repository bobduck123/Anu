from flask import Blueprint, request

from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.institutional_mode_service import get_config, set_config, create_observer, export_governance_votes
from .utils import ok, error


institutional_bp = Blueprint("institutional", __name__, url_prefix="/institutional")


@institutional_bp.route("/config", methods=["GET", "POST"])
@require_permission("institutional:manage")
def config():
    if not is_enabled("institutional_mode"):
        return error("disabled", "Institutional mode disabled", status=403)
    user = get_current_user()
    node_id = (user.node_id if user else None) or 1
    if request.method == "GET":
        cfg = get_config(node_id)
        return ok({
            "config": {
                "enabled": cfg.enabled,
                "quorum_min": cfg.quorum_min,
                "external_observer_enabled": cfg.external_observer_enabled,
                "extended_audit_logging": cfg.extended_audit_logging,
                "worm_audit_suggestion": cfg.worm_audit_suggestion,
            }
        })
    payload = request.get_json() or {}
    cfg = set_config(node_id, payload, actor_id=user.id if user else None)
    return ok({
        "config": {
            "enabled": cfg.enabled,
            "quorum_min": cfg.quorum_min,
            "external_observer_enabled": cfg.external_observer_enabled,
            "extended_audit_logging": cfg.extended_audit_logging,
            "worm_audit_suggestion": cfg.worm_audit_suggestion,
        }
    })


@institutional_bp.route("/status", methods=["GET"])
@require_permission("institutional:read")
def status():
    if not is_enabled("institutional_mode"):
        return error("disabled", "Institutional mode disabled", status=403)
    user = get_current_user()
    node_id = (user.node_id if user else None) or 1
    cfg = get_config(node_id)
    return ok({
        "enabled": cfg.enabled,
        "quorum_min": cfg.quorum_min,
        "external_observer_enabled": cfg.external_observer_enabled,
    })


@institutional_bp.route("/observers", methods=["POST"])
@require_permission("institutional:manage")
def add_observer():
    if not is_enabled("institutional_mode"):
        return error("disabled", "Institutional mode disabled", status=403)
    user = get_current_user()
    payload = request.get_json() or {}
    node_id = (user.node_id if user else None) or 1
    seat = create_observer(
        node_id=node_id,
        name=payload.get("name"),
        organization=payload.get("organization"),
        email=payload.get("email"),
        actor_id=user.id if user else None,
    )
    return ok({"id": seat.id}, status=201)


@institutional_bp.route("/vote-export", methods=["GET"])
@require_permission("institutional:read")
def vote_export():
    if not is_enabled("institutional_mode"):
        return error("disabled", "Institutional mode disabled", status=403)
    user = get_current_user()
    node_id = (user.node_id if user else None) or 1
    payload = export_governance_votes(node_id)
    return ok(payload)
