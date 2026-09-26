"""Private pilot action commitments and a redacted public outcome count."""

from urllib.parse import urlsplit

from flask import Blueprint, request
from flask_jwt_extended import verify_jwt_in_request
from sqlalchemy.exc import IntegrityError

from ..extensions import db, limiter
from ..models import Action, ActionCommitment, ActionProof, AuditRecord, ImpactCreditTx, Todo, User, utcnow
from ..security.policy import get_current_user
from ..services.feature_flag_service import is_enabled
from .utils import error, ok


action_commitments_bp = Blueprint("action_commitments", __name__, url_prefix="/commitments")
STEWARD_ROLES = {"node_admin", "board_member", "platform_admin"}


def _member():
    verify_jwt_in_request()
    user = get_current_user()
    if not user or user.node_id is None:
        return None
    return user


def _action_for_member(action_id: int, user: User):
    return Action.query.filter_by(id=action_id, node_id=user.node_id).first()


def _record_for_member(commitment_id: int, user: User, *, steward: bool = False, for_update: bool = False):
    query = ActionCommitment.query.filter_by(id=commitment_id, node_id=user.node_id)
    record = (query.with_for_update() if for_update else query).first()
    if not record:
        return None
    if record.user_id != user.id and not (steward and user.role in STEWARD_ROLES):
        return None
    return record


def _serialize(record: ActionCommitment, *, steward: bool = False):
    data = {
        "id": record.id,
        "action_id": record.action_id,
        "action_title": record.action.title,
        "status": record.status,
        "evidence_url": record.evidence_url,
        "evidence_note": record.evidence_note,
        "review_note": record.review_note,
        "confirmed_at": record.confirmed_at.isoformat() if record.confirmed_at else None,
        "submitted_at": record.submitted_at.isoformat() if record.submitted_at else None,
        "reviewed_at": record.reviewed_at.isoformat() if record.reviewed_at else None,
        "awarded_points": record.awarded_points,
    }
    if steward:
        data["participant_id"] = record.user_id
        data["participant_name"] = record.participant.pseudonym
    return data


def _audit(record: ActionCommitment, actor: User, transition: str):
    db.session.add(AuditRecord(
        node_id=record.node_id,
        actor_id=actor.id,
        action=f"action_commitment_{transition}",
        entity_type="action_commitment",
        entity_id=str(record.id),
        payload={
            "action_id": record.action_id,
            "participant_id": record.user_id,
            "status": record.status,
            "awarded_points": record.awarded_points if transition == "verified" else None,
        },
    ))


@action_commitments_bp.route("/actions/<int:action_id>", methods=["GET", "POST"])
@limiter.limit("30 per minute")
def participant_action_commitment(action_id: int):
    user = _member()
    if not user:
        return error("unauthorized", "A community account is required", status=401)
    action = _action_for_member(action_id, user)
    if not action:
        return error("not_found", "Action not found in your community", status=404)
    record = ActionCommitment.query.filter_by(action_id=action_id, user_id=user.id).first()
    if request.method == "GET":
        return ok(_serialize(record) if record else None)
    if record and record.status != "CANCELLED":
        return ok(_serialize(record))
    if record:
        record.status = "CONFIRMED"
        record.confirmed_at = utcnow()
        record.cancelled_at = None
        record.evidence_url = None
        record.evidence_note = None
        record.review_note = None
        record.reviewed_by_id = None
        record.submitted_at = None
        record.reviewed_at = None
        record.awarded_points = None
        record.points_awarded_at = None
    else:
        record = ActionCommitment(node_id=user.node_id, action_id=action_id, user_id=user.id)
        db.session.add(record)
    try:
        db.session.flush()
        _audit(record, user, "confirmed")
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        existing = ActionCommitment.query.filter_by(action_id=action_id, user_id=user.id).first()
        if existing:
            return ok(_serialize(existing))
        raise
    return ok(_serialize(record), status=201)


@action_commitments_bp.route("/mine", methods=["GET"])
@limiter.limit("30 per minute")
def my_action_commitments():
    user = _member()
    if not user:
        return error("unauthorized", "A community account is required", status=401)
    records = ActionCommitment.query.filter_by(user_id=user.id, node_id=user.node_id).order_by(ActionCommitment.id.desc()).all()
    return ok([_serialize(record) for record in records])


@action_commitments_bp.route("/<int:commitment_id>/cancel", methods=["POST"])
@limiter.limit("30 per minute")
def cancel_action_commitment(commitment_id: int):
    user = _member()
    if not user:
        return error("unauthorized", "A community account is required", status=401)
    record = _record_for_member(commitment_id, user)
    if not record:
        return error("not_found", "Commitment not found", status=404)
    if record.status == "CANCELLED":
        return ok(_serialize(record))
    if record.status != "CONFIRMED":
        return error("invalid_state", "Only a confirmed commitment can be cancelled", status=409)
    record.status = "CANCELLED"
    record.cancelled_at = utcnow()
    _audit(record, user, "cancelled")
    db.session.commit()
    return ok(_serialize(record))


