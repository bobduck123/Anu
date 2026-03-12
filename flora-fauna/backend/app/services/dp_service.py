from datetime import datetime

from ..models import EpsilonBudget, EpsilonConsumption, AuditRecord, db


def _ensure_budget(node_id):
    budget = EpsilonBudget.query.filter_by(node_id=node_id).first()
    if not budget:
        budget = EpsilonBudget(
            node_id=node_id,
            epsilon_total=1.0,
            epsilon_spent=0.0,
            epsilon_annual_limit=1.0,
            annual_reset_at=datetime.utcnow().replace(year=datetime.utcnow().year + 1),
        )
        db.session.add(budget)
        db.session.commit()
    return budget


def _reset_if_needed(budget):
    if not budget.annual_reset_at:
        return
    if datetime.utcnow() >= budget.annual_reset_at:
        budget.epsilon_spent = 0.0
        budget.annual_reset_at = datetime.utcnow().replace(year=datetime.utcnow().year + 1)


def consume_epsilon(node_id, epsilon, sensitivity, query_key=None, clipping_rule=None, purpose=None, scope="annual", actor_id=None):
    budget = _ensure_budget(node_id)
    _reset_if_needed(budget)

    epsilon = float(epsilon)
    sensitivity = float(sensitivity)

    if epsilon <= 0:
        raise ValueError("epsilon must be > 0")
    if sensitivity <= 0:
        raise ValueError("sensitivity must be > 0")

    if budget.epsilon_spent + epsilon > budget.epsilon_annual_limit:
        raise ValueError("Epsilon annual limit exceeded")

    before = budget.epsilon_spent
    budget.epsilon_spent += epsilon
    after = budget.epsilon_spent

    consumption = EpsilonConsumption(
        node_id=node_id,
        epsilon=epsilon,
        purpose=purpose,
        query_key=query_key,
        sensitivity=sensitivity,
        clipping_rule=clipping_rule,
        epsilon_before=before,
        epsilon_after=after,
        epsilon_annual_limit=budget.epsilon_annual_limit,
        scope=scope,
    )
    db.session.add(consumption)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="dp_epsilon_consumed",
        entity_type="epsilon_consumption",
        entity_id=str(node_id),
        payload={
            "epsilon": epsilon,
            "sensitivity": sensitivity,
            "query_key": query_key,
            "clipping_rule": clipping_rule,
            "scope": scope,
        },
    ))
    db.session.commit()
    return consumption, budget
