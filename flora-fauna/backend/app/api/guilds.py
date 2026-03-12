from flask import Blueprint, request, g
from flask_jwt_extended import verify_jwt_in_request

from ..models import Guild, GuildMembership, GuildRotation, GuildGoal
from ..security.policy import get_current_user, require_permission
from ..security.alpha import alpha_jwt_required
from ..services.feature_flag_service import is_enabled
from ..services.guild_matching_service import recommend_guilds
from .utils import ok, error
from ..extensions import db


guilds_bp = Blueprint("guilds", __name__, url_prefix="/guilds")


@guilds_bp.route("/", methods=["GET", "POST"])
def list_or_create():
    if not is_enabled("OIL_GUILDS"):
        return error("disabled", "Guilds disabled", status=403)
    if request.method == "GET":
        node_id = request.args.get("node_id") or getattr(g, "node_id", None)
        query = Guild.query.filter_by(active=True)
        if node_id:
            query = query.filter_by(node_id=int(node_id))
        guilds = query.order_by(Guild.created_at.desc()).all()
        return ok({"guilds": [{
            "id": g.id,
            "name": g.name,
            "type": g.type,
            "description": g.description,
            "node_id": g.node_id,
        } for g in guilds]})
    verify_jwt_in_request()
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return error("validation_error", "name required", status=400)
    guild = Guild(
        node_id=user.node_id or 1,
        type=payload.get("type", "organiser"),
        name=name,
        description=payload.get("description"),
        active=True,
    )
    db.session.add(guild)
    db.session.commit()
    return ok({"id": guild.id}, status=201)


@guilds_bp.route("/<int:guild_id>", methods=["GET"])
def detail(guild_id):
    if not is_enabled("OIL_GUILDS"):
        return error("disabled", "Guilds disabled", status=403)
    guild = Guild.query.get_or_404(guild_id)
    if getattr(g, "node_id", None) and guild.node_id != g.node_id:
        return error("not_found", "Guild not found", status=404)
    members = GuildMembership.query.filter_by(guild_id=guild.id, left_at=None).all()
    rotations = GuildRotation.query.filter_by(guild_id=guild.id).all()
    goals = GuildGoal.query.filter_by(guild_id=guild.id).all()
    return ok({
        "guild": {
            "id": guild.id,
            "name": guild.name,
            "type": guild.type,
            "description": guild.description,
        },
        "members": [{"user_id": m.user_id, "role": m.role_in_guild} for m in members],
        "rotations": [{"id": r.id, "role_name": r.role_name, "current_user_id": r.current_user_id} for r in rotations],
        "goals": [{"title": g.title, "target_value": g.target_value} for g in goals],
    })


@guilds_bp.route("/<int:guild_id>/rotations", methods=["POST"])
@alpha_jwt_required()
def add_rotation(guild_id):
    if not is_enabled("OIL_GUILDS"):
        return error("disabled", "Guilds disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    guild = Guild.query.get(guild_id)
    if not guild or not guild.active:
        return error("not_found", "Guild not found", status=404)
    if getattr(g, "node_id", None) and guild.node_id != g.node_id:
        return error("not_found", "Guild not found", status=404)
    payload = request.get_json() or {}
    role_name = (payload.get("role_name") or "").strip()
    if not role_name:
        return error("validation_error", "role_name required", status=400)
    rotation = GuildRotation(
        guild_id=guild_id,
        role_name=role_name,
        current_user_id=payload.get("current_user_id"),
        rotation_policy_json=payload.get("rotation_policy_json"),
    )
    db.session.add(rotation)
    db.session.commit()
    return ok({"id": rotation.id}, status=201)


@guilds_bp.route("/<int:guild_id>/join", methods=["POST"])
@alpha_jwt_required()
def join(guild_id):
    if not is_enabled("OIL_GUILDS"):
        return error("disabled", "Guilds disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    guild = Guild.query.get(guild_id)
    if not guild or not guild.active:
        return error("not_found", "Guild not found", status=404)
    if getattr(g, "node_id", None) and guild.node_id != g.node_id:
        return error("not_found", "Guild not found", status=404)
    existing = GuildMembership.query.filter_by(guild_id=guild_id, user_id=user.id, left_at=None).first()
    if existing:
        return ok({"message": "Already a member"})
    membership = GuildMembership(guild_id=guild_id, user_id=user.id, role_in_guild="member")
    db.session.add(membership)
    db.session.commit()
    return ok({"id": membership.id}, status=201)


@guilds_bp.route("/recommendations", methods=["GET"])
@alpha_jwt_required()
def recommendations():
    if not is_enabled("OIL_GUILDS"):
        return error("disabled", "Guilds disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    recs = recommend_guilds(user.id, user.node_id or 1, actor_id=user.id)
    return ok({"recommendations": recs})
