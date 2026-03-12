from datetime import datetime, timedelta
from flask import Blueprint, request, g
from sqlalchemy import func

from ..extensions import db
from ..models import (
    User,
    Action,
    Event,
    Article,
    Todo,
    Comment,
    WeeklyChallenge,
    UserWeeklyChallenge,
    Node,
    NodeStreak,
    StoryPost,
    CollaborativeChallenge,
    CollaborativeProgress,
    Microcosm,
    MicrocosmStreak,
    Team,
    TeamMember,
    TeamActionCompletion,
    TeamAction,
    ImpactPool,
    ImpactLedgerEntry,
    Microcosm,
    StoryPost,
    Constellation,
)
from ..security.alpha import alpha_jwt_required
from ..services.feature_flag_service import is_enabled
from ..security.policy import get_current_user
from .utils import ok


engagement_bp = Blueprint("engagement", __name__, url_prefix="/engagement")


@engagement_bp.route("/impact-summary", methods=["GET"])
def impact_summary():
    node_id = getattr(g, "node_id", None)
    action_query = Action.query
    event_query = Event.query
    article_query = Article.query
    user_query = User.query
    if node_id:
        action_query = action_query.filter_by(node_id=node_id)
        event_query = event_query.filter_by(node_id=node_id)
        article_query = article_query.filter_by(node_id=node_id)
        user_query = user_query.filter_by(node_id=node_id)

    total_actions = action_query.count()
    total_events = event_query.count()
    total_articles = article_query.count()
    total_members = user_query.count()
    total_completions = db.session.query(func.coalesce(func.sum(Action.completions), 0)).filter(Action.node_id == node_id) \
        .scalar() if node_id else db.session.query(func.coalesce(func.sum(Action.completions), 0)).scalar()
    total_points = db.session.query(func.coalesce(func.sum(User.points), 0)).filter(User.node_id == node_id) \
        .scalar() if node_id else db.session.query(func.coalesce(func.sum(User.points), 0)).scalar()
    total_event_attendance = db.session.query(func.coalesce(func.sum(Event.attendees), 0)).filter(Event.node_id == node_id) \
        .scalar() if node_id else db.session.query(func.coalesce(func.sum(Event.attendees), 0)).scalar()
    if node_id:
        completed_todos = Todo.query.join(User, Todo.user_id == User.id).filter(User.node_id == node_id, Todo.is_completed == True).count()
    else:
        completed_todos = Todo.query.filter_by(is_completed=True).count()

    pools = ImpactPool.query.filter_by(node_id=node_id).all() if node_id else ImpactPool.query.all()
    pool_by_slug = {p.slug: p for p in pools}
    relief_pool = pool_by_slug.get("relief") or pool_by_slug.get("relief_pool")
    savings_pool = pool_by_slug.get("savings") or pool_by_slug.get("savings_pool")
    relief_paid = 0
    savings_total = 0
    if relief_pool:
        relief_paid = db.session.query(func.coalesce(func.sum(ImpactLedgerEntry.amount_cents), 0)).filter(
            ImpactLedgerEntry.pool_id == relief_pool.id,
            ImpactLedgerEntry.amount_cents < 0,
        ).scalar() or 0
        relief_paid = abs(int(relief_paid))
    if savings_pool:
        savings_total = db.session.query(func.coalesce(func.sum(ImpactLedgerEntry.amount_cents), 0)).filter(
            ImpactLedgerEntry.pool_id == savings_pool.id,
        ).scalar() or 0
        savings_total = int(savings_total)
    totals = {
        "actions": int(total_actions),
        "events": int(total_events),
        "articles": int(total_articles),
        "members": int(total_members),
        "completions": int(total_completions or 0),
        "points": int(total_points or 0),
        "actions_completed": int(total_completions or 0),
        "event_attendance": int(total_event_attendance or 0),
        "volunteer_hours": int(completed_todos or 0),
        "relief_paid_cents": int(relief_paid),
        "savings_cents": int(savings_total),
    }
    return ok(totals)


