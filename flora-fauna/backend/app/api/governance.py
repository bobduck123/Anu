from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..security.mode_guard import require_mode_allows
from ..security.alpha import alpha_jwt_required
from ..services import governance_service
from ..services.governance_review_service import resolve_governance_review
from ..models import GovernanceRoleAssignment, GovernanceVote, GOVERNANCE_ROLES, ConflictOfInterestDeclaration, db
from ..services.feature_flag_service import is_enabled
from .utils import ok, error

governance_bp = Blueprint("governance", __name__, url_prefix="/governance")


@governance_bp.route("/roles", methods=["GET"])
@alpha_jwt_required()
def list_roles():
    return ok({"roles": GOVERNANCE_ROLES})


@governance_bp.route("/assignments", methods=["GET"])
@alpha_jwt_required()
def list_assignments():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    assignments = GovernanceRoleAssignment.query.filter_by(user_id=user.id, is_active=True).all()
    return ok({"assignments": [{
        "id": a.id,
        "role_type": a.role_type,
        "starts_at": a.starts_at.isoformat() if a.starts_at else None,
        "ends_at": a.ends_at.isoformat() if a.ends_at else None,
        "is_active": a.is_active,
        "is_expired": a.is_expired,
    } for a in assignments]})


@governance_bp.route("/assign", methods=["POST"])
@require_permission("governance:manage")
@require_mode_allows("privilege_escalation")
def assign_role():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    user_id = payload.get("user_id")
    role_type = payload.get("role_type")
    if not user_id or not role_type:
        return error("validation_error", "user_id and role_type required", status=400)
    try:
        assignment = governance_service.assign_role(
            user_id=int(user_id),
            role_type=role_type,
            assigned_by=user.id,
            ends_at=None,
            reason=payload.get("reason"),
        )
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"id": assignment.id, "role_type": assignment.role_type}, status=201)


@governance_bp.route("/revoke/<int:assignment_id>", methods=["POST"])
@require_permission("governance:manage")
def revoke_role(assignment_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    try:
        assignment = governance_service.revoke_role(assignment_id, revoked_by=user.id)
    except ValueError as exc:
        return error("not_found", str(exc), status=404)
    return ok({"id": assignment.id, "is_active": assignment.is_active})


@governance_bp.route("/proposals/<int:proposal_id>/resolve", methods=["POST"])
@require_permission("governance:manage")
def resolve_review(proposal_id):
    user = get_current_user()
    payload = request.get_json() or {}
    quorum_min = payload.get("quorum_min")
    try:
        proposal = resolve_governance_review(proposal_id, quorum_min=quorum_min, actor_id=user.id if user else None)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"id": proposal.id, "status": proposal.status})


@governance_bp.route("/vote", methods=["POST"])
@alpha_jwt_required()
def cast_vote():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    try:
        vote = governance_service.cast_vote(
            voter_id=user.id,
            proposal_type=payload.get("proposal_type", ""),
            proposal_id=payload.get("proposal_id", ""),
            vote=payload.get("vote", ""),
            reason=payload.get("reason"),
        )
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"id": vote.id}, status=201)


@governance_bp.route("/votes", methods=["GET"])
@alpha_jwt_required()
def list_votes():
    proposal_type = request.args.get("proposal_type")
    proposal_id = request.args.get("proposal_id")
    query = GovernanceVote.query
    if proposal_type:
        query = query.filter_by(proposal_type=proposal_type)
    if proposal_id:
        query = query.filter_by(proposal_id=proposal_id)
    votes = query.order_by(GovernanceVote.created_at.desc()).limit(100).all()
    return ok({"votes": [{
        "id": v.id,
        "proposal_type": v.proposal_type,
        "proposal_id": v.proposal_id,
        "voter_id": v.voter_id,
        "vote": v.vote,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    } for v in votes]})


@governance_bp.route("/eligibility/<int:user_id>", methods=["GET"])
@alpha_jwt_required()
def check_eligibility(user_id):
    eligible, msg = governance_service.check_eligibility(user_id, "NodeCurator")
    return ok({"eligible": eligible, "message": msg})


@governance_bp.route("/coi", methods=["GET"])
@require_permission("coi:manage")
def list_coi():
    if not is_enabled("coi_registry"):
        return error("feature_disabled", "Feature 'coi_registry' disabled", status=403)
    records = ConflictOfInterestDeclaration.query.order_by(ConflictOfInterestDeclaration.created_at.desc()).limit(200).all()
    return ok({"records": [{
        "id": r.id,
        "actor_id": r.actor_id,
        "related_entity_type": r.related_entity_type,
        "related_entity_id": r.related_entity_id,
        "declaration": r.declaration,
        "active": r.active,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in records]})


@governance_bp.route("/coi", methods=["POST"])
@require_permission("coi:manage")
def declare_coi():
    if not is_enabled("coi_registry"):
        return error("feature_disabled", "Feature 'coi_registry' disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    record = ConflictOfInterestDeclaration(
        actor_id=user.id,
        related_entity_type=payload.get("related_entity_type"),
        related_entity_id=str(payload.get("related_entity_id")) if payload.get("related_entity_id") is not None else None,
        declaration=payload.get("declaration"),
        active=True,
    )
    db.session.add(record)
    db.session.commit()
    return ok({"id": record.id}, status=201)
