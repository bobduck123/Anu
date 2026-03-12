from datetime import datetime, timedelta

from ..models import (
    OrganiserPerformanceSnapshot,
    Event,
    Incident,
    AuditRecord,
    db,
)
from ..services.formula_registry_service import resolve_params, log_run
from ..services.trust_score_service import compute_trust_score


def _default_params():
    return {
        "period_days": 30,
        "completion_weight": 1.0,
        "attendance_weight": 0.5,
        "feedback_weight": 0.5,
    }


def compute_snapshot(user_id, node_id, actor_id=None):
    params, version = resolve_params("organiser_analytics_v1", node_id=node_id)
    cfg = {**_default_params(), **(params or {})}
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(days=int(cfg["period_days"]))

    events = Event.query.filter(
        Event.user_id == user_id,
        Event.created_at >= period_start,
        Event.created_at <= period_end,
    ).all()
    events_created = len(events)
    events_completed = len([e for e in events if e.attendees >= e.goal and e.goal > 0])
    completion_rate = (events_completed / events_created) if events_created else 0.0
    attendance_avg = (sum(e.attendees for e in events) / events_created) if events_created else 0.0

    incident_count = Incident.query.filter_by(suspended_user_id=user_id).count()
    compliance_pass_rate = len([e for e in events if e.compliance_checklist_complete]) / max(events_created, 1)

    snapshot = OrganiserPerformanceSnapshot(
        user_id=user_id,
        node_id=node_id,
        period_start=period_start,
        period_end=period_end,
        events_created=events_created,
        events_completed=events_completed,
        completion_rate=completion_rate,
        attendance_avg=attendance_avg,
        retention_rate=min(1.0, completion_rate),
        budget_variance_pct=0.0,
        incident_count=incident_count,
        compliance_checklist_pass_rate=compliance_pass_rate,
        feedback_score=0.0,
        formula_version=version,
    )
    db.session.add(snapshot)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="organiser_performance_snapshot",
        entity_type="organiser_performance_snapshot",
        entity_id=str(user_id),
        payload={"period_start": period_start.isoformat(), "period_end": period_end.isoformat()},
    ))
    db.session.commit()
    log_run("organiser_analytics_v1", version, {"user_id": user_id, "node_id": node_id}, actor_id)
    compute_trust_score(user_id)
    return snapshot