@engagement_bp.route("/challenges", methods=["GET"])
@alpha_jwt_required()
def challenges():
    user = get_current_user()
    if not user:
        return ok({"challenges": []})

    week_start, week_end = current_week_bounds()
    weekly = ensure_weekly_challenges(week_start)
    challenges_payload = []

    for challenge in weekly:
        if not challenge_applies(challenge, user):
            continue
        progress = progress_for_challenge(challenge, user, week_start, week_end)
        record = UserWeeklyChallenge.query.filter_by(
            user_id=user.id,
            challenge_id=challenge.id,
        ).first()
        if not record:
            record = UserWeeklyChallenge(
                user_id=user.id,
                challenge_id=challenge.id,
                progress=progress,
            )
            db.session.add(record)
        else:
            record.progress = progress

        if progress >= challenge.target and not record.reward_granted:
            record.completed_at = record.completed_at or datetime.utcnow()
            record.reward_granted = True
            user.points += challenge.reward_points

        challenges_payload.append({
            "id": challenge.challenge_type,
            "title": challenge.title,
            "description": challenge.description,
            "target": challenge.target,
            "progress": progress,
            "reward_points": challenge.reward_points,
            "status": "complete" if progress >= challenge.target else "in_progress",
        })

    db.session.commit()
    return ok({"challenges": challenges_payload})


@engagement_bp.route("/recommendations", methods=["GET"])
def recommendations():
    rec_type = (request.args.get("type") or "actions").lower()
    limit = int(request.args.get("limit", 6))
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    try:
        lat = float(lat) if lat is not None else None
        lng = float(lng) if lng is not None else None
    except ValueError:
        lat = None
        lng = None

    if rec_type in ("events", "event"):
        items = recommend_events(limit=limit, lat=lat, lng=lng)
        return ok({"type": "events", "items": [e.to_dict() for e in items]})
    items = recommend_actions(limit=limit, lat=lat, lng=lng)
    return ok({"type": "actions", "items": [a.to_dict() for a in items]})


@engagement_bp.route("/discover-feed", methods=["GET"])
def discover_feed():
    now = datetime.utcnow()
    upcoming_events = Event.query.filter(Event.date >= now).order_by(Event.date.asc()).limit(6).all()
    top_actions = Action.query.order_by(db.func.coalesce(Action.completions, 0).desc(), Action.created_at.desc()).limit(6).all()
    microcosms = Microcosm.query.order_by(Microcosm.id.desc()).limit(6).all()
    stories = StoryPost.query.order_by(StoryPost.created_at.desc()).limit(4).all()
    articles = Article.query.order_by(Article.created_at.desc()).limit(4).all()
    featured_constellations = []
    if is_enabled("OIL_CONSTELLATIONS"):
        featured_constellations = Constellation.query.filter_by(active=True).order_by(Constellation.created_at.desc()).limit(4).all()

    # Fallbacks to avoid empty demos
    if not upcoming_events:
        upcoming_events = Event.query.order_by(Event.created_at.desc()).limit(3).all()
    if not top_actions:
        top_actions = Action.query.order_by(Action.created_at.desc()).limit(3).all()
    if not microcosms:
        microcosms = Microcosm.query.order_by(Microcosm.id.asc()).limit(3).all()

    return ok({
        "upcoming_events": [e.to_dict() for e in upcoming_events],
        "top_actions": [a.to_dict() for a in top_actions],
        "active_microcosms": [{
            "id": m.id,
            "name": m.name,
            "description": m.description,
        } for m in microcosms],
        "featured_constellations": [{
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "domain": c.domain,
        } for c in featured_constellations],
        "highlighted_stories": [{
            "id": s.id,
            "title": s.title,
            "content": s.content[:240] if s.content else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        } for s in stories],
        "highlighted_articles": [{
            "id": a.id,
            "title": a.title,
            "content": a.content[:240] if a.content else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        } for a in articles],
    })


