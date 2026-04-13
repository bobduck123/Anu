from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..schemas import PublicTrustReportDetailPayloadSchema, PublicTrustReportListPayloadSchema
from ..services.node_service import resolve_node
from ..services.trust_report_service import get_public_trust_report_detail, list_public_trust_reports
from .utils import error, ok

public_trust_bp = Blueprint("public_trust", __name__, url_prefix="/public/trust")

TRUST_REPORT_LIST_PAYLOAD_SCHEMA = PublicTrustReportListPayloadSchema()
TRUST_REPORT_DETAIL_PAYLOAD_SCHEMA = PublicTrustReportDetailPayloadSchema()


@public_trust_bp.route("/reports", methods=["GET"])
@limiter.limit("120 per hour")
def list_public_trust_reports_route():
    node_param = request.args.get("node")
    raw_limit = request.args.get("limit", "30")

    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return error("bad_request", "limit must be an integer", 400)

    try:
        node = None
        if node_param:
            node = resolve_node(node_param)
            if not node:
                return error("not_found", "Node not found", 404)

        payload = list_public_trust_reports(node_slug=node.slug if node else None, limit=limit)
        return ok(TRUST_REPORT_LIST_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public trust report list failed")
        db.session.rollback()
        return error("service_unavailable", "Trust report list temporarily unavailable", 503)


@public_trust_bp.route("/reports/<report_ref>", methods=["GET"])
@limiter.limit("120 per hour")
def get_public_trust_report_route(report_ref: str):
    try:
        payload = get_public_trust_report_detail(report_ref)
        if not payload:
            return error("not_found", "Trust report not found", 404)

        return ok(TRUST_REPORT_DETAIL_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public trust report detail failed for ref %s", report_ref)
        db.session.rollback()
        return error("service_unavailable", "Trust report temporarily unavailable", 503)
