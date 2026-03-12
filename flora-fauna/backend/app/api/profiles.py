from flask import Blueprint, request, jsonify

from ..extensions import db
from ..models import (
    User, WallPost, WallPostReaction, LearningNomination,
    CommunityFeedItem, StoryPost, Article, LearningTrack,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from .utils import ok, error

profiles_bp = Blueprint("profiles", __name__, url_prefix="/profiles")


# ── Profile CRUD ──────────────────────────────────────────────

@profiles_bp.route("/me", methods=["GET"])
@alpha_jwt_required()
def get_my_profile():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    return ok({"profile": _user_profile_dict(user)})


@profiles_bp.route("/me", methods=["PATCH"])
@alpha_jwt_required()
def update_my_profile():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = request.get_json() or {}
    allowed = {"bio", "avatarUrl", "bannerUrl", "profileTheme", "location", "websiteUrl"}
    field_map = {
        "bio": "bio",
        "avatarUrl": "avatar_url",
        "bannerUrl": "banner_url",
        "profileTheme": "profile_theme",
        "location": "location",
        "websiteUrl": "website_url",
    }
    for key, col in field_map.items():
        if key in data:
            setattr(user, col, data[key])
    db.session.commit()
    return ok({"profile": _user_profile_dict(user)})


@profiles_bp.route("/<string:username>", methods=["GET"])
def get_public_profile(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return error("not_found", "Profile not found", status=404)
    wall_posts = (
        WallPost.query
        .filter_by(profile_user_id=user.id)
        .order_by(WallPost.pinned.desc(), WallPost.created_at.desc())
        .limit(20)
        .all()
    )
    return ok({
        "profile": _user_profile_dict(user),
        "wallPosts": [p.to_dict() for p in wall_posts],
    })


def _user_profile_dict(user):
    return {
        "id": user.id,
        "username": user.username,
        "pseudonym": user.pseudonym,
        "role": user.role,
        "points": user.points,
        "level": user.level,
        "bio": user.bio,
        "avatarUrl": user.avatar_url,
        "bannerUrl": user.banner_url,
        "profileTheme": user.profile_theme,
        "location": user.location,
        "websiteUrl": user.website_url,
    }


# ── Wall Posts ────────────────────────────────────────────────

@profiles_bp.route("/<string:username>/wall", methods=["GET"])
def get_wall_posts(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return error("not_found", "Profile not found", status=404)
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 50)
    query = (
        WallPost.query
        .filter_by(profile_user_id=user.id)
        .order_by(WallPost.pinned.desc(), WallPost.created_at.desc())
    )
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return ok({
        "items": [p.to_dict() for p in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
        "pages": paginated.pages,
    })


@profiles_bp.route("/<string:username>/wall", methods=["POST"])
@alpha_jwt_required()
def create_wall_post(username):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    profile_user = User.query.filter_by(username=username).first()
    if not profile_user:
        return error("not_found", "Profile not found", status=404)
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    if not content:
        return error("validation", "Content is required", status=400)
    if len(content) > 2000:
        return error("validation", "Content too long (max 2000 chars)", status=400)
    post = WallPost(
        profile_user_id=profile_user.id,
        author_id=user.id,
        content=content,
        media_url=data.get("mediaUrl"),
        post_type=data.get("postType", "text"),
    )
    db.session.add(post)
    # Add to community feed
    db.session.add(CommunityFeedItem(
        node_id=user.node_id,
        user_id=user.id,
        item_type="wall_post",
        item_id=0,  # will update after flush
        summary=content[:200],
    ))
    db.session.commit()
    return jsonify(post.to_dict()), 201


@profiles_bp.route("/wall/<int:post_id>/react", methods=["POST"])
@alpha_jwt_required()
def react_to_wall_post(post_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    post = WallPost.query.get(post_id)
    if not post:
        return error("not_found", "Post not found", status=404)
    existing = WallPostReaction.query.filter_by(post_id=post_id, user_id=user.id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return ok({"reacted": False})
    reaction = WallPostReaction(post_id=post_id, user_id=user.id, reaction_type="like")
    db.session.add(reaction)
    db.session.commit()
    return ok({"reacted": True})


# ── Community Feed ────────────────────────────────────────────

@profiles_bp.route("/feed", methods=["GET"])
def community_feed():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 30, type=int), 50)
    query = CommunityFeedItem.query.order_by(CommunityFeedItem.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for fi in paginated.items:
        user = User.query.get(fi.user_id)
        items.append({
            "id": fi.id,
            "itemType": fi.item_type,
            "itemId": fi.item_id,
            "userId": fi.user_id,
            "pseudonym": user.pseudonym if user else "Unknown",
            "avatarUrl": user.avatar_url if user else None,
            "summary": fi.summary,
            "createdAt": fi.created_at.isoformat() if fi.created_at else None,
        })
    return ok({
        "items": items,
        "total": paginated.total,
        "page": paginated.page,
        "pages": paginated.pages,
    })


# ── Learning Nominations ─────────────────────────────────────

@profiles_bp.route("/nominations", methods=["GET"])
@alpha_jwt_required()
def get_nominations():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    received = LearningNomination.query.filter_by(nominee_id=user.id).order_by(LearningNomination.created_at.desc()).all()
    sent = LearningNomination.query.filter_by(nominator_id=user.id).order_by(LearningNomination.created_at.desc()).all()
    return ok({
        "received": [n.to_dict() for n in received],
        "sent": [n.to_dict() for n in sent],
    })


@profiles_bp.route("/nominations", methods=["POST"])
@alpha_jwt_required()
def create_nomination():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = request.get_json() or {}
    nominee_id = data.get("nomineeId")
    track_id = data.get("trackId")
    if not nominee_id or not track_id:
        return error("validation", "nomineeId and trackId are required", status=400)
    nominee = User.query.get(nominee_id)
    if not nominee:
        return error("not_found", "Nominee not found", status=404)
    track = LearningTrack.query.get(track_id)
    if not track:
        return error("not_found", "Track not found", status=404)
    existing = LearningNomination.query.filter_by(
        nominator_id=user.id, nominee_id=nominee_id, track_id=track_id, status="pending"
    ).first()
    if existing:
        return error("duplicate", "You already nominated this person for this track", status=409)
    nom = LearningNomination(
        nominator_id=user.id,
        nominee_id=nominee_id,
        track_id=track_id,
        reason=data.get("reason"),
    )
    db.session.add(nom)
    db.session.commit()
    return jsonify(nom.to_dict()), 201


@profiles_bp.route("/nominations/<int:nomination_id>/respond", methods=["POST"])
@alpha_jwt_required()
def respond_to_nomination(nomination_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    nom = LearningNomination.query.get(nomination_id)
    if not nom:
        return error("not_found", "Nomination not found", status=404)
    if nom.nominee_id != user.id:
        return error("forbidden", "Only the nominee can respond", status=403)
    data = request.get_json() or {}
    action = data.get("action")
    if action not in ("accept", "decline"):
        return error("validation", "action must be 'accept' or 'decline'", status=400)
    from datetime import datetime
    nom.status = "accepted" if action == "accept" else "declined"
    nom.resolved_at = datetime.utcnow()
    db.session.commit()
    return ok({"nomination": nom.to_dict()})
