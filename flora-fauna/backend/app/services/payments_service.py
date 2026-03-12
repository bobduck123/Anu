import stripe
from flask import current_app
from datetime import datetime

from ..models import Subscription, SubscriptionEvent, ImpactLedgerEntry, db
from .ledger_service import ensure_pool, append_entry, reversal_entry
from . import dumb_dumb_service


def _init_stripe():
    stripe.api_key = current_app.config.get("STRIPE_SECRET_KEY")


def create_checkout_session(user, plan, node, success_url, cancel_url):
    _init_stripe()
    subscription = Subscription(
        user_id=user.id,
        node_id=node.id,
        plan_id=plan.id,
        status="pending",
    )
    db.session.add(subscription)
    db.session.commit()
    session = stripe.checkout.Session.create(
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        customer_email=user.email,
        line_items=[{"price": plan.stripe_price_id, "quantity": 1}],
        metadata={
            "user_id": str(user.id),
            "node_id": str(node.id),
            "plan_id": str(plan.id),
            "subscription_id": str(subscription.id),
        },
    )
    return session, subscription


def verify_webhook(payload, sig_header):
    _init_stripe()
    secret = current_app.config.get("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
    return stripe.Webhook.construct_event(payload, sig_header, secret)


def handle_event(event):
    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        if not dumb_dumb_service.finalize_checkout_session(data_object):
            _handle_checkout_completed(data_object)
    elif event_type == "checkout.session.async_payment_succeeded":
        dumb_dumb_service.finalize_checkout_session(data_object)
    elif event_type == "checkout.session.expired":
        dumb_dumb_service.expire_checkout_session(data_object)
    elif event_type == "payment_intent.payment_failed":
        dumb_dumb_service.fail_payment_intent(data_object)
    elif event_type == "invoice.paid":
        _handle_invoice_paid(data_object)
    elif event_type == "invoice.payment_failed":
        _handle_invoice_failed(data_object)
    elif event_type in ["customer.subscription.updated", "customer.subscription.deleted"]:
        _handle_subscription_update(data_object)
    elif event_type in ["charge.refunded", "charge.dispute.created"]:
        _handle_charge_refund(data_object)


def _handle_checkout_completed(session):
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")
    metadata = session.get("metadata") or {}
    internal_sub = Subscription.query.filter_by(id=metadata.get("subscription_id")).first()
    if internal_sub:
        internal_sub.stripe_subscription_id = subscription_id
        internal_sub.stripe_customer_id = customer_id
        internal_sub.status = "active"
        db.session.commit()


def _handle_invoice_paid(invoice):
    subscription_id = invoice.get("subscription")
    amount_paid = invoice.get("amount_paid", 0)
    subscription = Subscription.query.filter_by(stripe_subscription_id=subscription_id).first()
    if not subscription:
        return
    subscription.status = "active"
    subscription.current_period_start = datetime.fromtimestamp(invoice.get("period_start"))
    subscription.current_period_end = datetime.fromtimestamp(invoice.get("period_end"))
    subscription.last_payment_at = datetime.utcnow()
    subscription.streak_months = (subscription.streak_months or 0) + 1
    db.session.commit()

    pool = ensure_pool(subscription.node_id, "membership", "Membership Pool", "Membership contributions", "membership")
    append_entry(
        node_id=subscription.node_id,
        pool_id=pool.id,
        entry_type="credit",
        amount_cents=amount_paid,
        description="Membership subscription payment",
        reference_id=invoice.get("id"),
        reference_type="stripe_invoice",
        created_by=subscription.user_id,
    )


def _handle_invoice_failed(invoice):
    subscription_id = invoice.get("subscription")
    subscription = Subscription.query.filter_by(stripe_subscription_id=subscription_id).first()
    if not subscription:
        return
    subscription.status = "past_due"
    db.session.commit()


def _handle_subscription_update(subscription_obj):
    subscription = Subscription.query.filter_by(stripe_subscription_id=subscription_obj.get("id")).first()
    if not subscription:
        return
    subscription.status = subscription_obj.get("status", subscription.status)
    subscription.cancel_at_period_end = subscription_obj.get("cancel_at_period_end", False)
    db.session.commit()


def _handle_charge_refund(charge):
    invoice_id = charge.get("invoice")
    subscription_id = charge.get("subscription")
    subscription = Subscription.query.filter_by(stripe_subscription_id=subscription_id).first()
    if not subscription:
        return
    pool = ensure_pool(subscription.node_id, "membership", "Membership Pool", "Membership contributions", "membership")
    last_entry = None
    if invoice_id:
        last_entry = ImpactLedgerEntry.query.filter_by(reference_id=invoice_id, reference_type="stripe_invoice").first()
    if last_entry:
        reversal_entry(
            node_id=subscription.node_id,
            pool_id=pool.id,
            original_entry=last_entry,
            reason="Refund reversal",
            created_by=subscription.user_id,
        )
