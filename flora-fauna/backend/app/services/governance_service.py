"""Governance service for role management, voting, and eligibility checks."""
from datetime import datetime

from ..models import (
    GovernanceRoleAssignment, GovernanceVote, GovernanceEligibilityLink,
    Certification, TrustScore, AuditLog, GOVERNANCE_ROLES, ConflictOfInterestDeclaration, User, db,
)
from . import credit_engine_service
from .feature_flag_service import is_enabled


def assign_role(user_id, role_type, assigned_by=None, ends_at=None, reason=None):
    """Assign a governance role to a user."""
    if role_type not in GOVERNANCE_ROLES:
        raise ValueError(f"Invalid governance role: {role_type}")

    # Check eligibility
    eligible, msg = check_eligibility(user_id, role_type)
    if not eligible:
        raise ValueError(f"User not eligible for {role_type}: {msg}")

    assignment = GovernanceRoleAssignment(
        user_id=user_id,
        role_type=role_type,
        assigned_by=assigned_by,
        ends_at=ends_at,
        is_active=True,
        reason=reason,
    )
    db.session.add(assignment)

    # Audit log
    audit = AuditLog(
        event="governance_role_assigned",
        actor_id=assigned_by,
        entity_type="governance_role_assignment",
        entity_id=str(user_id),
        metadata_json={"role_type": role_type, "reason": reason},
    )
    db.session.add(audit)
    db.session.commit()
    return assignment


def revoke_role(assignment_id, revoked_by=None, reason=None):
    """Revoke a governance role assignment."""
    assignment = GovernanceRoleAssignment.query.get(assignment_id)
    if not assignment:
        raise ValueError("Assignment not found")
    assignment.is_active = False
    assignment.ends_at = datetime.utcnow()
    assignment.reason = reason or assignment.reason

    audit = AuditLog(
        event="governance_role_revoked",
        actor_id=revoked_by,
        entity_type="governance_role_assignment",
        entity_id=str(assignment.id),
        metadata_json={"role_type": assignment.role_type, "reason": reason},
    )
    db.session.add(audit)
    db.session.commit()
    return assignment


def expire_roles():
    """Auto-expire time-bound roles that have passed their end date."""
    now = datetime.utcnow()
    expired = GovernanceRoleAssignment.query.filter(
        GovernanceRoleAssignment.is_active == True,
        GovernanceRoleAssignment.ends_at != None,
        GovernanceRoleAssignment.ends_at < now,
    ).all()
    for assignment in expired:
        assignment.is_active = False
        audit = AuditLog(
            event="governance_role_auto_expired",
            entity_type="governance_role_assignment",
            entity_id=str(assignment.id),
            metadata_json={"role_type": assignment.role_type},
        )
        db.session.add(audit)
    db.session.commit()
    return len(expired)


def check_eligibility(user_id, role_type):
    """Check if a user is eligible for a governance role based on certification and trust score."""
    link = GovernanceEligibilityLink.query.filter_by(role_key=role_type.lower()).first()
    if not link:
        # No specific requirement defined, allow by default
        return True, None

    # Check certification level
    if link.required_cert_level:
        active_certs = Certification.query.filter_by(
            user_id=user_id,
            status="active",
        ).count()
        if active_certs < link.required_cert_level:
            return False, f"Requires {link.required_cert_level} active certifications"

    # Check trust score if applicable
    trust = TrustScore.query.filter_by(user_id=user_id).first()
    if trust and not trust.governance_eligible:
        return False, "Trust score below governance eligibility threshold"

    return True, None


def get_active_roles(user_id):
    """Get all active governance roles for a user."""
    return GovernanceRoleAssignment.query.filter_by(
        user_id=user_id,
        is_active=True,
    ).all()


def cast_vote(voter_id, proposal_type, proposal_id, vote, reason=None):
    """Cast a governance vote."""
    conflict = ConflictOfInterestDeclaration.query.filter_by(
        actor_id=voter_id,
        related_entity_type=proposal_type,
        related_entity_id=str(proposal_id),
        active=True,
    ).first()
    if conflict:
        raise ValueError("Conflict of interest declaration active; vote excluded")
    existing = GovernanceVote.query.filter_by(
        proposal_type=proposal_type,
        proposal_id=proposal_id,
        voter_id=voter_id,
    ).first()
    if existing:
        raise ValueError("Already voted on this proposal")

    entry = GovernanceVote(
        proposal_type=proposal_type,
        proposal_id=proposal_id,
        voter_id=voter_id,
        vote=vote,
        reason=reason,
    )
    db.session.add(entry)

    influence_weight = credit_engine_service.compute_governance_weight(voter_id)
    if is_enabled("civic_credit_engine"):
        user = User.query.get(voter_id)
        credit_engine_service.award_credit(
            user_id=voter_id,
            node_id=user.node_id if user else 1,
            amount=5,
            source_type="governance",
            description="Governance participation credit",
            reference_id=str(entry.id),
        )
    audit = AuditLog(
        event="governance_vote_cast",
        actor_id=voter_id,
        entity_type="governance_vote",
        metadata_json={"proposal_type": proposal_type, "proposal_id": proposal_id, "vote": vote, "influence_weight": influence_weight},
    )
    db.session.add(audit)
    db.session.commit()
    return entry
