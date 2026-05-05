from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..security.plane_log import emit_plane_log
from ..schemas import PublicArchiveSummaryListPayloadSchema
from ..services.archive_service import list_public_archive_summaries
from ..services.node_service import resolve_node
from ..services.white_label_site_registry import find_white_label_site_by_public_hint
from .utils import error, ok

public_archive_bp = Blueprint("public_archive", __name__, url_prefix="/public/archive")

ARCHIVE_SUMMARY_LIST_PAYLOAD_SCHEMA = PublicArchiveSummaryListPayloadSchema()


def _degraded_archive_payload(*, node_slug=None, record_type=None, title_prefix=None, page=1, page_size=24):
    return {
        "records": [],
        "pagination": {
            "model": "offset",
            "page": page,
            "page_size": page_size,
            "total_records": 0,
            "total_pages": 0,
            "has_more": False,
            "has_previous": False,
            "next_page": None,
            "previous_page": None,
            "ordering": ["updated_at:desc", "id:desc"],
        },
        "available_record_types": [],
        "applied_filters": {
            "record_type": record_type,
            "title_prefix": title_prefix,
            "node_slug": node_slug,
        },
        "applied_record_type_filter": record_type,
        "applied_title_prefix_filter": title_prefix,
        "degraded_honesty": {
            "is_degraded": True,
            "reason": "public_archive_storage_unavailable",
            "fallback": "Public archive storage is temporarily unavailable; no private or draft records are exposed.",
        },
    }


@public_archive_bp.route("/records", methods=["GET"])
@limiter.limit("120 per hour")
def list_public_archive_records_route():
    node_param = request.args.get("node")
    record_type = request.args.get("type")
    title_prefix = request.args.get("title_prefix")
    raw_page = request.args.get("page", "1")
    raw_page_size = request.args.get("page_size") or request.args.get("limit", "24")

    try:
        page = int(raw_page)
        page_size = int(raw_page_size)
    except (TypeError, ValueError):
        return error("bad_request", "page and page_size must be integers", 400)

    if page < 1 or page_size < 1:
        return error("bad_request", "page and page_size must be positive integers", 400)

    try:
        node = None
        if node_param:
            node = resolve_node(node_param)
            if not node:
                registry_site = find_white_label_site_by_public_hint(node_param)
                if registry_site:
                    payload = _degraded_archive_payload(
                        node_slug=registry_site.slug,
                        record_type=record_type,
                        title_prefix=title_prefix,
                        page=page,
                        page_size=page_size,
                    )
                    payload["degraded_honesty"]["reason"] = "tenant_node_not_bootstrapped"
                    payload["degraded_honesty"]["fallback"] = (
                        "This white-label site is registered, but its active tenant node is not bootstrapped yet."
                    )
                    return ok(ARCHIVE_SUMMARY_LIST_PAYLOAD_SCHEMA.dump(payload))
                return error("not_found", "Node not found", 404)

        payload = list_public_archive_summaries(
            node_slug=node.slug if node else None,
            record_type=record_type,
            title_prefix=title_prefix,
            page=page,
            page_size=page_size,
        )
        normalized_title_prefix = payload.get("applied_title_prefix_filter")
        emit_plane_log(
            plane="public",
            event_name="public_archive_records_listed",
            level="info",
            context={
                "route": "/public/archive/records",
                "record_count": len(payload.get("records") or []),
                "record_type_filter": record_type,
                "title_prefix_filter": title_prefix,
                "title_prefix_filter_normalized": normalized_title_prefix,
                "title_prefix_filter_guardrail_applied": normalized_title_prefix != title_prefix,
                "page": page,
                "page_size": page_size,
                "node_slug": node.slug if node else None,
                "degraded": bool((payload.get("degraded_honesty") or {}).get("is_degraded")),
            },
        )
        return ok(ARCHIVE_SUMMARY_LIST_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        emit_plane_log(
            plane="public",
            event_name="public_archive_records_list_failed",
            level="error",
            context={
                "route": "/public/archive/records",
                "record_type_filter": record_type,
                "title_prefix_filter": title_prefix,
                "page": page,
                "page_size": page_size,
            },
        )
        current_app.logger.exception("Public archive summary list failed")
        db.session.rollback()
        payload = _degraded_archive_payload(
            node_slug=node.slug if "node" in locals() and node else node_param,
            record_type=record_type,
            title_prefix=title_prefix,
            page=page,
            page_size=page_size,
        )
        return ok(ARCHIVE_SUMMARY_LIST_PAYLOAD_SCHEMA.dump(payload))
