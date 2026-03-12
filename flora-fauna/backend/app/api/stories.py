from datetime import datetime, timedelta
from flask import Blueprint, request, g
from sqlalchemy import func

from ..extensions import db
from ..models import StoryPost, StoryReaction, User
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from .utils import ok, error


stories_bp = Blueprint("stories", __name__, url_prefix="/stories")


def story_payload(post, reaction_counts=None):
    author = User.query.get(post.user_id)
    counts = reaction_counts or {}
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "media_url": post.media_url,
        "featured": bool(getattr(post, "featured", False)),
        "author_id": post.user_id,
        "author_pseudonym": author.pseudonym if author else "Anonymous",
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "reactions": counts,
    }


def _has_destructive_content(text):
    if not text:
        return False
    banned = ["kill", "harm", "threat", "violence", "attack", "abuse"]
    lower = text.lower()
    return any(word in lower for word in banned)


@stories_bp.route("", methods=["GET"])
def list_stories():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    if limit > 50:
        limit = 50
    query = StoryPost.query
    if getattr(g, "node_id", None):
        query = query.filter_by(node_id=g.node_id)
    query = query.order_by(StoryPost.featured.desc(), StoryPost.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    post_ids = [p.id for p in items]
    reaction_counts = {}
    if post_ids:
        rows = db.session.query(
            StoryReaction.post_id,
            StoryReaction.reaction_type,
            func.count(StoryReaction.id)
        ).filter(StoryReaction.post_id.in_(post_ids)).group_by(
            StoryReaction.post_id, StoryReaction.reaction_type
        ).all()
        for post_id, reaction_type, count in rows:
            reaction_counts.setdefault(post_id, {})[reaction_type] = int(count)
    payload = [story_payload(p, reaction_counts.get(p.id, {})) for p in items]
    return ok({
        "items": payload,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    })


@stories_bp.route("", methods=["POST"])
@alpha_jwt_required()
def create_story():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    title = payload.get("title", "").strip()
    content = payload.get("content", "").strip()
    if not title or not content:
        return error("validation_error", "title and content are required", status=400)
    if _has_destructive_content(title) or _has_destructive_content(content):
        return error("validation_error", "Content violates community safety guidelines", status=400)
    post = StoryPost(
        node_id=user.node_id,
        user_id=user.id,
        title=title[:200],
        content=content,
        media_url=payload.get("media_url"),
    )
    db.session.add(post)
    db.session.commit()
    return ok(story_payload(post), status=201)


@stories_bp.route("/<int:post_id>", methods=["DELETE"])
@alpha_jwt_required()
def delete_story(post_id):
    post = StoryPost.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    return ok({"deleted": True})


@stories_bp.route("/<int:post_id>/feature", methods=["POST"])
@alpha_jwt_required()
def feature_story(post_id):
    post = StoryPost.query.get_or_404(post_id)
    payload = request.get_json() or {}
    featured = bool(payload.get("featured", True))
    post.featured = featured
    db.session.commit()
    return ok(story_payload(post))


@stories_bp.route("/<int:post_id>/react", methods=["POST"])
@alpha_jwt_required()
def react_story(post_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    reaction_type = (payload.get("reaction") or "clap").strip().lower()
    if reaction_type not in {"clap", "heart", "spark"}:
        return error("validation_error", "invalid reaction", status=400)
    existing = StoryReaction.query.filter_by(
        post_id=post_id, user_id=user.id, reaction_type=reaction_type
    ).first()
    if existing:
        db.session.delete(existing)
    else:
        db.session.add(StoryReaction(post_id=post_id, user_id=user.id, reaction_type=reaction_type))
    db.session.commit()

    rows = db.session.query(
        StoryReaction.reaction_type,
        func.count(StoryReaction.id)
    ).filter(StoryReaction.post_id == post_id).group_by(StoryReaction.reaction_type).all()
    counts = {reaction: int(count) for reaction, count in rows}
    return ok({"post_id": post_id, "reactions": counts})


@stories_bp.route("/timeline", methods=["GET"])
def stories_timeline():
    period = (request.args.get("period") or "weekly").lower()
    limit = int(request.args.get("limit", 12))
    if limit > 52:
        limit = 52
    now = datetime.utcnow()

    def week_start(dt):
        start = dt - timedelta(days=dt.weekday())
        return datetime(start.year, start.month, start.day)

    def month_start(dt):
        return datetime(dt.year, dt.month, 1)

    if period == "monthly":
        buckets = []
        cursor = month_start(now)
        for _ in range(limit):
            start = cursor
            if start.month == 12:
                end = datetime(start.year + 1, 1, 1)
            else:
                end = datetime(start.year, start.month + 1, 1)
            buckets.append((start, end))
            cursor = start - timedelta(days=1)
            cursor = month_start(cursor)
        buckets.reverse()
    else:
        buckets = []
        cursor = week_start(now)
        for _ in range(limit):
            start = cursor
            end = start + timedelta(days=7)
            buckets.append((start, end))
            cursor = start - timedelta(days=7)
        buckets.reverse()
        period = "weekly"

    earliest = buckets[0][0] if buckets else now
    posts = StoryPost.query.filter(StoryPost.created_at >= earliest).all()
    points = []
    cumulative = 0
    thresholds = [5, 10, 25, 50]
    milestones = []

    for start, end in buckets:
        count = sum(1 for p in posts if p.created_at and start <= p.created_at < end)
        cumulative += count
        label = start.strftime("%b %d") if period == "weekly" else start.strftime("%b %Y")
        milestone = None
        for threshold in thresholds:
            if cumulative >= threshold and not any(m["threshold"] == threshold for m in milestones):
                milestone = threshold
                milestones.append({
                    "threshold": threshold,
                    "label": f"{threshold} stories",
                    "achieved_at": end.isoformat(),
                })
        points.append({
            "label": label,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "count": count,
            "cumulative": cumulative,
            "milestone": milestone,
        })

    return ok({
        "period": period,
        "points": points,
        "milestones": milestones,
        "total": cumulative,
    })
