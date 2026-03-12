from datetime import datetime

from ..models import EventPrimitive, GovernanceVote, GovernanceProposal, GovernanceRoleAssignment, AuditRecord, db


def trigger_governance_review(node_id, hhi_value, tenure_days, hhi_threshold, tenure_threshold, actor_id=None, target_assignment_ids=None):
    if hhi_value <= hhi_threshold and tenure_days <= tenure_threshold:
        return None
    proposal = GovernanceProposal(
        node_id=node_id,
        proposal_type="governance_review",
        title="Governance review triggered",
        details_json={
            "hhi": hhi_value,
            "tenure_days": tenure_days,
            "review_window_days": 14,
            "target_assignment_ids": target_assignment_ids or [],
        },
        quorum_min=2,
    )
    db.session.add(proposal)
    db.session.flush()
    event = EventPrimitive(
        event_type="PROPOSAL_CREATED",
        entity_type="governance_proposal",
        entity_id=str(proposal.id),
        props={
            "proposal_type": "governance_review",
            "proposal_id": proposal.id,
            "hhi": hhi_value,
            "tenure_days": tenure_days,
            "review_window_days": 14,
        },
        node_id=node_id,
        actor_id=actor_id,
    )
    db.session.add(event)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="governance_review_triggered",
        entity_type="proposal",
        entity_id=str(proposal.id),
    ))
    db.session.commit()
    return proposal


def resolve_governance_review(proposal_id, quorum_min=None, actor_id=None):
    proposal = GovernanceProposal.query.get(proposal_id)
    if not proposal or proposal.status != "pending":
        raise ValueError("Proposal not found or already resolved")
    quorum = quorum_min or proposal.quorum_min or 2
    votes = GovernanceVote.query.filter_by(
        proposal_type=proposal.proposal_type,
        proposal_id=str(proposal.id),
    ).all()
    approvals = len([v for v in votes if v.vote == "approve"])
    rejections = len([v for v in votes if v.vote == "reject"])
    if approvals < quorum:
        raise ValueError("Quorum not met")
    if approvals <= rejections:
        proposal.status = "rejected"
    else:
        proposal.status = "approved"
        _enforce_rotation(proposal, actor_id=actor_id)
    proposal.closed_at = datetime.utcnow()
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="governance_review_resolved",
        entity_type="proposal",
        entity_id=str(proposal.id),
        payload={"status": proposal.status, "approvals": approvals, "rejections": rejections},
    ))
    db.session.commit()
    return proposal


def _enforce_rotation(proposal, actor_id=None):
    target_ids = (proposal.details_json or {}).get("target_assignment_ids") or []
    if not target_ids:
        return
    assignments = GovernanceRoleAssignment.query.filter(GovernanceRoleAssignment.id.in_(target_ids)).all()
    for assignment in assignments:
        assignment.is_active = False
        assignment.ends_at = datetime.utcnow()
        db.session.add(AuditRecord(
            actor_id=actor_id,
            action="governance_role_rotated",
            entity_type="governance_role_assignment",
            entity_id=str(assignment.id),
            payload={"proposal_id": proposal.id},
        ))
