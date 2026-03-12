from flask import Blueprint, request

from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services import privacy_service
from .utils import ok, error

privacy_bp = Blueprint("privacy", __name__, url_prefix="/privacy")


@privacy_bp.route("/export", methods=["POST"])
@alpha_jwt_required()
def request_export():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    req = privacy_service.request_data_export(user.id)
    return ok({"id": req.id, "status": req.status}, status=201)


@privacy_bp.route("/export/<int:request_id>", methods=["GET"])
@alpha_jwt_required()
def get_export_status(request_id):
    from ..models import DataExportRequest
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    req = DataExportRequest.query.get(request_id)
    if not req or req.user_id != user.id:
        return error("not_found", "Export request not found", status=404)
    return ok({
        "id": req.id,
        "status": req.status,
        "export_url": req.export_url,
        "requested_at": req.requested_at.isoformat() if req.requested_at else None,
        "completed_at": req.completed_at.isoformat() if req.completed_at else None,
    })


@privacy_bp.route("/delete", methods=["POST"])
@alpha_jwt_required()
def request_deletion():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    req = privacy_service.request_account_deletion(user.id, reason=payload.get("reason"))
    return ok({"id": req.id, "status": req.status}, status=201)


@privacy_bp.route("/delete/<int:request_id>/confirm", methods=["POST"])
@alpha_jwt_required()
def confirm_deletion(request_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    try:
        req = privacy_service.confirm_account_deletion(request_id)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"id": req.id, "status": req.status})
