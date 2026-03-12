from ..models import OrganizerLoadSnapshot, OrganiserBurnoutSnapshot, AuditRecord, db
from ..services.formula_registry_service import resolve_params, log_run


def _default_params():
    return {
        "load_threshold": 20.0,
        "risk_mid": 1.2,
        "risk_high": 1.6,
    }


def compute_burnout(user_id, node_id, actor_id=None):
    params, version = resolve_params("burnout_index_v1", node_id=node_id)
    cfg = {**_default_params(), **(params or {})}
    latest = OrganizerLoadSnapshot.query.filter_by(user_id=user_id).order_by(
        OrganizerLoadSnapshot.created_at.desc()
    ).first()
    load_score = latest.load_score if latest else 0.0
    ratio = load_score / max(cfg["load_threshold"], 1)
    if ratio >= cfg["risk_high"]:
        risk = "high"
    elif ratio >= cfg["risk_mid"]:
        risk = "elevated"
    else:
        risk = "low"
    snap = OrganiserBurnoutSnapshot(
        user_id=user_id,
        node_id=node_id,
        load_score=load_score,
        burnout_risk=risk,
        formula_version=version,
    )
    db.session.add(snap)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="burnout_index_snapshot",
        entity_type="organiser_burnout_snapshot",
        entity_id=str(user_id),
        payload={"risk": risk, "load_score": load_score},
    ))
    db.session.commit()
    log_run("burnout_index_v1", version, {"user_id": user_id, "node_id": node_id}, actor_id)
    return snap
