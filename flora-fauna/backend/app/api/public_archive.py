from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..security.plane_log import emit_plane_log
from ..schemas import PublicArchiveSummaryListPayloadSchema
from ..services.archive_service import list_public_archive_summaries
from ..services.node_service import resolve_node
from .utils import error, ok

public_archive_bp = Blueprint("public_archive", __name__, url_prefix="/public/archive")

ARCHIVE_SUMMARY_LIST_PAYLOAD_SCHEMA = PublicArchiveSummaryListPayloadSchema()


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
                return error("not_found", "Node not found", 404)

        payload = list_public_archive_summaries(
            node_slug=node.slug if node else None,
            record_type=record_type,
            title_prefix=title_prefix,
            page=page,
            page_size=page_size,
        )
        emit_plane_log(
            plane="public",
            event_name="public_archive_records_listed",
            level="info",
            context={
                "route": "/public/archive/records",
                "record_count": len(payload.get("records") or []),
                "record_type_filter": record_type,
                "title_prefix_filter": title_prefix,
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
        return error("service_unavailable", "Archive summary list temporarily unavailable", 503)
