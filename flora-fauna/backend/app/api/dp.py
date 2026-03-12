from flask import Blueprint, request

from ..models import EpsilonBudget, AuditRecord, db
from ..services.dp_service import consume_epsilon
from ..security.policy import require_permission, get_current_user
from .utils import ok, error


dp_bp = Blueprint("dp", __name__, url_prefix="/dp")


@dp_bp.route("/budget", methods=["GET", "POST"])
@require_permission("formulas:manage")
def budget():
    user = get_current_user()
    node_id = user.node_id if user else None
    if request.method == "GET":
        budget = EpsilonBudget.query.filter_by(node_id=node_id).first()
        if not budget:
            budget = EpsilonBudget(node_id=node_id, epsilon_total=1.0, epsilon_spent=0.0, epsilon_annual_limit=1.0)
            db.session.add(budget)
            db.session.commit()
        return ok({
            "epsilon_total": budget.epsilon_total,
            "epsilon_spent": budget.epsilon_spent,
            "epsilon_annual_limit": budget.epsilon_annual_limit,
            "annual_reset_at": budget.annual_reset_at.isoformat() if budget.annual_reset_at else None,
        })
    payload = request.get_json() or {}
    budget = EpsilonBudget.query.filter_by(node_id=node_id).first()
    if not budget:
        budget = EpsilonBudget(node_id=node_id)
        db.session.add(budget)
    budget.epsilon_total = float(payload.get("epsilon_total", budget.epsilon_total))
    budget.epsilon_annual_limit = float(payload.get("epsilon_annual_limit", budget.epsilon_annual_limit))
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="dp_budget_updated",
        entity_type="epsilon_budget",
        entity_id=str(node_id),
    ))
    db.session.commit()
    return ok({"epsilon_total": budget.epsilon_total, "epsilon_spent": budget.epsilon_spent, "epsilon_annual_limit": budget.epsilon_annual_limit})


@dp_bp.route("/consume", methods=["POST"])
@require_permission("formulas:manage")
def consume():
    user = get_current_user()
    payload = request.get_json() or {}
    epsilon = float(payload.get("epsilon", 0.0))
    sensitivity = float(payload.get("sensitivity", 1.0))
    node_id = user.node_id if user else None
    try:
        consumption, budget = consume_epsilon(
            node_id=node_id,
            epsilon=epsilon,
            sensitivity=sensitivity,
            query_key=payload.get("query_key"),
            clipping_rule=payload.get("clipping_rule"),
            purpose=payload.get("purpose"),
            scope=payload.get("scope", "annual"),
            actor_id=user.id if user else None,
        )
    except ValueError as exc:
        return error("budget_exceeded", str(exc), status=400)
    return ok({
        "epsilon_spent": budget.epsilon_spent,
        "epsilon_consumed": consumption.epsilon,
        "epsilon_before": consumption.epsilon_before,
        "epsilon_after": consumption.epsilon_after,
    })
