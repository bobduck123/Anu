from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..security.alpha import alpha_jwt_required
from ..services import feature_flag_service
from ..models import FeatureFlag
from .utils import ok, error

feature_flags_bp = Blueprint("feature_flags", __name__, url_prefix="/feature-flags")


@feature_flags_bp.route("", methods=["GET"])
@require_permission("feature_flags:read")
def list_flags():
    flags = feature_flag_service.get_all_flags()
    return ok({"flags": [{
        "id": f.id,
        "name": f.name,
        "description": f.description,
        "enabled": f.enabled,
        "rollout_percentage": f.rollout_percentage,
        "allowed_roles": f.allowed_roles,
        "activated_at": f.activated_at.isoformat() if f.activated_at else None,
        "notes": f.notes,
    } for f in flags]})


@feature_flags_bp.route("/<flag_name>/check", methods=["GET"])
@alpha_jwt_required()
def check_flag(flag_name):
    user = get_current_user()
    role = user.role if user else None
    enabled = feature_flag_service.is_enabled(flag_name, user_role=role)
    return ok({"flag": flag_name, "enabled": enabled})


@feature_flags_bp.route("", methods=["POST"])
@require_permission("feature_flags:manage")
def set_flag():
    payload = request.get_json() or {}
    name = payload.get("name")
    if not name:
        return error("validation_error", "name required", status=400)
    flag = feature_flag_service.set_flag(
        name=name,
        enabled=payload.get("enabled", False),
        description=payload.get("description"),
        rollout_percentage=float(payload.get("rollout_percentage", 0)),
        allowed_roles=payload.get("allowed_roles"),
        notes=payload.get("notes"),
    )
    return ok({"id": flag.id, "name": flag.name, "enabled": flag.enabled}, status=201)
