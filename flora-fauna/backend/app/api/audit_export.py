from flask import Blueprint, Response

from ..security.policy import require_permission, get_current_user
from ..services import audit_export_service
from .utils import ok, error
import json

audit_export_bp = Blueprint("audit_export", __name__, url_prefix="/audit-export")


@audit_export_bp.route("/treasury", methods=["GET"])
@require_permission("audit:export")
def export_treasury_json():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = audit_export_service.export_treasury(user.node_id)
    return ok(data)


@audit_export_bp.route("/treasury/csv", methods=["GET"])
@require_permission("audit:export")
def export_treasury_csv():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    csv_data = audit_export_service.export_treasury_csv(user.node_id)
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=treasury_export.csv"},
    )


@audit_export_bp.route("/certifications", methods=["GET"])
@require_permission("audit:export")
def export_certifications():
    data = audit_export_service.export_certifications()
    return ok(data)


@audit_export_bp.route("/governance-votes", methods=["GET"])
@require_permission("audit:export")
def export_governance_votes():
    data = audit_export_service.export_governance_votes()
    return ok(data)


@audit_export_bp.route("/incidents", methods=["GET"])
@require_permission("audit:export")
def export_incidents():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = audit_export_service.export_incidents(user.node_id)
    return ok(data)


@audit_export_bp.route("/assets", methods=["GET"])
@require_permission("audit:export")
def export_assets():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = audit_export_service.export_asset_registry(user.node_id)
    return ok(data)


@audit_export_bp.route("/role-rotation", methods=["GET"])
@require_permission("audit:export")
def export_role_rotation():
    data = audit_export_service.export_role_rotation()
    return ok(data)


@audit_export_bp.route("/needs-signals", methods=["GET"])
@require_permission("audit:export")
def export_needs_signals():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = audit_export_service.export_needs_signals(user.node_id)
    return ok(data)


@audit_export_bp.route("/competency-profiles", methods=["GET"])
@require_permission("audit:export")
def export_competency_profiles():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = audit_export_service.export_competency_profiles(user.node_id)
    return ok(data)


@audit_export_bp.route("/guilds", methods=["GET"])
@require_permission("audit:export")
def export_guilds():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = audit_export_service.export_guilds(user.node_id)
    return ok(data)


@audit_export_bp.route("/formula-configs", methods=["GET"])
@require_permission("audit:export")
def export_formula_configs():
    data = audit_export_service.export_formula_configs()
    return ok(data)


@audit_export_bp.route("/collision-checks", methods=["GET"])
@require_permission("audit:export")
def export_collision_checks():
    data = audit_export_service.export_collision_checks()
    return ok(data)


@audit_export_bp.route("/collision-reviews", methods=["GET"])
@require_permission("audit:export")
def export_collision_reviews():
    data = audit_export_service.export_collision_reviews()
    return ok(data)


@audit_export_bp.route("/burnout-snapshots", methods=["GET"])
@require_permission("audit:export")
def export_burnout_snapshots():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = audit_export_service.export_burnout_snapshots(user.node_id)
    return ok(data)


@audit_export_bp.route("/metric-definitions", methods=["GET"])
@require_permission("audit:export")
def export_metric_definitions():
    data = audit_export_service.export_metric_definitions()
    return ok(data)


@audit_export_bp.route("/model-configs", methods=["GET"])
@require_permission("audit:export")
def export_model_configs():
    data = audit_export_service.export_model_configs()
    return ok(data)
