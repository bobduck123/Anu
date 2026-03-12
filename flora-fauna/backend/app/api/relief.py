from flask import Blueprint, request
from marshmallow import ValidationError

from ..models import ReliefRequest, db
from ..services.node_service import resolve_node
from ..services.relief_service import get_or_create_council, enqueue_request, add_vote, try_finalize_under_cap, require_escalation, approve_with_case_worker, disburse, compute_triage
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission, require_role
from flask import current_app
from ..security.audit import audit_read
from .utils import ok, error
from ..schemas import ReliefRequestSchema


relief_bp = Blueprint("relief", __name__, url_prefix="/relief")


@relief_bp.route("/requests", methods=["POST"])
@alpha_jwt_required()
def create_request():
    payload = request.get_json() or {}
    schema = ReliefRequestSchema()
    try:
        payload = schema.load(payload)
    except ValidationError as exc:
        return error("validation_error", exc.messages, status=400)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    node = resolve_node(payload.get("node_id")) or resolve_node(user.node_id)
    if not node:
        return error("not_found", "Node not found", status=404)
    rr = ReliefRequest(
        node_id=node.id,
        user_id=user.id,
        amount_requested_cents=int(payload.get("amount_requested", 0)),
        purpose=payload.get("purpose", "other"),
        description=payload.get("description"),
        urgency=payload.get("urgency", "medium"),
        contact_preference=payload.get("contact_preference", "in-app"),
        consent_data_processing=bool(payload.get("consents", {}).get("data_processing", False)),
        consent_case_worker_contact=bool(payload.get("consents", {}).get("case_worker_contact", False)),
        status="submitted",
    )
    max_grant = current_app.config.get("RELIEF_MAX_GRANT_DEFAULT", 50000)
    if rr.amount_requested_cents > max_grant:
        return error("amount_exceeds_cap", "Requested amount exceeds default cap", status=400)
    db.session.add(rr)
    db.session.commit()
    compute_triage(rr)
    enqueue_request(rr)
    return ok({
        "request_id": rr.id,
        "status": rr.status,
        "queue_position_estimate": rr.queue_position_estimate,
        "next_update_eta_hours": rr.next_update_eta_hours,
    }, status=201)


@relief_bp.route("/requests/me", methods=["GET"])
@alpha_jwt_required()
def my_requests():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    reqs = ReliefRequest.query.filter_by(user_id=user.id).order_by(ReliefRequest.submitted_at.desc()).all()
    data = [{
        "id": r.id,
        "status": r.status,
        "amount_requested_cents": r.amount_requested_cents,
        "purpose": r.purpose,
        "urgency": r.urgency,
        "submitted_at": r.submitted_at.isoformat(),
        "approved_amount_cents": r.approved_amount_cents,
    } for r in reqs]
    return ok(data)


@relief_bp.route("/queue", methods=["GET"])
@require_permission("relief:queue")
def relief_queue():
    reqs = ReliefRequest.query.filter_by(status="submitted").order_by(ReliefRequest.triage_score.desc(), ReliefRequest.submitted_at.asc()).all()
    user = get_current_user()
    if current_app.config.get("AUDIT_LOG_SENSITIVE_READS"):
        for r in reqs:
            audit_read("ReliefRequest", r.id, actor_id=user.id if user else None, node_id=r.node_id, metadata={"view": "queue"})
    data = [{
        "id": r.id,
        "node_id": r.node_id,
        "amount_requested_cents": r.amount_requested_cents,
        "purpose": r.purpose,
        "urgency": r.urgency,
        "triage_score": r.triage_score,
        "triage_reason": r.triage_reason,
        "submitted_at": r.submitted_at.isoformat(),
        "status": r.status,
    } for r in reqs]
    return ok(data)


@relief_bp.route("/requests/<int:request_id>/vote", methods=["POST"])
@require_permission("relief:vote")
def vote_request(request_id):
    payload = request.get_json() or {}
    user = get_current_user()
    rr = ReliefRequest.query.get(request_id)
    if not rr:
        return error("not_found", "Request not found", status=404)
    council = get_or_create_council(rr.node_id)
    if rr.amount_requested_cents > council.cap_amount_cents:
        return error("cap_exceeded", "Amount exceeds council cap; requires escalation", status=400)
    vote = payload.get("vote", "approve")
    add_vote(rr, council, user.id, vote, payload.get("amount_cents"), payload.get("reason"))
    finalized = try_finalize_under_cap(rr, council)
    return ok({"finalized": finalized, "status": rr.status})


@relief_bp.route("/requests/<int:request_id>/approve", methods=["POST"])
@require_permission("relief:approve")
def approve_request(request_id):
    payload = request.get_json() or {}
    user = get_current_user()
    rr = ReliefRequest.query.get(request_id)
    if not rr:
        return error("not_found", "Request not found", status=404)
    amount_cents = int(payload.get("amount_cents", rr.amount_requested_cents))
    if require_escalation(rr) and not payload.get("second_approver_id"):
        return error("escalation_required", "Second approver required for escalation", status=400)
    approve_with_case_worker(rr, amount_cents, user.id, payload.get("second_approver_id"))
    return ok({"status": rr.status, "approved_amount_cents": rr.approved_amount_cents})


@relief_bp.route("/requests/<int:request_id>/disburse", methods=["POST"])
@require_permission("relief:disburse")
def disburse_request(request_id):
    payload = request.get_json() or {}
    user = get_current_user()
    rr = ReliefRequest.query.get(request_id)
    if not rr:
        return error("not_found", "Request not found", status=404)
    amount_cents = int(payload.get("amount_cents", rr.approved_amount_cents or rr.amount_requested_cents))
    disb = disburse(rr, amount_cents, payload.get("method"), payload.get("reference"), user.id)
    return ok({"disbursement_id": disb.id, "status": rr.status})


