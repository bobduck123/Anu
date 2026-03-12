from flask import Blueprint, request

from ..models import SubscriptionEvent, db
from ..services import payments_service
from .utils import ok, error


stripe_bp = Blueprint("stripe", __name__, url_prefix="/stripe")


@stripe_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")
    if not sig_header:
        return error("bad_request", "Missing Stripe signature", status=400)
    try:
        event = payments_service.verify_webhook(payload, sig_header)
    except Exception as exc:
        return error("signature_verification_failed", str(exc), status=400)

    existing = SubscriptionEvent.query.filter_by(stripe_event_id=event["id"]).first()
    if existing:
        return ok({"status": "ignored", "reason": "duplicate"})

    payments_service.handle_event(event)
    payload = event.to_dict() if hasattr(event, "to_dict") else event
    record = SubscriptionEvent(
        stripe_event_id=event["id"],
        event_type=event["type"],
        payload=payload,
    )
    db.session.add(record)
    db.session.commit()
    return ok({"status": "processed"})
