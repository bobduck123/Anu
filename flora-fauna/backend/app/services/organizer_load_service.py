from datetime import datetime, timedelta

from ..models import OrganizerLoadSnapshot, Event, GovernanceVote, TeamActionCompletion, AuditRecord, db


def compute_load_for_user(user_id):
    since = datetime.utcnow() - timedelta(days=30)
    event_count = Event.query.filter(
        Event.user_id == user_id,
        Event.created_at >= since,
    ).count()

    governance_votes = GovernanceVote.query.filter(
        GovernanceVote.voter_id == user_id,
        GovernanceVote.created_at >= since,
    ).count()

    team_actions = TeamActionCompletion.query.filter(
        TeamActionCompletion.user_id == user_id,
        TeamActionCompletion.completed_at >= since,
    ).count()

    volunteer_hours = float(team_actions) * 1.5
    load_score = (event_count * 2.0) + (governance_votes * 1.5) + volunteer_hours

    if load_score >= 25:
        alert = "high"
    elif load_score >= 12:
        alert = "elevated"
    else:
        alert = "normal"

    snapshot = OrganizerLoadSnapshot(
        user_id=user_id,
        event_count_30d=event_count,
        governance_votes_30d=governance_votes,
        volunteer_hours=volunteer_hours,
        load_score=load_score,
        alert_level=alert,
    )
    db.session.add(snapshot)
    db.session.add(AuditRecord(
        actor_id=user_id,
        action="organizer_load_snapshot",
        entity_type="organizer_load_snapshot",
        entity_id=str(user_id),
        payload={"score": load_score, "alert": alert},
    ))
    db.session.commit()
    return snapshot