@relief_bp.route("/requests/<int:request_id>", methods=["GET"])
@require_permission("relief:queue")
def get_request_detail(request_id):
    user = get_current_user()
    rr = ReliefRequest.query.get(request_id)
    if not rr:
        return error("not_found", "Request not found", status=404)
    if current_app.config.get("AUDIT_LOG_SENSITIVE_READS"):
        audit_read("ReliefRequest", rr.id, actor_id=user.id if user else None, node_id=rr.node_id, metadata={"view": "detail"})
    data = {
        "id": rr.id,
        "node_id": rr.node_id,
        "user_id": rr.user_id,
        "amount_requested_cents": rr.amount_requested_cents,
        "purpose": rr.purpose,
        "urgency": rr.urgency,
        "description": rr.description,
        "status": rr.status,
        "triage_score": rr.triage_score,
        "triage_reason": rr.triage_reason,
        "submitted_at": rr.submitted_at.isoformat(),
        "approved_amount_cents": rr.approved_amount_cents,
    }
    if user and user.role == "auditor":
        data["description"] = None
    return ok(data)


@relief_bp.route("/requests/<int:request_id>/decisions", methods=["GET"])
@require_permission("relief:queue")
def request_decisions(request_id):
    from ..models import ReliefDecision, User
    decisions = ReliefDecision.query.filter_by(request_id=request_id).order_by(ReliefDecision.created_at.asc()).all()
    data = []
    for d in decisions:
        actor = User.query.get(d.actor_id)
        data.append({
            "id": d.id,
            "decision": d.decision,
            "amount_cents": d.amount_cents,
            "reason": d.reason,
            "actor": actor.username if actor else None,
            "created_at": d.created_at.isoformat(),
        })
    return ok(data)


@relief_bp.route("/requests/<int:request_id>/triage", methods=["POST"])
@require_permission("relief:queue")
def override_triage(request_id):
    user = get_current_user()
    payload = request.get_json() or {}
    rr = ReliefRequest.query.get(request_id)
    if not rr:
        return error("not_found", "Request not found", status=404)
    rr.triage_score = int(payload.get("triage_score", rr.triage_score))
    rr.triage_reason = payload.get("triage_reason", rr.triage_reason)
    rr.triage_tags = payload.get("triage_tags", rr.triage_tags)
    rr.triage_updated_at = db.func.now()
    db.session.commit()
    if current_app.config.get("AUDIT_LOG_SENSITIVE_READS"):
        audit_read("ReliefRequest", rr.id, actor_id=user.id if user else None, node_id=rr.node_id, metadata={"triage_override": True})
    return ok({"id": rr.id, "triage_score": rr.triage_score, "triage_reason": rr.triage_reason})

@relief_bp.route("/metrics", methods=["GET"])
@require_permission("relief:queue")
def relief_metrics():
    from ..models import ReliefDecision, ReliefDisbursement
    from sqlalchemy import func
    total = ReliefRequest.query.count()
    approved = ReliefRequest.query.filter(ReliefRequest.status.in_(["approved", "approved_under_cap", "disbursed"])).count()
    approval_ratio = (approved / total) if total else 0
    response_times = db.session.query(func.julianday(ReliefRequest.updated_at) - func.julianday(ReliefRequest.submitted_at)).filter(ReliefRequest.updated_at.isnot(None)).all()
    values = sorted([v[0] for v in response_times if v[0] is not None])
    median = values[len(values)//2] if values else 0
    disb_by_purpose = db.session.query(ReliefRequest.purpose, func.sum(ReliefDisbursement.amount_cents)).join(ReliefDisbursement, ReliefDisbursement.request_id == ReliefRequest.id).group_by(ReliefRequest.purpose).all()
    return ok({
        "approval_ratio": approval_ratio,
        "median_response_days": float(median),
        "disbursements_by_purpose": {p: int(a or 0) for p, a in disb_by_purpose}
    })


@relief_bp.route("/councils", methods=["GET"])
@require_permission("relief:queue")
def list_councils():
    from ..models import MicroCouncil, MicroCouncilMember
    councils = MicroCouncil.query.filter_by(is_active=True).all()
    data = []
    for c in councils:
        members = MicroCouncilMember.query.filter_by(council_id=c.id).all()
        data.append({
            "id": c.id,
            "name": c.name,
            "cap_amount_cents": c.cap_amount_cents,
            "quorum": c.quorum,
            "member_count": len(members),
        })
    return ok(data)


@relief_bp.route("/councils/<int:council_id>/members", methods=["GET"])
@require_permission("relief:queue")
def council_members(council_id):
    from ..models import MicroCouncilMember, User
    members = MicroCouncilMember.query.filter_by(council_id=council_id).all()
    data = []
    for m in members:
        user = User.query.get(m.user_id)
        data.append({
            "id": m.id,
            "user_id": m.user_id,
            "username": user.username if user else None,
            "role": m.role,
        })
    return ok(data)


@relief_bp.route("/councils/<int:council_id>/members", methods=["POST"])
@require_role("node_admin", "platform_admin")
def add_council_member(council_id):
    from ..models import MicroCouncilMember
    payload = request.get_json() or {}
    user_id = payload.get("user_id")
    if not user_id:
        return error("validation_error", "user_id is required", status=400)
    existing = MicroCouncilMember.query.filter_by(council_id=council_id, user_id=user_id).first()
    if existing:
        return ok({"id": existing.id})
    member = MicroCouncilMember(council_id=council_id, user_id=user_id, role=payload.get("role", "member"))
    db.session.add(member)
    db.session.commit()
    return ok({"id": member.id}, status=201)
