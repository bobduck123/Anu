from datetime import datetime, timedelta

from ..models import EventPrimitive, db


def should_retrain(ece, brier, baseline_brier, ece_threshold, brier_degrade_pct, n_eff, min_n_eff, cooldown_days, last_retrain_at):
    if n_eff < min_n_eff:
        return False, "insufficient_sample"
    if ece <= ece_threshold:
        return False, "no_drift"
    degrade_threshold = baseline_brier * (1 + brier_degrade_pct)
    if brier <= degrade_threshold:
        return False, "no_drift"
    if last_retrain_at and datetime.utcnow() < last_retrain_at + timedelta(days=cooldown_days):
        return False, "cooldown"
    return True, "retrain"


def last_retrain_time(node_id, model_key):
    event = EventPrimitive.query.filter_by(
        node_id=node_id,
        event_type="RETRAIN_TRIGGER",
    ).order_by(EventPrimitive.timestamp.desc()).first()
    if event and (event.props or {}).get("model_key") == model_key:
        return event.timestamp
    return None


def emit_retrain_trigger(node_id, model_key, reason, actor_id=None):
    event = EventPrimitive(
        event_type="RETRAIN_TRIGGER",
        props={"model_key": model_key, "reason": reason},
        node_id=node_id,
        actor_id=actor_id,
    )
    db.session.add(event)
    db.session.commit()
    return event
