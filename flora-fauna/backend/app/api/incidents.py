from datetime import datetime

from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..security.alpha import alpha_jwt_required
from ..models import Incident, AuditLog, db
from .utils import ok, error

incidents_bp = Blueprint("incidents", __name__, url_prefix="/incidents")


@incidents_bp.route("", methods=["GET"])
@require_permission("incidents:read")
def list_incidents():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    incidents = Incident.query.filter_by(node_id=user.node_id).order_by(
        Incident.created_at.desc()
    ).limit(50).all()
    return ok({"incidents": [{
        "id": i.id,
        "severity": i.severity,
        "title": i.title,
        "status": i.status,
        "event_id": i.event_id,
        "event_frozen": i.event_frozen,
        "escrow_frozen": i.escrow_frozen,
        "organizer_suspended": i.organizer_suspended,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    } for i in incidents]})


@incidents_bp.route("", methods=["POST"])
@require_permission("incidents:create")
def create_incident():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    severity = payload.get("severity", "medium")
    if severity not in ("low", "medium", "high", "critical"):
        return error("validation_error", "Invalid severity", status=400)

    incident = Incident(
        node_id=user.node_id,
        event_id=payload.get("event_id"),
        reported_by=user.id,
        severity=severity,
        title=payload.get("title", ""),
        description=payload.get("description"),
        event_frozen=payload.get("freeze_event", False),
        escrow_frozen=payload.get("freeze_escrow", False),
        organizer_suspended=payload.get("suspend_organizer", False),
        suspended_user_id=payload.get("suspended_user_id"),
    )
    db.session.add(incident)

    audit = AuditLog(
        event="incident_created",
        actor_id=user.id,
        entity_type="incident",
        metadata_json={"severity": severity, "title": incident.title},
        node_id=user.node_id,
    )
    db.session.add(audit)
    db.session.commit()
    return ok({"id": incident.id, "status": incident.status}, status=201)


@incidents_bp.route("/<int:incident_id>/resolve", methods=["POST"])
@require_permission("incidents:resolve")
def resolve_incident(incident_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    incident = Incident.query.get(incident_id)
    if not incident:
        return error("not_found", "Incident not found", status=404)

    payload = request.get_json() or {}
    incident.status = "resolved"
    incident.resolution_notes = payload.get("resolution_notes", "")
    incident.resolved_at = datetime.utcnow()
    incident.event_frozen = False
    incident.escrow_frozen = False
    incident.organizer_suspended = False

    audit = AuditLog(
        event="incident_resolved",
        actor_id=user.id,
        entity_type="incident",
        entity_id=str(incident.id),
        node_id=incident.node_id,
    )
    db.session.add(audit)
    db.session.commit()
    return ok({"id": incident.id, "status": incident.status})


@incidents_bp.route("/<int:incident_id>/assign-review", methods=["POST"])
@require_permission("incidents:resolve")
def assign_review(incident_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    incident = Incident.query.get(incident_id)
    if not incident:
        return error("not_found", "Incident not found", status=404)

    payload = request.get_json() or {}
    reviewer_id = payload.get("reviewer_id")
    if not reviewer_id:
        return error("validation_error", "reviewer_id required", status=400)

    incident.review_assigned_to = int(reviewer_id)
    incident.status = "investigating"
    db.session.commit()
    return ok({"id": incident.id, "review_assigned_to": incident.review_assigned_to})
