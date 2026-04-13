from __future__ import annotations

from flask import Blueprint, current_app, request

from ..extensions import db, limiter
from ..schemas import (
    PublicArchiveHandoffPayloadSchema,
    PublicConnectorPayloadSchema,
    PublicJourneyPayloadSchema,
)
from ..services.connector_service import (
    build_public_archive_handoff_payload,
    build_public_journey_payload,
    ensure_flagship_journey_payload,
)
from ..services.node_service import resolve_node
from .utils import error, ok

public_connectors_bp = Blueprint("public_connectors", __name__, url_prefix="/public")

CONNECTOR_PAYLOAD_SCHEMA = PublicConnectorPayloadSchema()
JOURNEY_PAYLOAD_SCHEMA = PublicJourneyPayloadSchema()
ARCHIVE_HANDOFF_PAYLOAD_SCHEMA = PublicArchiveHandoffPayloadSchema()


@public_connectors_bp.route("/connectors", methods=["GET"])
@limiter.limit("120 per hour")
def get_public_connectors():
    source_route = request.args.get("source_route") or request.args.get("source")
    node_param = request.args.get("node")

    try:
        node = resolve_node(node_param)
        payload = ensure_flagship_journey_payload(source_route=source_route or "", node_override=node)
        if not payload:
            return error("not_found", "Node not found", 404)

        return ok(CONNECTOR_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public connector payload failed")
        db.session.rollback()
        return error("service_unavailable", "Connector substrate temporarily unavailable", 503)


@public_connectors_bp.route("/journeys/<slug>", methods=["GET"])
@limiter.limit("120 per hour")
def get_public_journey(slug: str):
    source_route = request.args.get("source_route") or request.args.get("source")
    node_param = request.args.get("node")

    try:
        node = resolve_node(node_param)
        payload = build_public_journey_payload(slug, source_route=source_route or "", node_override=node)
        if not payload:
            return error("not_found", "Journey not found", 404)

        return ok(JOURNEY_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public journey payload failed for slug %s", slug)
        db.session.rollback()
        return error("service_unavailable", "Journey projection temporarily unavailable", 503)


@public_connectors_bp.route("/archive-handoffs/<slug>", methods=["GET"])
@limiter.limit("120 per hour")
def get_public_archive_handoff(slug: str):
    try:
        payload = build_public_archive_handoff_payload(slug)
        if not payload:
            return error("not_found", "Archive handoff not found", 404)

        return ok(ARCHIVE_HANDOFF_PAYLOAD_SCHEMA.dump(payload))
    except Exception:
        current_app.logger.exception("Public archive handoff payload failed for slug %s", slug)
        db.session.rollback()
        return error("service_unavailable", "Archive handoff temporarily unavailable", 503)
