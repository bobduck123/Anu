from flask import Blueprint, request

from ..models import CollisionCheck, CollisionReview
from ..security.policy import require_permission
from ..security.policy import get_current_user
from ..services.feature_flag_service import is_enabled
from ..extensions import db
from ..models import AuditRecord
from .utils import ok, error


collisions_bp = Blueprint("collisions", __name__, url_prefix="/collisions")


@collisions_bp.route("/checks", methods=["GET"])
@require_permission("collision:review")
def list_checks():
    if not is_enabled("OIL_COLLISION_DETECTION"):
        return error("disabled", "Collision detection disabled", status=403)
    checks = CollisionCheck.query.order_by(CollisionCheck.created_at.desc()).limit(100).all()
    return ok({"checks": [{
        "event_id": c.event_id,
        "score": c.score,
        "reasons": c.reasons_json or [],
        "formula_version": c.formula_version,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "acknowledged_by_user_id": c.acknowledged_by_user_id,
    } for c in checks]})


@collisions_bp.route("/reviews", methods=["GET"])
@require_permission("collision:review")
def list_reviews():
    if not is_enabled("OIL_COLLISION_DETECTION"):
        return error("disabled", "Collision detection disabled", status=403)
    reviews = CollisionReview.query.order_by(CollisionReview.created_at.desc()).limit(100).all()
    return ok({"reviews": [{
        "id": r.id,
        "event_id": r.event_id,
        "status": r.status,
        "reviewer_user_id": r.reviewer_user_id,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reviews]})


@collisions_bp.route("/reviews/<int:review_id>", methods=["POST"])
@require_permission("collision:review")
def update_review(review_id):
    if not is_enabled("OIL_COLLISION_DETECTION"):
        return error("disabled", "Collision detection disabled", status=403)
    payload = request.get_json() or {}
    status = payload.get("status")
    if status not in {"approved", "rejected"}:
        return error("validation_error", "status must be approved or rejected", status=400)
    review = CollisionReview.query.get_or_404(review_id)
    review.status = status
    review.notes = payload.get("notes")
    user = get_current_user()
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="collision_review_updated",
        entity_type="collision_review",
        entity_id=str(review_id),
        payload={"status": status},
    ))
    db.session.commit()
    return ok({"id": review.id, "status": review.status})
