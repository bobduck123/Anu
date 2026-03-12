from datetime import datetime
from flask import current_app

from ..models import ReliefRequest, MicroCouncil, CouncilVote, ReliefDisbursement, ReliefDecision, MicroCouncilMember, db
from .ledger_service import ensure_pool, append_entry


def get_or_create_council(node_id):
    council = MicroCouncil.query.filter_by(node_id=node_id, is_active=True).first()
    if council:
        return council
    cap = current_app.config.get("RELIEF_MAX_GRANT_DEFAULT", 50000)
    council = MicroCouncil(node_id=node_id, name="Default Council", cap_amount_cents=cap, quorum=2)
    db.session.add(council)
    db.session.commit()
    return council


def enqueue_request(request):
    pending_count = ReliefRequest.query.filter_by(node_id=request.node_id, status="submitted").count()
    request.queue_position_estimate = pending_count + 1
    request.next_update_eta_hours = 48
    db.session.commit()


def can_approve_under_cap(request, council):
    if request.amount_requested_cents > council.cap_amount_cents:
        return False
    return True


def compute_triage(request):
    score = 0
    tags = []
    if request.urgency == "high":
        score += 30
        tags.append("high_urgency")
    elif request.urgency == "medium":
        score += 15
        tags.append("medium_urgency")
    else:
        score += 5
        tags.append("low_urgency")

    if request.amount_requested_cents >= 50000:
        score += 15
        tags.append("high_amount")
    elif request.amount_requested_cents >= 25000:
        score += 10
        tags.append("medium_amount")
    else:
        score += 5
        tags.append("low_amount")

    recent_count = ReliefRequest.query.filter_by(user_id=request.user_id).count()
    if recent_count > 1:
        score += 5
        tags.append("repeat_request")

    request.triage_score = score
    request.triage_reason = ", ".join(tags)
    request.triage_tags = tags
    request.triage_updated_at = datetime.utcnow()
    db.session.commit()
    return request


def add_vote(request, council, voter_id, vote, amount_cents=None, reason=None):
    existing = CouncilVote.query.filter_by(request_id=request.id, voter_id=voter_id).first()
    if existing:
        return existing
    entry = CouncilVote(
        request_id=request.id,
        council_id=council.id,
        voter_id=voter_id,
        vote=vote,
        amount_cents=amount_cents,
        reason=reason,
    )
    db.session.add(entry)
    db.session.commit()
    return entry


def try_finalize_under_cap(request, council):
    if not can_approve_under_cap(request, council):
        return False
    approvals = CouncilVote.query.filter_by(request_id=request.id, vote="approve").count()
    member_count = MicroCouncilMember.query.filter_by(council_id=council.id).count()
    quorum = min(council.quorum, member_count) if member_count else council.quorum
    if approvals >= quorum:
        request.status = "approved_under_cap"
        request.approved_amount_cents = request.amount_requested_cents
        request.council_id = council.id
        request.updated_at = datetime.utcnow()
        decision = ReliefDecision(
            request_id=request.id,
            actor_id=0,
            decision="approved_under_cap",
            amount_cents=request.amount_requested_cents,
            reason="micro_council_quorum",
        )
        db.session.add(decision)
        db.session.commit()
        return True
    return False


def require_escalation(request):
    threshold = current_app.config.get("RELIEF_ESCALATION_THRESHOLD", 25000)
    return request.amount_requested_cents > threshold


def approve_with_case_worker(request, amount_cents, approver_id, second_approver_id=None):
    request.status = "approved"
    request.approved_amount_cents = amount_cents
    request.updated_at = datetime.utcnow()
    if second_approver_id:
        request.escalation_level = 1
        decision = ReliefDecision(
            request_id=request.id,
            actor_id=approver_id,
            decision="escalated_approval",
            amount_cents=amount_cents,
            reason="second_approver",
        )
        db.session.add(decision)
    else:
        decision = ReliefDecision(
            request_id=request.id,
            actor_id=approver_id,
            decision="approved",
            amount_cents=amount_cents,
        )
        db.session.add(decision)
    db.session.commit()
    return request


def disburse(request, amount_cents, method, reference, user_id):
    disb = ReliefDisbursement(
        request_id=request.id,
        amount_cents=amount_cents,
        method=method,
        reference=reference,
        disbursed_by=user_id,
    )
    db.session.add(disb)
    request.status = "disbursed"
    request.updated_at = datetime.utcnow()
    decision = ReliefDecision(
        request_id=request.id,
        actor_id=user_id,
        decision="disbursed",
        amount_cents=amount_cents,
    )
    db.session.add(decision)
    db.session.commit()
    pool = ensure_pool(request.node_id, "relief", "Relief Pool", "Relief disbursements", "relief")
    append_entry(
        node_id=request.node_id,
        pool_id=pool.id,
        entry_type="debit",
        amount_cents=-abs(amount_cents),
        description="Relief disbursement",
        reference_id=str(disb.id),
        reference_type="relief_disbursement",
        created_by=user_id,
    )
    return disb