@action_commitments_bp.route("/<int:commitment_id>/complete", methods=["POST"])
@limiter.limit("30 per minute")
def submit_action_completion(commitment_id: int):
    user = _member()
    if not user:
        return error("unauthorized", "A community account is required", status=401)
    record = _record_for_member(commitment_id, user)
    if not record:
        return error("not_found", "Commitment not found", status=404)
    if record.status == "PENDING_REVIEW":
        return ok(_serialize(record))
    if record.status not in {"CONFIRMED", "NEEDS_CHANGES"}:
        return error("invalid_state", "This commitment cannot be submitted", status=409)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("validation_error", "Evidence is required", status=400)
    evidence_url = payload.get("evidence_url")
    note = payload.get("evidence_note", "")
    if not isinstance(evidence_url, str) or not isinstance(note, str):
        return error("validation_error", "Evidence URL and note must be text", status=400)
    evidence_url = evidence_url.strip()
    note = note.strip()
    parsed = urlsplit(evidence_url)
    if (len(evidence_url) > 500 or parsed.scheme != "https" or not parsed.hostname
            or parsed.username or parsed.password or len(note) > 1000):
        return error("validation_error", "Use a secure evidence link and a short note", status=400)
    record.evidence_url = evidence_url
    record.evidence_note = note or None
    record.review_note = None
    record.status = "PENDING_REVIEW"
    record.submitted_at = utcnow()
    _audit(record, user, "submitted")
    db.session.commit()
    return ok(_serialize(record))


@action_commitments_bp.route("/review-queue", methods=["GET"])
@limiter.limit("30 per minute")
def action_commitment_review_queue():
    user = _member()
    if not user or user.role not in STEWARD_ROLES:
        return error("forbidden", "Steward access is required", status=403)
    records = ActionCommitment.query.filter_by(node_id=user.node_id, status="PENDING_REVIEW").filter(
        ActionCommitment.user_id != user.id,
    ).order_by(ActionCommitment.id).all()
    return ok([_serialize(record, steward=True) for record in records])


@action_commitments_bp.route("/<int:commitment_id>/review", methods=["POST"])
@limiter.limit("30 per minute")
def review_action_completion(commitment_id: int):
    user = _member()
    if not user or user.role not in STEWARD_ROLES:
        return error("forbidden", "Steward access is required", status=403)
    record = _record_for_member(commitment_id, user, steward=True, for_update=True)
    if not record:
        return error("not_found", "Commitment not found", status=404)
    if record.user_id == user.id:
        return error("forbidden", "A steward cannot review their own completion", status=403)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or payload.get("decision") not in {"verify", "request_changes"}:
        return error("validation_error", "Review decision is required", status=400)
    decision = payload["decision"]
    note = payload.get("review_note", "")
    if not isinstance(note, str) or len(note.strip()) > 1000 or (decision == "request_changes" and not note.strip()):
        return error("validation_error", "A short review note is required for changes", status=400)
    target = "VERIFIED" if decision == "verify" else "NEEDS_CHANGES"
    if record.status == target:
        return ok(_serialize(record, steward=True))
    if record.status != "PENDING_REVIEW":
        return error("invalid_state", "Completion is not awaiting review", status=409)
    record.status = target
    record.review_note = note.strip() or None
    record.reviewed_by_id = user.id
    record.reviewed_at = utcnow()
    if target == "VERIFIED" and record.points_awarded_at is None:
        participant = User.query.filter_by(id=record.user_id, node_id=record.node_id).with_for_update().one()
        legacy_completed = Todo.query.filter_by(
            user_id=record.user_id, action_id=record.action_id, is_completed=True,
        ).first() is not None
        legacy_proof_reward = ActionProof.query.filter_by(
            user_id=record.user_id, action_id=record.action_id, verified=True,
        ).first() is not None
        legacy_action_audit = AuditRecord.query.filter_by(
            actor_id=record.user_id,
            action="action_completed",
            entity_type="action",
            entity_id=str(record.action_id),
        ).first() is not None
        # Historical reward paths lack a shared award key; preserve the reviewed outcome without paying twice.
        amount = 0 if (legacy_completed or legacy_proof_reward or legacy_action_audit) else max(0, int(record.action.points_assigned or 0))
        participant.points = int(participant.points or 0) + amount
        participant.level = max(1, int(participant.level or 1))
        participant.points_to_level_up = max(1, int(participant.points_to_level_up or 100))
        while participant.points >= participant.points_to_level_up:
            participant.points -= participant.points_to_level_up
            participant.level += 1
            participant.points_to_level_up = int(participant.points_to_level_up * 1.5)
        record.awarded_points = amount
        record.points_awarded_at = utcnow()
        if amount > 0 and is_enabled("civic_credit_engine"):
            db.session.add(ImpactCreditTx(
                user_id=participant.id,
                node_id=record.node_id,
                tx_type="earn",
                amount=amount,
                source_type="action_commitment_verified",
                description=f"Steward-verified action: {record.action.title}",
                reference_id=str(record.id),
            ))
    _audit(record, user, "verified" if decision == "verify" else "changes_requested")
    db.session.commit()
    return ok(_serialize(record, steward=True))


@action_commitments_bp.route("/actions/<int:action_id>/outcome", methods=["GET"])
@limiter.limit("60 per minute")
def public_action_outcome(action_id: int):
    action = Action.query.filter_by(id=action_id).first()
    if not action:
        return error("not_found", "Action not found", status=404)
    verified_count = ActionCommitment.query.filter_by(action_id=action_id, node_id=action.node_id, status="VERIFIED").count()
    return ok({"action_id": action.id, "verified_outcomes": verified_count})
