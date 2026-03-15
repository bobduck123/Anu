from flask import Blueprint, request, g
from marshmallow import ValidationError
from ..security.alpha import alpha_jwt_required

from ..models import MembershipPlan, Subscription, db
from ..services.node_service import resolve_node
from ..services.payments_service import create_checkout_session
from ..security.policy import get_current_user, require_role
from ..schemas import MembershipPlanSchema, CheckoutSessionSchema
from .utils import ok, error


memberships_bp = Blueprint("memberships", __name__, url_prefix="/memberships")
BLOCKED_SUBSCRIPTION_STATUSES = {"pending", "active", "trialing", "past_due", "unpaid", "incomplete"}


@memberships_bp.route("/plans", methods=["GET"])
def list_plans():
    query = MembershipPlan.query.filter_by(is_active=True)
    if getattr(g, "node_id", None):
        query = query.filter_by(node_id=g.node_id)
    plans = query.all()
    data = [
        {
            "id": plan.id,
            "name": plan.name,
            "amount_cents": plan.amount_cents,
            "credit_grant_monthly": plan.credit_grant_monthly,
            "pool_allocation_pct": plan.pool_allocation_pct,
            "stripe_price_id": plan.stripe_price_id,
        }
        for plan in plans
    ]
    return ok(data)


@memberships_bp.route("/plans", methods=["POST"])
@require_role("node_admin", "platform_admin")
def create_plan():
    payload = request.get_json() or {}
    try:
        data = MembershipPlanSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    node = resolve_node(data.get("node_id") or getattr(g, "node_id", None))
    if not node:
        return error("not_found", "Node not found", status=404)
    plan = MembershipPlan(
        node_id=node.id,
        name=data.get("name"),
        amount_cents=data.get("amount_cents", 0),
        credit_grant_monthly=data.get("credit_grant_monthly", 0),
        pool_allocation_pct=data.get("pool_allocation_pct"),
        stripe_price_id=data.get("stripe_price_id"),
        is_active=bool(data.get("is_active", True)),
    )
    db.session.add(plan)
    db.session.commit()
    return ok({"id": plan.id}, status=201)


@memberships_bp.route("/checkout-session", methods=["POST"])
@alpha_jwt_required()
def checkout_session():
    payload = request.get_json() or {}
    try:
        data = CheckoutSessionSchema().load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    plan_id = data.get("plan_id")
    node_id = data.get("node_id") or getattr(g, "node_id", None)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    existing_subscription = (
        Subscription.query
        .filter_by(user_id=user.id)
        .filter(Subscription.status.in_(BLOCKED_SUBSCRIPTION_STATUSES))
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if existing_subscription:
        return error(
            "conflict",
            "You already have a membership in progress. Resolve the current subscription before starting another.",
            status=409,
            details={"subscription_id": existing_subscription.id, "status": existing_subscription.status},
        )
    plan = MembershipPlan.query.get(plan_id)
    if not plan:
        return error("not_found", "Plan not found", status=404)
    node = resolve_node(node_id) or resolve_node(plan.node_id)
    success_url = data.get("success_url") or request.host_url.rstrip("/") + "/memberships?success=1"
    cancel_url = data.get("cancel_url") or request.host_url.rstrip("/") + "/memberships?canceled=1"
    session, subscription = create_checkout_session(user, plan, node, success_url, cancel_url)
    return ok({"checkout_url": session.url, "subscription_id": subscription.id})


@memberships_bp.route("/status", methods=["GET"])
@alpha_jwt_required()
def status():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    subscription = Subscription.query.filter_by(user_id=user.id).order_by(Subscription.created_at.desc()).first()
    if not subscription:
        return ok({"is_subscribed": False, "subscription": None})
    return ok({
        "is_subscribed": subscription.status in ["active", "trialing"],
        "subscription": {
            "id": subscription.id,
            "plan_id": subscription.plan_id,
            "status": subscription.status,
            "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "streak_months": subscription.streak_months,
            "last_payment_at": subscription.last_payment_at.isoformat() if subscription.last_payment_at else None,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "created_at": subscription.created_at.isoformat(),
        }
    })
