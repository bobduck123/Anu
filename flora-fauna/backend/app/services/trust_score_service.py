"""Trust score engine (non-gamified).

Computes a composite trust score based on:
- Contribution score (actions completed, events organized)
- Event completion multiplier
- Certification weight
- Time decay
- Incident penalty
- Governance eligibility threshold
Score is NOT publicly competitive.
"""
import math
from datetime import datetime, timedelta

from ..models import (
    TrustScore, User, Action, Todo, Event, Certification,
    Incident, GovernanceEligibilityLink, db,
)


GOVERNANCE_THRESHOLD = 50.0  # Minimum composite score for governance eligibility


def compute_trust_score(user_id):
    """Compute and store trust score for a user."""
    user = User.query.get(user_id)
    if not user:
        raise ValueError("User not found")

    # Contribution score: completed actions + organized events
    completed_todos = Todo.query.filter_by(user_id=user_id, is_completed=True).count()
    organized_events = Event.query.filter_by(user_id=user_id).count()
    contribution = min(100.0, (completed_todos * 2.0) + (organized_events * 5.0))

    # Event completion multiplier
    total_todos = Todo.query.filter_by(user_id=user_id).count()
    completion_ratio = completed_todos / max(total_todos, 1)
    event_multiplier = 0.5 + (completion_ratio * 0.5)  # 0.5 to 1.0

    # Certification weight
    active_certs = Certification.query.filter_by(user_id=user_id, status="active").count()
    cert_weight = min(30.0, active_certs * 10.0)

    # Time decay: reduce score slightly for inactive users
    latest_action = Todo.query.filter_by(user_id=user_id, is_completed=True).order_by(
        Todo.completed_at.desc()
    ).first()
    if latest_action and latest_action.completed_at:
        days_since = (datetime.utcnow() - latest_action.completed_at).days
        decay = max(0.5, 1.0 - (days_since / 365.0) * 0.3)
    else:
        decay = 0.7

    # Incident penalty
    incidents_against = Incident.query.filter_by(suspended_user_id=user_id).count()
    incident_pen = min(50.0, incidents_against * 15.0)

    # Composite score
    raw_score = (contribution * event_multiplier + cert_weight) * decay - incident_pen
    composite = max(0.0, min(100.0, raw_score))

    # Governance eligibility
    eligible = composite >= GOVERNANCE_THRESHOLD

    # Store
    trust = TrustScore.query.filter_by(user_id=user_id).first()
    if not trust:
        trust = TrustScore(user_id=user_id)
        db.session.add(trust)
    trust.contribution_score = contribution
    trust.event_completion_multiplier = event_multiplier
    trust.certification_weight = cert_weight
    trust.time_decay_factor = decay
    trust.incident_penalty = incident_pen
    trust.composite_score = composite
    trust.governance_eligible = eligible
    trust.last_computed_at = datetime.utcnow()
    db.session.commit()
    return trust


def get_trust_score(user_id):
    """Get trust score for a user, computing if not present."""
    trust = TrustScore.query.filter_by(user_id=user_id).first()
    if not trust:
        trust = compute_trust_score(user_id)
    return trust


def is_governance_eligible(user_id):
    """Check if user meets governance eligibility threshold."""
    trust = get_trust_score(user_id)
    return trust.governance_eligible