@engagement_bp.route("/recognition", methods=["GET"])
def recognition():
    week_start, week_end = current_week_bounds()

    top_members = User.query.order_by(User.points.desc()).limit(5).all()
    top_payload = [{
        "id": u.id,
        "pseudonym": u.pseudonym,
        "points": u.points,
        "role": u.role,
    } for u in top_members]

    organizers = db.session.query(
        User.id, User.pseudonym, func.count(Event.id).label("events_hosted")
    ).join(Event, Event.user_id == User.id).filter(
        Event.created_at >= week_start,
        Event.created_at < week_end
    ).group_by(User.id).order_by(func.count(Event.id).desc()).limit(5).all()
    org_payload = [{
        "id": row.id,
        "pseudonym": row.pseudonym,
        "events_hosted": int(row.events_hosted),
    } for row in organizers]

    nodes = db.session.query(
        Node.id, Node.name, func.count(User.id).label("member_count")
    ).join(User, User.node_id == Node.id).group_by(Node.id).order_by(func.count(User.id).desc()).limit(5).all()
    node_payload = [{
        "id": row.id,
        "name": row.name,
        "member_count": int(row.member_count),
    } for row in nodes]

    return ok({
        "top_members": top_payload,
        "organizers": org_payload,
        "active_nodes": node_payload,
    })


@engagement_bp.route("/collaborative", methods=["GET"])
def collaborative():
    scope_type = (request.args.get("scope") or "node").lower()
    scope_id = request.args.get("scope_id")
    week_start, week_end = current_week_bounds()

    if scope_type == "node":
        if not scope_id:
            default_node = Node.query.filter_by(is_default=True).first()
            scope_id = default_node.id if default_node else None
        scope_id = int(scope_id) if scope_id is not None else None
        if scope_id is None:
            return ok({"challenges": []})
        node = Node.query.get(scope_id)
        scope_name = node.name if node else "Node"
        challenges = ensure_collaborative_challenges(week_start, "node", scope_id)
        payload = build_collaborative_payload(challenges, week_start, week_end)
        return ok({"scope": "node", "scope_id": scope_id, "scope_name": scope_name, "challenges": payload})

    if scope_type == "microcosm":
        if not scope_id:
            return ok({"challenges": []})
        scope_id = int(scope_id)
        micro = Microcosm.query.get(scope_id)
        scope_name = micro.name if micro else "Microcosm"
        challenges = ensure_collaborative_challenges(week_start, "microcosm", scope_id)
        payload = build_collaborative_payload(challenges, week_start, week_end)
        return ok({"scope": "microcosm", "scope_id": scope_id, "scope_name": scope_name, "challenges": payload})

    return ok({"challenges": []})


@engagement_bp.route("/pool-metrics", methods=["GET"])
def pool_metrics():
    from ..models import ImpactPool
    from ..services.ledger_service import pool_balance
    pools = ImpactPool.query.all()
    total_balance = 0
    total_target = 0
    active = 0
    for pool in pools:
        total_balance += pool_balance(pool.node_id, pool.id)
        if pool.target_amount_cents:
            total_target += int(pool.target_amount_cents)
        if pool.is_active:
            active += 1
    return ok({
        "total_pools": len(pools),
        "active_pools": active,
        "total_target_cents": total_target,
        "total_balance_cents": total_balance,
    })


@engagement_bp.route("/streaks", methods=["GET"])
def streaks():
    scope = (request.args.get("scope") or "node").lower()
    scope_id = request.args.get("scope_id")
    week_start, week_end = current_week_bounds()

    if scope == "node":
        if not scope_id:
            default_node = Node.query.filter_by(is_default=True).first()
            scope_id = default_node.id if default_node else None
        scope_id = int(scope_id) if scope_id is not None else None
        if scope_id is None:
            return ok({"streaks": []})
        payload = _node_streak_payload(scope_id, week_start, week_end)
        return ok(payload)

    if scope == "microcosm":
        if scope_id:
            payload = _microcosm_streak_payload(int(scope_id), week_start, week_end)
            return ok(payload)
        microcosms = Microcosm.query.all()
        payloads = [_microcosm_streak_payload(m.id, week_start, week_end) for m in microcosms]
        return ok({"streaks": payloads})

    if scope == "team":
        if not scope_id:
            team = Team.query.first()
            scope_id = team.id if team else None
        scope_id = int(scope_id) if scope_id is not None else None
        if scope_id is None:
            return ok({"streaks": []})
        payload = _team_streak_payload(scope_id, week_start, week_end)
        return ok(payload)

    return ok({"streaks": []})


