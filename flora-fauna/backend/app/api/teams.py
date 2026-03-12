from datetime import datetime, timedelta

from flask import Blueprint, request
from sqlalchemy import func

from ..extensions import db
from ..models import (
    Team,
    TeamMember,
    TeamChallenge,
    TeamChallengeProgress,
    TeamAction,
    TeamActionCompletion,
    User,
    Event,
    StoryPost,
    Microcosm,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from .utils import ok, error


teams_bp = Blueprint("teams", __name__, url_prefix="/teams")


def _week_bounds():
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    week_start = datetime(week_start.year, week_start.month, week_start.day)
    week_end = week_start + timedelta(days=7)
    return week_start, week_end


def _team_member_ids(team_id):
    return [row.user_id for row in TeamMember.query.filter_by(team_id=team_id).all()]


@teams_bp.route("", methods=["GET"])
@alpha_jwt_required()
def list_teams():
    user = get_current_user()
    microcosm_id = request.args.get("microcosm_id", type=int)
    query = Team.query
    if microcosm_id:
        query = query.filter_by(microcosm_id=microcosm_id)
    teams = query.order_by(Team.created_at.desc()).all()
    payload = []
    for team in teams:
        member_count = TeamMember.query.filter_by(team_id=team.id).count()
        is_member = False
        if user:
            is_member = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first() is not None
        payload.append({
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "microcosm_id": team.microcosm_id,
            "microcosm_name": team.microcosm.name if team.microcosm else None,
            "created_by": team.created_by,
            "created_at": team.created_at.isoformat() if team.created_at else None,
            "member_count": member_count,
            "is_member": is_member,
        })
    return ok({"teams": payload})


@teams_bp.route("", methods=["POST"])
@alpha_jwt_required()
def create_team():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return error("validation_error", "name is required", status=400)
    microcosm_id = payload.get("microcosm_id")
    if microcosm_id is not None:
        microcosm = Microcosm.query.get(microcosm_id)
        if not microcosm:
            return error("not_found", "microcosm not found", status=404)
    team = Team(
        name=name[:120],
        description=(payload.get("description") or "")[:500],
        microcosm_id=microcosm_id,
        created_by=user.id,
    )
    db.session.add(team)
    db.session.commit()
    member = TeamMember(team_id=team.id, user_id=user.id, role="owner")
    db.session.add(member)
    db.session.commit()
    return ok({
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "microcosm_id": team.microcosm_id,
        "microcosm_name": team.microcosm.name if team.microcosm else None,
        "created_by": team.created_by,
        "member_count": 1,
        "is_member": True,
    }, status=201)


@teams_bp.route("/<int:team_id>/join", methods=["POST"])
@alpha_jwt_required()
def join_team(team_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    Team.query.get_or_404(team_id)
    existing = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    if existing:
        return ok({"joined": True})
    db.session.add(TeamMember(team_id=team_id, user_id=user.id))
    db.session.commit()
    return ok({"joined": True})


@teams_bp.route("/<int:team_id>/members", methods=["GET"])
@alpha_jwt_required()
def team_members(team_id):
    Team.query.get_or_404(team_id)
    members = db.session.query(TeamMember, User).join(User, TeamMember.user_id == User.id).filter(
        TeamMember.team_id == team_id
    ).all()
    payload = [{
        "id": user.id,
        "pseudonym": user.pseudonym,
        "role": member.role,
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
    } for member, user in members]
    return ok({"members": payload})


@teams_bp.route("/<int:team_id>/challenges", methods=["GET"])
@alpha_jwt_required()
def team_challenges(team_id):
    Team.query.get_or_404(team_id)
    week_start, week_end = _week_bounds()
    challenges = _ensure_team_challenges(team_id, week_start)
    payload = []
    for challenge in challenges:
        progress = _team_challenge_progress(team_id, challenge, week_start, week_end)
        record = TeamChallengeProgress.query.filter_by(challenge_id=challenge.id).first()
        if not record:
            record = TeamChallengeProgress(challenge_id=challenge.id, progress=progress)
            db.session.add(record)
        else:
            record.progress = progress
        if progress >= challenge.target and record.completed_at is None:
            record.completed_at = datetime.utcnow()
        payload.append({
            "id": challenge.id,
            "title": challenge.title,
            "description": challenge.description,
            "metric_type": challenge.metric_type,
            "target": challenge.target,
            "progress": progress,
            "reward_points": challenge.reward_points,
            "status": "complete" if progress >= challenge.target else "in_progress",
        })
    db.session.commit()
    return ok({"team_id": team_id, "challenges": payload})


@teams_bp.route("/<int:team_id>/actions", methods=["GET"])
@alpha_jwt_required()
def list_team_actions(team_id):
    Team.query.get_or_404(team_id)
    actions = TeamAction.query.filter_by(team_id=team_id).order_by(TeamAction.created_at.desc()).all()
    payload = []
    for action in actions:
        completed = TeamActionCompletion.query.filter_by(action_id=action.id).count()
        payload.append({
            "id": action.id,
            "title": action.title,
            "description": action.description,
            "due_date": action.due_date.isoformat() if action.due_date else None,
            "points": action.points,
            "created_by": action.created_by,
            "created_at": action.created_at.isoformat() if action.created_at else None,
            "completed_count": completed,
        })
    return ok({"actions": payload})


@teams_bp.route("/<int:team_id>/actions", methods=["POST"])
@alpha_jwt_required()
def create_team_action(team_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    Team.query.get_or_404(team_id)
    payload = request.get_json() or {}
    title = (payload.get("title") or "").strip()
    if not title:
        return error("validation_error", "title is required", status=400)
    due_date = payload.get("due_date")
    try:
        due_date = datetime.fromisoformat(due_date) if due_date else None
    except ValueError:
        due_date = None
    action = TeamAction(
        team_id=team_id,
        title=title[:200],
        description=(payload.get("description") or "")[:1000],
        due_date=due_date,
        points=int(payload.get("points") or 0),
        created_by=user.id,
    )
    db.session.add(action)
    db.session.commit()
    return ok({
        "id": action.id,
        "title": action.title,
        "description": action.description,
        "due_date": action.due_date.isoformat() if action.due_date else None,
        "points": action.points,
        "created_by": action.created_by,
        "created_at": action.created_at.isoformat() if action.created_at else None,
        "completed_count": 0,
    }, status=201)


@teams_bp.route("/<int:team_id>/actions/<int:action_id>/complete", methods=["POST"])
@alpha_jwt_required()
def complete_team_action(team_id, action_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    Team.query.get_or_404(team_id)
    action = TeamAction.query.filter_by(team_id=team_id, id=action_id).first_or_404()
    existing = TeamActionCompletion.query.filter_by(action_id=action.id, user_id=user.id).first()
    if existing:
        return ok({"completed": True})
    db.session.add(TeamActionCompletion(action_id=action.id, user_id=user.id))
    db.session.commit()
    return ok({"completed": True})


def _ensure_team_challenges(team_id, week_start):
    existing = TeamChallenge.query.filter_by(team_id=team_id, week_start=week_start.date()).all()
    if existing:
        return existing
    rotation = [
        {"metric_type": "team_actions_completed", "title": "Complete 8 Team Actions", "description": "Finish eight team actions together.", "target": 8, "reward_points": 80},
        {"metric_type": "team_events_hosted", "title": "Host 2 Events", "description": "Run two events by team members.", "target": 2, "reward_points": 60},
        {"metric_type": "team_stories_shared", "title": "Share 3 Stories", "description": "Publish three stories as a team.", "target": 3, "reward_points": 40},
    ]
    created = []
    for item in rotation:
        challenge = TeamChallenge(
            week_start=week_start.date(),
            team_id=team_id,
            title=item["title"],
            description=item["description"],
            metric_type=item["metric_type"],
            target=item["target"],
            reward_points=item["reward_points"],
        )
        db.session.add(challenge)
        created.append(challenge)
    db.session.commit()
    return created


def _team_challenge_progress(team_id, challenge, week_start, week_end):
    if challenge.metric_type == "team_actions_completed":
        return TeamActionCompletion.query.join(TeamAction, TeamActionCompletion.action_id == TeamAction.id).filter(
            TeamAction.team_id == team_id,
            TeamActionCompletion.completed_at >= week_start,
            TeamActionCompletion.completed_at < week_end,
        ).count()
    if challenge.metric_type == "team_events_hosted":
        member_ids = _team_member_ids(team_id)
        if not member_ids:
            return 0
        return Event.query.filter(
            Event.user_id.in_(member_ids),
            Event.created_at >= week_start,
            Event.created_at < week_end,
        ).count()
    if challenge.metric_type == "team_stories_shared":
        member_ids = _team_member_ids(team_id)
        if not member_ids:
            return 0
        return StoryPost.query.filter(
            StoryPost.user_id.in_(member_ids),
            StoryPost.created_at >= week_start,
            StoryPost.created_at < week_end,
        ).count()
    return 0
