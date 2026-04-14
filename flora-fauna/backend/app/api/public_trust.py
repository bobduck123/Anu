from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..security.plane_log import emit_plane_log
from ..schemas import (
    PublicDecisionSummaryDetailPayloadSchema,
    PublicDecisionSummaryListPayloadSchema,
    PublicTrustReportDetailPayloadSchema,
    PublicTrustReportListPayloadSchema,
)
from ..services.decision_register_service import get_public_decision_summary, list_public_decision_summaries
from ..services.node_service import resolve_node
from ..services.trust_report_service import get_public_trust_report_detail, list_public_trust_reports
from .utils import error, ok

public_trust_bp = Blueprint("public_trust", __name__, url_prefix="/public/trust")

TRUST_REPORT_LIST_PAYLOAD_SCHEMA = PublicTrustReportListPayloadSchema()
TRUST_REPORT_DETAIL_PAYLOAD_SCHEMA = PublicTrustReportDetailPayloadSchema()
DECISION_SUMMARY_LIST_PAYLOAD_SCHEMA = PublicDecisionSummaryListPayloadSchema()
DECISION_SUMMARY_DETAIL_PAYLOAD_SCHEMA = PublicDecisionSummaryDetailPayloadSchema()


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
        emit_plane_log(
            plane="public",
            event_name="public_trust_reports_listed",
            level="info",
            context={
                "route": "/public/trust/reports",
                "report_count": len(payload.get("reports") or []),
                "limit": limit,
                "node_slug": node.slug if node else None,
                "degraded": bool((payload.get("degraded_honesty") or {}).get("is_degraded")),
            },
        )
        return ok(TRUST_REPORT_LIST_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        emit_plane_log(
            plane="public",
            event_name="public_trust_reports_list_failed",
            level="error",
            context={
                "route": "/public/trust/reports",
                "limit": limit,
                "node": node_param,
            },
        )
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

        emit_plane_log(
            plane="public",
            event_name="public_trust_report_detail_read",
            level="info",
            context={
                "route": "/public/trust/reports/:report_ref",
                "report_ref": report_ref,
            },
        )
        return ok(TRUST_REPORT_DETAIL_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        emit_plane_log(
            plane="public",
            event_name="public_trust_report_detail_failed",
            level="error",
            context={
                "route": "/public/trust/reports/:report_ref",
                "report_ref": report_ref,
            },
        )
        current_app.logger.exception("Public trust report detail failed for ref %s", report_ref)
        db.session.rollback()
        return error("service_unavailable", "Trust report temporarily unavailable", 503)


@public_trust_bp.route("/decisions", methods=["GET"])
@limiter.limit("120 per hour")
def list_public_decisions_route():
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

        payload = list_public_decision_summaries(node_slug=node.slug if node else None, limit=limit)
        emit_plane_log(
            plane="public",
            event_name="public_decision_summaries_listed",
            level="info",
            context={
                "route": "/public/trust/decisions",
                "decision_count": len(payload.get("decisions") or []),
                "limit": limit,
                "node_slug": node.slug if node else None,
                "degraded": bool((payload.get("degraded_honesty") or {}).get("is_degraded")),
            },
        )
        return ok(DECISION_SUMMARY_LIST_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        emit_plane_log(
            plane="public",
            event_name="public_decision_summaries_list_failed",
            level="error",
            context={
                "route": "/public/trust/decisions",
                "limit": limit,
                "node": node_param,
            },
        )
        current_app.logger.exception("Public decision summary list failed")
        db.session.rollback()
        return error("service_unavailable", "Decision summary list temporarily unavailable", 503)


@public_trust_bp.route("/decisions/<decision_ref>", methods=["GET"])
@limiter.limit("120 per hour")
def get_public_decision_route(decision_ref: str):
    node_param = request.args.get("node")

    try:
        node = None
        if node_param:
            node = resolve_node(node_param)
            if not node:
                return error("not_found", "Node not found", 404)

        decision = get_public_decision_summary(decision_ref, node_slug=node.slug if node else None)
        if decision is None:
            return error("not_found", "Decision summary not found", 404)

        emit_plane_log(
            plane="public",
            event_name="public_decision_summary_detail_read",
            level="info",
            context={
                "route": "/public/trust/decisions/:decision_ref",
                "decision_ref": decision_ref,
                "node_slug": node.slug if node else None,
            },
        )
        return ok(
            DECISION_SUMMARY_DETAIL_PAYLOAD_SCHEMA.dump(
                {
                    "decision": decision,
                    "degraded_honesty": {
                        "is_degraded": False,
                        "reason": None,
                        "fallback": None,
                    },
                }
            )
        )
    except Exception:
        emit_plane_log(
            plane="public",
            event_name="public_decision_summary_detail_failed",
            level="error",
            context={
                "route": "/public/trust/decisions/:decision_ref",
                "decision_ref": decision_ref,
                "node": node_param,
            },
        )
        current_app.logger.exception("Public decision summary detail failed for ref %s", decision_ref)
        db.session.rollback()
        return error("service_unavailable", "Decision summary temporarily unavailable", 503)