@engagement_bp.route("/trending", methods=["GET"])
def trending():
    rec_type = (request.args.get("type") or "actions").lower()
    limit = int(request.args.get("limit", 6))
    if rec_type in ("events", "event"):
        items = score_events()[:limit]
        return ok({"type": "events", "items": items})
    items = score_actions()[:limit]
    return ok({"type": "actions", "items": items})


def current_week_bounds():
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    week_start = datetime(week_start.year, week_start.month, week_start.day)
    week_end = week_start + timedelta(days=7)
    return week_start, week_end


def ensure_weekly_challenges(week_start):
    if WeeklyChallenge.query.filter_by(week_start=week_start.date()).count() > 0:
        return WeeklyChallenge.query.filter_by(week_start=week_start.date()).all()

    rotations = [
        [
            {"challenge_type": "complete_actions", "title": "Complete 3 Actions", "description": "Finish three actions to boost your impact streak.", "target": 3, "reward_points": 25, "audience": "any"},
            {"challenge_type": "host_event", "title": "Host an Event", "description": "Create a community event.", "target": 1, "reward_points": 40, "audience": "organizer"},
            {"challenge_type": "publish_story", "title": "Publish a Story", "description": "Share a short community story or update.", "target": 1, "reward_points": 20, "audience": "any"},
            {"challenge_type": "create_actions", "title": "Create 2 Actions", "description": "Add new actions for the community.", "target": 2, "reward_points": 30, "audience": "organizer"},
        ],
        [
            {"challenge_type": "complete_actions", "title": "Complete 5 Actions", "description": "Build momentum with five completed actions.", "target": 5, "reward_points": 35, "audience": "any"},
            {"challenge_type": "create_actions", "title": "Create 1 Action", "description": "Add a fresh action for others to join.", "target": 1, "reward_points": 20, "audience": "organizer"},
            {"challenge_type": "publish_story", "title": "Share 2 Stories", "description": "Post two updates or stories.", "target": 2, "reward_points": 30, "audience": "any"},
            {"challenge_type": "add_comments", "title": "Add 3 Comments", "description": "Encourage others with thoughtful comments.", "target": 3, "reward_points": 15, "audience": "any"},
        ],
        [
            {"challenge_type": "complete_actions", "title": "Complete 2 Actions", "description": "Start the week with two quick wins.", "target": 2, "reward_points": 20, "audience": "any"},
            {"challenge_type": "host_event", "title": "Host 2 Events", "description": "Run two community events this week.", "target": 2, "reward_points": 60, "audience": "organizer"},
            {"challenge_type": "publish_story", "title": "Publish 1 Story", "description": "Tell the community what you're doing.", "target": 1, "reward_points": 20, "audience": "any"},
            {"challenge_type": "add_comments", "title": "Add 5 Comments", "description": "Lift up others with five comments.", "target": 5, "reward_points": 20, "audience": "any"},
        ],
    ]

    week_index = int(week_start.strftime("%U")) % len(rotations)
    rotation = rotations[week_index]
    created = []
    for item in rotation:
        challenge = WeeklyChallenge(
            week_start=week_start.date(),
            challenge_type=item["challenge_type"],
            title=item["title"],
            description=item["description"],
            target=item["target"],
            reward_points=item["reward_points"],
            audience=item.get("audience", "any"),
        )
        db.session.add(challenge)
        created.append(challenge)
    db.session.commit()
    return created


def challenge_applies(challenge, user):
    if challenge.audience == "any":
        return True
    if challenge.audience == "organizer":
        return user.role == "organizer"
    if challenge.audience == "participant":
        return user.role != "organizer"
    return True


def progress_for_challenge(challenge, user, week_start, week_end):
    if challenge.challenge_type == "complete_actions":
        return Todo.query.filter(
            Todo.user_id == user.id,
            Todo.is_completed.is_(True),
            Todo.completed_at >= week_start,
            Todo.completed_at < week_end,
        ).count()
    if challenge.challenge_type == "create_actions":
        return Action.query.filter(
            Action.user_id == user.id,
            Action.created_at >= week_start,
            Action.created_at < week_end,
        ).count()
    if challenge.challenge_type == "host_event":
        return Event.query.filter(
            Event.user_id == user.id,
            Event.created_at >= week_start,
            Event.created_at < week_end,
        ).count()
    if challenge.challenge_type == "publish_story":
        return Article.query.filter(
            Article.author_id == user.id,
            Article.created_at >= week_start,
            Article.created_at < week_end,
        ).count()
    if challenge.challenge_type == "add_comments":
        return Comment.query.filter(
            Comment.user_id == user.id,
            Comment.timestamp >= week_start,
            Comment.timestamp < week_end,
        ).count()
    return 0


