from datetime import datetime, timedelta
import math

from ..models import Event, CollisionCheck, AuditRecord, db
from ..services.formula_registry_service import resolve_params, log_run


def _default_params():
    return {
        "time_window_hours": 4,
        "distance_km": 5,
        "score_threshold": 60,
        "hard_stop_threshold": 85,
        "weights": {
            "time_overlap": 30,
            "distance_overlap": 25,
            "domain_overlap": 20,
            "audience_overlap": 10,
            "capacity_stress": 15,
        },
    }


def _haversine(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    r = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def check_collision(event_payload, actor_id=None):
    params, version = resolve_params("collision_score_v1")
    cfg = {**_default_params(), **(params or {})}

    time_window = timedelta(hours=cfg["time_window_hours"])
    event_time = event_payload.get("date")
    if event_time and event_payload.get("time"):
        event_time = datetime.combine(event_payload["date"], event_payload["time"])
    else:
        event_time = None

    candidates = Event.query.all()
    score = 0.0
    reasons = []

    for existing in candidates:
        if event_time and existing.date:
            existing_time = datetime.combine(existing.date, existing.time)
            if abs(existing_time - event_time) <= time_window:
                score += cfg["weights"]["time_overlap"]
                reasons.append("time_overlap")

        dist = _haversine(existing.latitude, existing.longitude, event_payload.get("latitude"), event_payload.get("longitude"))
        if dist is not None and dist <= cfg["distance_km"]:
            score += cfg["weights"]["distance_overlap"]
            reasons.append("distance_overlap")

        if existing.city and event_payload.get("city") and existing.city == event_payload.get("city"):
            score += cfg["weights"]["audience_overlap"]
            reasons.append("audience_overlap")

    score = min(100.0, score)
    log_run("collision_score_v1", version, {"score": score}, actor_id)
    return score, reasons, version, cfg


def record_collision(event_id, score, reasons, version, actor_id=None, acknowledged_by=None):
    check = CollisionCheck(
        event_id=event_id,
        score=score,
        reasons_json=reasons,
        formula_version=version,
        acknowledged_by_user_id=acknowledged_by,
    )
    db.session.add(check)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="collision_check_recorded",
        entity_type="collision_check",
        entity_id=str(event_id),
        payload={"score": score, "reasons": reasons, "formula_version": version},
    ))
    db.session.commit()
    return check


def create_review(event_id, actor_id=None, status="pending", notes=None):
    from ..models import CollisionReview
    review = CollisionReview(
        event_id=event_id,
        status=status,
        reviewer_user_id=actor_id,
        notes=notes,
    )
    db.session.add(review)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="collision_review_created",
        entity_type="collision_review",
        entity_id=str(event_id),
    ))
    db.session.commit()
    return review