def ensure_collaborative_challenges(week_start, scope_type, scope_id):
    existing = CollaborativeChallenge.query.filter_by(
        week_start=week_start.date(),
        scope_type=scope_type,
        scope_id=scope_id,
    ).all()
    if existing:
        return existing

    rotation = []
    if scope_type == "node":
        rotation = [
            {"metric_type": "node_actions_completed", "title": "Complete 20 Actions Together", "description": "Finish 20 actions as a node this week.", "target": 20, "reward_points": 100},
            {"metric_type": "node_events_hosted", "title": "Host 5 Events", "description": "Run five events as a node.", "target": 5, "reward_points": 120},
            {"metric_type": "node_stories_shared", "title": "Share 5 Stories", "description": "Post 5 community stories this week.", "target": 5, "reward_points": 80},
        ]
    if scope_type == "microcosm":
        rotation = [
            {"metric_type": "microcosm_articles", "title": "Publish 3 Posts", "description": "Publish three posts in this microcosm.", "target": 3, "reward_points": 60},
            {"metric_type": "microcosm_comments", "title": "Add 5 Comments", "description": "Add five comments inside this microcosm.", "target": 5, "reward_points": 40},
        ]

    created = []
    for item in rotation:
        challenge = CollaborativeChallenge(
            week_start=week_start.date(),
            scope_type=scope_type,
            scope_id=scope_id,
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


def build_collaborative_payload(challenges, week_start, week_end):
    payload = []
    for challenge in challenges:
        progress = collaborative_progress(challenge, week_start, week_end)
        record = CollaborativeProgress.query.filter_by(challenge_id=challenge.id).first()
        if not record:
            record = CollaborativeProgress(challenge_id=challenge.id, progress=progress)
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
    return payload


def collaborative_progress(challenge, week_start, week_end):
    if challenge.metric_type == "node_actions_completed":
        return Todo.query.join(User, Todo.user_id == User.id).filter(
            User.node_id == challenge.scope_id,
            Todo.is_completed.is_(True),
            Todo.completed_at >= week_start,
            Todo.completed_at < week_end,
        ).count()
    if challenge.metric_type == "node_events_hosted":
        return Event.query.join(User, Event.user_id == User.id).filter(
            User.node_id == challenge.scope_id,
            Event.created_at >= week_start,
            Event.created_at < week_end,
        ).count()
    if challenge.metric_type == "node_stories_shared":
        return StoryPost.query.join(User, StoryPost.user_id == User.id).filter(
            User.node_id == challenge.scope_id,
            StoryPost.created_at >= week_start,
            StoryPost.created_at < week_end,
        ).count()
    if challenge.metric_type == "microcosm_articles":
        return Article.query.filter(
            Article.microcosm_id == challenge.scope_id,
            Article.created_at >= week_start,
            Article.created_at < week_end,
        ).count()
    if challenge.metric_type == "microcosm_comments":
        return Comment.query.join(Article, Comment.article_id == Article.id).filter(
            Article.microcosm_id == challenge.scope_id,
            Comment.timestamp >= week_start,
            Comment.timestamp < week_end,
        ).count()
    return 0


def score_actions():
    now = datetime.utcnow()
    actions = Action.query.order_by(Action.created_at.desc()).limit(100).all()
    scored = []
    for action in actions:
        days = (now - (action.created_at or now)).days
        recency = max(0, 10 - days)  # max 10 points if created today
        closing = 0
        if action.end_date:
            days_left = (action.end_date - now).days
            closing = 5 if days_left <= 3 else 0
        score = (action.completions or 0) * 3 + (action.points_assigned or 0) / 10 + recency + closing
        label = "Trending"
        if action.created_at and (now - action.created_at).days <= 7:
            label = "New"
        if action.end_date and (action.end_date - now).days <= 3:
            label = "Closing Soon"
        scored.append({
            "score": score,
            "label": label,
            "item": action.to_dict(),
        })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return [
        {**entry["item"], "trend_score": entry["score"], "trend_label": entry["label"]}
        for entry in scored
    ]


def score_events():
    now = datetime.utcnow()
    events = Event.query.order_by(Event.date.asc()).limit(100).all()
    scored = []
    for event in events:
        days = (now - (event.created_at or now)).days
        recency = max(0, 10 - days)
        closing = 0
        if event.date:
            days_left = (event.date - now).days
            closing = 5 if days_left <= 3 else 0
        score = (event.attendees or 0) * 3 + (event.goal or 0) / 10 + recency + closing
        label = "Trending"
        if event.created_at and (now - event.created_at).days <= 7:
            label = "New"
        if event.date and (event.date - now).days <= 3:
            label = "Closing Soon"
        scored.append({
            "score": score,
            "label": label,
            "item": event.to_dict(),
        })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return [
        {**entry["item"], "trend_score": entry["score"], "trend_label": entry["label"]}
        for entry in scored
    ]


def recommend_actions(limit=6, lat=None, lng=None):
    query = Action.query.order_by(Action.completions.desc(), Action.created_at.desc())
    actions = query.limit(50).all()
    if lat is None or lng is None:
        return actions[:limit]
    scored = []
    for action in actions:
        if action.latitude is None or action.longitude is None:
            scored.append((999999, action))
        else:
            scored.append((haversine_km(lat, lng, action.latitude, action.longitude), action))
    scored.sort(key=lambda x: x[0])
    return [a for _, a in scored[:limit]]


def recommend_events(limit=6, lat=None, lng=None):
    query = Event.query.order_by(Event.date.asc(), Event.attendees.desc(), Event.created_at.desc())
    events = query.limit(50).all()
    if lat is None or lng is None:
        return events[:limit]
    scored = []
    for event in events:
        if event.latitude is None or event.longitude is None:
            scored.append((999999, event))
        else:
            scored.append((haversine_km(lat, lng, event.latitude, event.longitude), event))
    scored.sort(key=lambda x: x[0])
    return [e for _, e in scored[:limit]]


def haversine_km(lat1, lon1, lat2, lon2):
    import math
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _node_streak_payload(node_id, week_start, week_end):
    node = Node.query.get(node_id)
    node_name = node.name if node else "Node"
    streak = NodeStreak.query.filter_by(node_id=node_id).first()
    if not streak:
        streak = NodeStreak(node_id=node_id, current_streak=0, best_streak=0, reward_points_granted=0)
        db.session.add(streak)

    active, stats = _node_week_activity(node_id, week_start, week_end)
    _apply_streak_update(streak, week_start, active)
    db.session.commit()

    return {
        "scope": "node",
        "scope_id": node_id,
        "scope_name": node_name,
        "current_streak": streak.current_streak,
        "best_streak": streak.best_streak,
        "last_week_start": streak.last_week_start.isoformat() if streak.last_week_start else None,
        "reward_points_granted": streak.reward_points_granted,
        "weekly_stats": stats,
        "reward_milestones": _streak_milestones(streak.current_streak),
    }


def _microcosm_streak_payload(microcosm_id, week_start, week_end):
    micro = Microcosm.query.get(microcosm_id)
    micro_name = micro.name if micro else "Microcosm"
    streak = MicrocosmStreak.query.filter_by(microcosm_id=microcosm_id).first()
    if not streak:
        streak = MicrocosmStreak(microcosm_id=microcosm_id, current_streak=0, best_streak=0, reward_points_granted=0)
        db.session.add(streak)

    active, stats = _microcosm_week_activity(microcosm_id, week_start, week_end)
    _apply_streak_update(streak, week_start, active)
    db.session.commit()

    return {
        "scope": "microcosm",
        "scope_id": microcosm_id,
        "scope_name": micro_name,
        "current_streak": streak.current_streak,
        "best_streak": streak.best_streak,
        "last_week_start": streak.last_week_start.isoformat() if streak.last_week_start else None,
        "reward_points_granted": streak.reward_points_granted,
        "weekly_stats": stats,
        "reward_milestones": _streak_milestones(streak.current_streak),
    }


def _team_streak_payload(team_id, week_start, week_end):
    team = Team.query.get(team_id)
    team_name = team.name if team else "Team"
    active, stats = _team_week_activity(team_id, week_start, week_end)
    return {
        "scope": "team",
        "scope_id": team_id,
        "scope_name": team_name,
        "current_streak": stats.get("active_weeks", 0),
        "best_streak": stats.get("active_weeks", 0),
        "last_week_start": week_start.date().isoformat(),
        "reward_points_granted": 0,
        "weekly_stats": stats,
        "reward_milestones": _streak_milestones(stats.get("active_weeks", 0)),
    }


def _apply_streak_update(streak, week_start, active):
    last_week = streak.last_week_start
    if not active:
        if last_week and last_week < week_start.date() - timedelta(days=7):
            streak.current_streak = 0
        return

    if last_week == week_start.date():
        return

    if last_week == (week_start - timedelta(days=7)).date():
        streak.current_streak += 1
    else:
        streak.current_streak = 1
    streak.last_week_start = week_start.date()
    streak.best_streak = max(streak.best_streak, streak.current_streak)
    streak.reward_points_granted += _reward_for_streak(streak.current_streak)


def _reward_for_streak(current_streak):
    milestones = {2: 10, 4: 20, 8: 40, 12: 75}
    return milestones.get(current_streak, 0)


def _streak_milestones(current_streak):
    milestones = [2, 4, 8, 12]
    return {
        "next": next((m for m in milestones if m > current_streak), None),
        "completed": [m for m in milestones if m <= current_streak],
    }


def _node_week_activity(node_id, week_start, week_end):
    actions_completed = Todo.query.join(User, Todo.user_id == User.id).filter(
        User.node_id == node_id,
        Todo.is_completed.is_(True),
        Todo.completed_at >= week_start,
        Todo.completed_at < week_end,
    ).count()
    events_hosted = Event.query.join(User, Event.user_id == User.id).filter(
        User.node_id == node_id,
        Event.created_at >= week_start,
        Event.created_at < week_end,
    ).count()
    stories_shared = StoryPost.query.join(User, StoryPost.user_id == User.id).filter(
        User.node_id == node_id,
        StoryPost.created_at >= week_start,
        StoryPost.created_at < week_end,
    ).count()
    total = actions_completed + events_hosted + stories_shared
    active = total >= 3
    return active, {
        "actions_completed": actions_completed,
        "events_hosted": events_hosted,
        "stories_shared": stories_shared,
        "threshold": 3,
        "is_active": active,
    }


def _microcosm_week_activity(microcosm_id, week_start, week_end):
    articles = Article.query.filter(
        Article.microcosm_id == microcosm_id,
        Article.created_at >= week_start,
        Article.created_at < week_end,
    ).count()
    comments = Comment.query.join(Article, Comment.article_id == Article.id).filter(
        Article.microcosm_id == microcosm_id,
        Comment.timestamp >= week_start,
        Comment.timestamp < week_end,
    ).count()
    total = articles + comments
    active = total >= 2
    return active, {
        "articles": articles,
        "comments": comments,
        "threshold": 2,
        "is_active": active,
    }


def _team_week_activity(team_id, week_start, week_end):
    member_ids = [row.user_id for row in TeamMember.query.filter_by(team_id=team_id).all()]
    if not member_ids:
        return False, {
            "team_actions_completed": 0,
            "events_hosted": 0,
            "threshold": 2,
            "is_active": False,
            "active_weeks": 0,
        }
    actions_completed = TeamActionCompletion.query.join(TeamAction, TeamActionCompletion.action_id == TeamAction.id).filter(
        TeamAction.team_id == team_id,
        TeamActionCompletion.completed_at >= week_start,
        TeamActionCompletion.completed_at < week_end,
    ).count()
    events_hosted = Event.query.filter(
        Event.user_id.in_(member_ids),
        Event.created_at >= week_start,
        Event.created_at < week_end,
    ).count()
    total = actions_completed + events_hosted
    active = total >= 2
    return active, {
        "team_actions_completed": actions_completed,
        "events_hosted": events_hosted,
        "threshold": 2,
        "is_active": active,
        "active_weeks": 1 if active else 0,
    }
