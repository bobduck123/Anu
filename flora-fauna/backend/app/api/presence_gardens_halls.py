from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import verify_jwt_in_request

from ..extensions import db, limiter
from ..models import (
    GardenSeed,
    HallActivityEvent,
    HallParticipant,
    HallPortal,
    HallSession,
    HallStall,
    HallZone,
    ModerationFlag,
    MoodBoard,
    MoodBoardItem,
    Observation,
    Path,
    PresenceGarden,
    PresenceHall,
    PresenceNode,
    SharedSpace,
)
from ..security.alpha import alpha_jwt_required
from ..security.control_plane import control_plane_required
from ..security.policy import get_current_user
from ..services.presence_garden_service import (
    enforce_garden_visibility,
    get_garden_home,
    get_or_create_default_garden,
    get_public_garden,
    list_garden_activity,
    serialize_garden,
    update_garden,
)
from ..services.presence_hall_analytics_service import owner_hall_dashboard
from ..services.presence_hall_moderation_service import (
    admin_controls,
    create_hall_moderation_action,
    host_controls,
    report_hall_content,
    serialize_hall_moderation_action,
)
from ..services.presence_hall_service import (
    add_portal,
    add_stall,
    add_zone,
    create_hall,
    create_session,
    get_hall,
    join_hall,
    leave_hall,
    list_public_halls,
    list_room_halls,
    serialize_hall,
    serialize_participant,
    serialize_portal,
    serialize_session,
    serialize_stall,
    serialize_zone,
    transition_session_status,
    update_hall,
    update_portal,
    update_stall,
    update_zone,
)
from ..services.presence_hall_activity_service import (
    record_hall_activity_event,
    record_portal_click,
    record_stall_visit,
    serialize_hall_activity_event,
)
from ..services.presence_observation_service import (
    create_observation,
    delete_or_hide_observation,
    echo_observation,
    list_garden_observations,
    list_hall_observations,
    serialize_echo,
    serialize_observation,
    update_observation,
)
from ..services.presence_owner_identity import resolve_or_provision_presence_owner
from ..services.presence_path_service import generate_path_from_hall, serialize_path
from ..services.presence_seed_service import (
    create_or_update_seed,
    compost_inactive_seeds,
    nurture_seed,
    prune_seed,
    recompute_garden_weights,
    serialize_nurture,
    serialize_prune,
    serialize_seed,
)
from ..services.presence_service import PresenceValidationError
from ..services.presence_shared_space_service import record_shared_space, serialize_shared_space
from ..services.presence_social_service import get_or_create_observer_for_user, serialize_moderation_flag, serialize_mood_board
from .utils import error, ok


observer_garden_bp = Blueprint("observer_garden", __name__, url_prefix="/observer")
garden_alias_bp = Blueprint("garden_alias", __name__, url_prefix="/garden")
gardens_bp = Blueprint("gardens", __name__, url_prefix="/gardens")
observations_alias_bp = Blueprint("observations_alias", __name__, url_prefix="/observations")
masks_bp = Blueprint("masks", __name__, url_prefix="/masks")
halls_bp = Blueprint("halls", __name__, url_prefix="/halls")
presence_hall_owner_bp = Blueprint("presence_hall_owner", __name__, url_prefix="/presence/owner")
hall_paths_bp = Blueprint("hall_paths", __name__, url_prefix="/paths")
admin_presence_garden_hall_bp = Blueprint("admin_presence_garden_hall", __name__, url_prefix="/admin/presence")


def _json_payload() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _validation_error(exc: PresenceValidationError):
    return error("validation_error", str(exc), 400, details=getattr(exc, "details", None) or None)


def _current_optional_observer():
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return None
    user = get_current_user()
    if not user:
        return None
    return get_or_create_observer_for_user(user, {})


def _current_observer_or_error():
    user = get_current_user()
    if not user:
        return None, error("unauthorized", "Authentication required.", 401)
    return get_or_create_observer_for_user(user, {}), None


def _resolve_owner_user():
    return resolve_or_provision_presence_owner()


def _load_owned_room(room_id: int):
    room = PresenceNode.query.get(room_id)
    if not room:
        return None, error("not_found", "Presence Room not found.", 404)
    user = _resolve_owner_user()
    if not user:
        return None, error("unauthorized", "Authentication required.", 401)
    if getattr(user, "role", None) != "platform_admin" and room.owner_user_id != user.id:
        return None, error("forbidden", "You do not have access to this Presence Room.", 403)
    return room, None


def _hall_read_allowed(hall: PresenceHall, *, observer=None, user=None) -> bool:
    if hall.visibility in {"public", "unlisted"}:
        return True
    if user and getattr(user, "role", None) == "platform_admin":
        return True
    if observer and hall.host_observer_id == observer.id:
        return True
    if observer and HallParticipant.query.filter_by(hall_id=hall.id, observer_id=observer.id).first():
        return True
    if user and hall.host_room and hall.host_room.owner_user_id == user.id:
        return True
    return False


def _require_hall_control(hall: PresenceHall):
    user = _resolve_owner_user() or get_current_user()
    if not user:
        return None, None, error("unauthorized", "Authentication required.", 401)
    observer = get_or_create_observer_for_user(user, {})
    if getattr(user, "role", None) == "platform_admin":
        return user, observer, None
    if observer and hall.host_observer_id == observer.id:
        return user, observer, None
    if hall.host_room and hall.host_room.owner_user_id == user.id:
        return user, observer, None
    host_participant = HallParticipant.query.filter(
        HallParticipant.hall_id == hall.id,
        HallParticipant.observer_id == observer.id,
        HallParticipant.role.in_(["host", "cohost", "moderator"]),
        HallParticipant.status.in_(["joined", "present", "away"]),
    ).first()
    if host_participant:
        return user, observer, None
    return user, observer, error("forbidden", "You do not have moderation access to this Hall.", 403)


def _load_hall_or_error(hall_id_or_slug):
    hall = get_hall(hall_id_or_slug)
    if not hall:
        return None, error("not_found", "Hall not found.", 404)
    return hall, None


def _canonical_hall_payload(data: dict) -> dict:
    payload = dict(data or {})
    if payload.get("visibility") == "invite":
        payload["visibility"] = "invite_only"
    if "rules_text" not in payload and "rules" in payload:
        payload["rules_text"] = payload.get("rules")
    metadata = dict(payload.get("metadata") or payload.get("metadata_json") or {})
    if payload.get("cover_image_url") is not None:
        metadata["cover_image_url"] = payload.get("cover_image_url")
    if metadata:
        payload["metadata"] = metadata
    return payload


def _canonical_zone_payload(data: dict) -> dict:
    payload = dict(data or {})
    if "zone_type" not in payload and "zone_kind" in payload:
        payload["zone_type"] = payload.get("zone_kind")
    if "description" not in payload and "blurb" in payload:
        payload["description"] = payload.get("blurb")
    metadata = dict(payload.get("metadata") or payload.get("metadata_json") or {})
    for key in ("order_index", "links_to_kind", "links_to_id", "links_to_slug", "links_to_label", "participants_here"):
        if key in payload:
            metadata[key] = payload.get(key)
    if metadata:
        payload["metadata"] = metadata
    return payload


def _canonical_portal_payload(data: dict) -> dict:
    payload = dict(data or {})
    if "target_type" not in payload and "destination_kind" in payload:
        payload["target_type"] = payload.get("destination_kind")
    if "target_id" not in payload and "destination_id" in payload:
        payload["target_id"] = payload.get("destination_id")
    metadata = dict(payload.get("metadata") or payload.get("metadata_json") or {})
    if payload.get("destination_slug") is not None:
        metadata["destination_slug"] = payload.get("destination_slug")
    if metadata:
        payload["metadata"] = metadata
    return payload


def _canonical_stall_payload(data: dict) -> dict:
    payload = dict(data or {})
    metadata = dict(payload.get("metadata") or payload.get("metadata_json") or {})
    if payload.get("short_pitch") is not None:
        metadata["short_pitch"] = payload.get("short_pitch")
    if metadata:
        payload["metadata"] = metadata
    return payload


def _canonical_session_payload(data: dict) -> dict:
    payload = dict(data or {})
    metadata = dict(payload.get("metadata") or payload.get("metadata_json") or {})
    if payload.get("host_label") is not None:
        metadata["host_label"] = payload.get("host_label")
    if metadata:
        payload["metadata"] = metadata
    return payload


def _seed_action(seed_id: int, action: str):
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    seed = GardenSeed.query.filter_by(id=seed_id, garden_id=garden.id).first()
    if not seed:
        return error("not_found", "Seed not found.", 404)
    try:
        if action == "nurture":
            nurture_seed(garden, seed, observer, nurture_type=_json_payload().get("nurture_type") or "manual_keep_close", metadata=_json_payload().get("metadata"))
        elif action == "compost":
            seed.status = "composted"
            seed.current_weight = 0
        else:
            prune_type = "block" if action == "block" else (_json_payload().get("prune_type") or "prune")
            prune_seed(garden, seed, prune_type=prune_type, reason=_json_payload().get("reason"), reporter_observer=observer)
        db.session.commit()
        return ok({"seed": serialize_seed(seed)}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


def _hall_status_payload(participant: HallParticipant, *, joined: bool) -> dict:
    payload = serialize_participant(participant)
    payload.update(
        {
            "participant": serialize_participant(participant),
            "joined": joined,
            "available_actions": ["post_observation", "visit_stall", "open_portal"] if joined else [],
        }
    )
    return payload


def _load_owner_hall(hall_id: int, room_id: int | None = None):
    room = None
    if room_id:
        room, err = _load_owned_room(room_id)
        if err:
            return None, None, err
        hall = PresenceHall.query.filter_by(id=hall_id, host_room_id=room.id).first()
    else:
        user = _resolve_owner_user()
        if not user:
            return None, None, error("unauthorized", "Authentication required.", 401)
        hall = PresenceHall.query.get(hall_id)
        if hall and getattr(user, "role", None) != "platform_admin" and hall.host_room and hall.host_room.owner_user_id != user.id:
            return None, None, error("forbidden", "You do not have access to this Hall.", 403)
        room = hall.host_room if hall else None
    if not hall:
        return None, room, error("not_found", "Hall not found.", 404)
    return hall, room, None


def _positive_int_arg(name: str, *, default: int = 0, maximum: int = 100) -> int:
    try:
        value = int(request.args.get(name, default))
    except (TypeError, ValueError):
        return default
    return max(0, min(value, maximum))


def _int_or_none(value) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _room_id_from_request(payload: dict | None = None) -> int | None:
    payload = payload or {}
    return _int_or_none(payload.get("host_room_id") or payload.get("room_id") or request.args.get("room_id"))


def _frontend_garden_home(observer, payload: dict) -> dict:
    sections = payload.get("sections") or {}
    garden = payload.get("garden") or {}
    observer_payload = garden.get("observer_mask") or {}
    observer_payload.setdefault("id", getattr(observer, "id", None))
    return {
        "observer": observer_payload,
        "sections": [
            _frontend_garden_section("new_growth", "New Growth", "Fresh Observations from strong Seeds.", sections.get("new_growth", [])),
            _frontend_garden_section("recently_watered", "Recently Watered", "Seeds you watered.", sections.get("recently_watered", [])),
            _frontend_garden_section("crossed_paths", "Crossed Paths", "Recent shared Presence context.", sections.get("crossed_paths", [])),
            _frontend_garden_section("from_rooms", "From Rooms You Entered", "Rooted in Rooms you entered.", sections.get("from_rooms_you_entered", [])),
            _frontend_garden_section("from_mood_boards", "From Your Mood Boards", "Taste overlaps from Mood Boards.", sections.get("from_your_mood_boards", [])),
            _frontend_garden_section("quiet_shoots", "Quiet Shoots", "Underexposed Seeds with enough signal.", sections.get("quiet_shoots", [])),
            _frontend_garden_section("wilting_seeds", "Wilting Seeds", "Seeds decaying unless nurtured.", sections.get("wilting_seeds", [])),
            _frontend_garden_section("compost", "Compost", "Old inactive Seeds kept out of the main surface.", sections.get("compost", [])),
        ],
    }


def _frontend_garden_section(section_id: str, title: str, blurb: str, rows: list) -> dict:
    section = {"id": section_id, "title": title, "blurb": blurb}
    if section_id == "new_growth":
        section["observations"] = [row.get("observation", row) for row in rows if isinstance(row, dict)]
    elif section_id == "crossed_paths":
        section["shared_spaces"] = [_frontend_shared_space_dict(row) for row in rows if isinstance(row, dict)]
    else:
        section["seeds"] = rows
    return section


def _frontend_shared_space(row: SharedSpace) -> dict:
    payload = serialize_shared_space(row)
    return _frontend_shared_space_dict(payload)


def _frontend_shared_space_dict(payload: dict) -> dict:
    other_kind = "room"
    other_id = payload.get("room_id") or payload.get("space_id") or payload.get("id")
    other_label = "Shared Presence context"
    other_slug = None
    if payload.get("room_id"):
        room = PresenceNode.query.get(payload.get("room_id"))
        other_kind = "room"
        other_label = getattr(room, "display_name", None) or other_label
        other_slug = getattr(room, "slug", None)
    elif payload.get("hall_id"):
        hall = PresenceHall.query.get(payload.get("hall_id"))
        other_kind = "hall"
        other_id = payload.get("hall_id")
        other_label = getattr(hall, "title", None) or other_label
        other_slug = getattr(hall, "slug", None)
    elif payload.get("path_id"):
        path = Path.query.get(payload.get("path_id"))
        other_kind = "path"
        other_id = payload.get("path_id")
        other_label = getattr(path, "title", None) or other_label
    return {
        "id": payload.get("id"),
        "observer_id": payload.get("observer_id"),
        "other_kind": other_kind,
        "other_id": other_id,
        "other_label": other_label,
        "other_slug": other_slug,
        "context_label": payload.get("space_type"),
        "last_overlap_at": payload.get("occurred_at"),
    }


def _seed_target_from_mood_board_item(item: MoodBoardItem, board: MoodBoard) -> tuple[str, int | None]:
    if item.item_type == "room" and item.item_id:
        return "room", item.item_id
    if item.item_type == "path" and item.item_id:
        return "path", item.item_id
    if item.item_type == "mood_board" and item.item_id:
        return "mood_board", item.item_id
    if item.item_type == "hall" and item.item_id:
        return "hall", item.item_id
    return "mood_board", board.id


@observer_garden_bp.route("/garden", methods=["GET"])
@alpha_jwt_required()
def observer_garden():
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    db.session.commit()
    return ok(serialize_garden(garden, private=True))


@observer_garden_bp.route("/garden", methods=["PATCH"])
@alpha_jwt_required()
def observer_patch_garden():
    observer, err = _current_observer_or_error()
    if err:
        return err
    try:
        garden = update_garden(get_or_create_default_garden(observer), _json_payload())
        db.session.commit()
        return ok(serialize_garden(garden, private=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@gardens_bp.route("/<alias_or_slug>", methods=["GET"])
def public_garden(alias_or_slug):
    garden = get_public_garden(alias_or_slug)
    if not garden:
        return error("not_found", "Garden not found.", 404)
    return ok(serialize_garden(garden))


@gardens_bp.route("/<int:garden_id>/observations", methods=["GET"])
def public_garden_observations(garden_id):
    garden = PresenceGarden.query.get(garden_id)
    if not garden:
        return error("not_found", "Garden not found.", 404)
    observer = _current_optional_observer()
    try:
        enforce_garden_visibility(garden, observer=observer)
        include_private = bool(observer and observer.id == garden.observer_id)
        return ok({"items": [serialize_observation(row) for row in list_garden_observations(garden, include_private=include_private)]})
    except PresenceValidationError as exc:
        return _validation_error(exc)


@gardens_bp.route("/<int:garden_id>/seeds", methods=["GET"])
def public_garden_seeds(garden_id):
    garden = PresenceGarden.query.get(garden_id)
    if not garden:
        return error("not_found", "Garden not found.", 404)
    observer = _current_optional_observer()
    try:
        enforce_garden_visibility(garden, observer=observer)
    except PresenceValidationError as exc:
        return _validation_error(exc)
    rows = GardenSeed.query.filter_by(garden_id=garden.id).filter(GardenSeed.status.in_(["active", "wilting", "composted"])).order_by(GardenSeed.current_weight.desc()).all()
    return ok({"items": [serialize_seed(row) for row in rows]})


@observer_garden_bp.route("/observations", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("40 per minute; 160 per hour")
def observer_create_observation():
    observer, err = _current_observer_or_error()
    if err:
        return err
    try:
        row = create_observation(observer, _json_payload())
        db.session.commit()
        return ok(serialize_observation(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_garden_bp.route("/observations/<int:observation_id>", methods=["PATCH"])
@alpha_jwt_required()
def observer_update_observation(observation_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    row = Observation.query.filter_by(id=observation_id, author_observer_id=observer.id).first()
    if not row:
        return error("not_found", "Observation not found.", 404)
    try:
        update_observation(row, _json_payload())
        db.session.commit()
        return ok(serialize_observation(row))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_garden_bp.route("/observations/<int:observation_id>", methods=["DELETE"])
@alpha_jwt_required()
def observer_delete_observation(observation_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    row = Observation.query.filter_by(id=observation_id, author_observer_id=observer.id).first()
    if not row:
        return error("not_found", "Observation not found.", 404)
    delete_or_hide_observation(row)
    db.session.commit()
    return ok({"deleted": True})


@observer_garden_bp.route("/observations/<int:observation_id>/echo", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("30 per minute; 120 per hour")
def observer_echo_observation(observation_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    source = Observation.query.get(observation_id)
    if not source:
        return error("not_found", "Observation not found.", 404)
    try:
        echo = echo_observation(observer, source, _json_payload())
        db.session.commit()
        return ok(serialize_echo(echo), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_garden_bp.route("/seeds/<int:seed_id>/nurture", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("60 per minute; 240 per hour")
def observer_nurture_seed(seed_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    seed = GardenSeed.query.filter_by(id=seed_id, garden_id=garden.id).first()
    if not seed:
        return error("not_found", "Seed not found.", 404)
    try:
        nurture = nurture_seed(garden, seed, observer, nurture_type=_json_payload().get("nurture_type") or "manual_keep_close", metadata=_json_payload().get("metadata"))
        db.session.commit()
        return ok({"nurture": serialize_nurture(nurture), "seed": serialize_seed(seed)}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_garden_bp.route("/seeds/<int:seed_id>/prune", methods=["POST"])
@alpha_jwt_required()
def observer_prune_seed(seed_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    seed = GardenSeed.query.filter_by(id=seed_id, garden_id=garden.id).first()
    if not seed:
        return error("not_found", "Seed not found.", 404)
    try:
        payload = _json_payload()
        prune = prune_seed(garden, seed, prune_type=payload.get("prune_type") or "prune", reason=payload.get("reason"), reporter_observer=observer)
        db.session.commit()
        return ok({"prune": serialize_prune(prune), "seed": serialize_seed(seed)}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_garden_bp.route("/garden/home", methods=["GET"])
@alpha_jwt_required()
def observer_garden_home():
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    payload = get_garden_home(garden)
    db.session.commit()
    return ok(payload)


@observer_garden_bp.route("/garden/seeds", methods=["GET"])
@alpha_jwt_required()
def observer_garden_seeds():
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    rows = GardenSeed.query.filter_by(garden_id=garden.id).order_by(GardenSeed.current_weight.desc()).all()
    return ok({"items": [serialize_seed(row) for row in rows]})


@observer_garden_bp.route("/garden/recompute", methods=["POST"])
@alpha_jwt_required()
def observer_recompute_garden():
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    rows = recompute_garden_weights(garden)
    compost_inactive_seeds(garden)
    db.session.commit()
    return ok({"items": [serialize_seed(row) for row in rows]})


@garden_alias_bp.route("", methods=["GET"])
@alpha_jwt_required()
def garden_alias_current():
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    db.session.commit()
    return ok(serialize_garden(garden, private=True))


@garden_alias_bp.route("", methods=["PATCH"])
@alpha_jwt_required()
def garden_alias_patch():
    return observer_patch_garden()


@garden_alias_bp.route("/home", methods=["GET"])
@alpha_jwt_required()
def garden_alias_home():
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    payload = get_garden_home(garden)
    db.session.commit()
    return ok(_frontend_garden_home(observer, payload))


@garden_alias_bp.route("/seeds", methods=["GET"])
@alpha_jwt_required()
def garden_alias_seeds():
    observer, err = _current_observer_or_error()
    if err:
        return err
    garden = get_or_create_default_garden(observer)
    rows = GardenSeed.query.filter_by(garden_id=garden.id).order_by(GardenSeed.current_weight.desc()).all()
    return ok({"items": [serialize_seed(row) for row in rows]})


@garden_alias_bp.route("/shared-spaces", methods=["GET"])
@observer_garden_bp.route("/garden/shared-spaces", methods=["GET"])
@alpha_jwt_required()
def garden_alias_shared_spaces():
    observer, err = _current_observer_or_error()
    if err:
        return err
    rows = SharedSpace.query.filter_by(observer_id=observer.id).order_by(SharedSpace.occurred_at.desc(), SharedSpace.id.desc()).limit(100).all()
    return ok({"items": [_frontend_shared_space(row) for row in rows]})


@garden_alias_bp.route("/seeds/<int:seed_id>/nurture", methods=["POST"])
@alpha_jwt_required()
def garden_alias_nurture_seed(seed_id):
    return _seed_action(seed_id, "nurture")


@garden_alias_bp.route("/seeds/<int:seed_id>/prune", methods=["POST"])
@alpha_jwt_required()
def garden_alias_prune_seed(seed_id):
    return _seed_action(seed_id, "prune")


@garden_alias_bp.route("/seeds/<int:seed_id>/compost", methods=["POST"])
@observer_garden_bp.route("/seeds/<int:seed_id>/compost", methods=["POST"])
@alpha_jwt_required()
def garden_alias_compost_seed(seed_id):
    return _seed_action(seed_id, "compost")


@garden_alias_bp.route("/seeds/<int:seed_id>/block", methods=["POST"])
@observer_garden_bp.route("/seeds/<int:seed_id>/block", methods=["POST"])
@alpha_jwt_required()
def garden_alias_block_seed(seed_id):
    return _seed_action(seed_id, "block")


@observations_alias_bp.route("", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("40 per minute; 160 per hour")
def observations_alias_create():
    return observer_create_observation()


@observations_alias_bp.route("/by-mask/<alias>", methods=["GET"])
def observations_alias_by_mask(alias):
    garden = get_public_garden(alias)
    if not garden:
        return error("not_found", "Garden not found.", 404)
    return ok({"items": [serialize_observation(row) for row in list_garden_observations(garden)]})


@observations_alias_bp.route("/<int:observation_id>", methods=["GET"])
def observations_alias_get(observation_id):
    row = Observation.query.get(observation_id)
    if not row or row.status != "active" or row.visibility not in {"public", "garden", "unlisted", "hall"}:
        return error("not_found", "Observation not found.", 404)
    return ok(serialize_observation(row))


@observations_alias_bp.route("/<int:observation_id>", methods=["DELETE"])
@alpha_jwt_required()
def observations_alias_delete(observation_id):
    return observer_delete_observation(observation_id)


@observations_alias_bp.route("/<int:observation_id>/nurture", methods=["POST", "DELETE"])
@alpha_jwt_required()
def observations_alias_nurture(observation_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    row = Observation.query.get(observation_id)
    if not row or row.status != "active":
        return error("not_found", "Observation not found.", 404)
    if request.method == "DELETE":
        metadata = dict(row.metadata_json or {})
        metadata["has_nurtured"] = False
        row.metadata_json = metadata
        db.session.commit()
        return ok({"observation": serialize_observation(row)})
    garden = get_or_create_default_garden(observer)
    seed = create_or_update_seed(
        garden,
        seed_type="observer",
        seed_id=row.author_observer_id,
        source_type="reply",
        source_ref_id=row.id,
        reason_label="You nurtured this Mask's Observation.",
        metadata={"observation_id": row.id},
    )
    nurture_seed(garden, seed, observer, nurture_type="manual_keep_close", metadata={"observation_id": row.id})
    metadata = dict(row.metadata_json or {})
    metadata["has_nurtured"] = True
    row.metadata_json = metadata
    db.session.commit()
    return ok({"observation": serialize_observation(row)}, 201)


@observations_alias_bp.route("/<int:observation_id>/echoes", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("30 per minute; 120 per hour")
def observations_alias_echo(observation_id):
    return observer_echo_observation(observation_id)


@observations_alias_bp.route("/<int:observation_id>/report", methods=["POST"])
@alpha_jwt_required()
def observations_alias_report(observation_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    row = Observation.query.get(observation_id)
    if not row or row.status not in {"active", "flagged"}:
        return error("not_found", "Observation not found.", 404)
    payload = _json_payload()
    flag = ModerationFlag(
        reporter_observer_id=observer.id,
        target_type="observation",
        target_id=row.id,
        reason=payload.get("reason") or "Reported Observation.",
        status="open",
    )
    row.moderation_state = "flagged"
    db.session.add(flag)
    db.session.commit()
    return ok({"received": True, "flag": serialize_moderation_flag(flag)}, 201)


@masks_bp.route("/<alias>", methods=["GET"])
def masks_alias_public(alias):
    garden = get_public_garden(alias)
    if not garden:
        return error("not_found", "Mask not found.", 404)
    observations = list_garden_observations(garden, include_private=False, limit=20)
    echoes = [echo for echo in garden.echoes if echo.status == "active"][:20]
    boards = MoodBoard.query.filter_by(owner_type="observer", observer_id=garden.observer_id, status="active").filter(MoodBoard.visibility.in_(["public", "unlisted"])).order_by(MoodBoard.created_at.desc()).limit(12).all()
    seeds = GardenSeed.query.filter_by(garden_id=garden.id).filter(GardenSeed.status.in_(["active", "wilting"])).order_by(GardenSeed.current_weight.desc()).limit(12).all()
    return ok(
        {
            "observer": serialize_garden(garden)["observer_mask"],
            "pinned_observation": serialize_observation(garden.pinned_observation) if getattr(garden, "pinned_observation", None) else None,
            "pinned_mood_board_id": garden.pinned_mood_board_id,
            "current_path_id": None,
            "current_path_label": None,
            "public_mood_boards": [serialize_mood_board(row, include_items=True) for row in boards],
            "recent_observations": [serialize_observation(row) for row in observations],
            "echoes": [serialize_echo(row) for row in echoes],
            "field_notes": [],
            "rooms_returned_to": [],
            "seeds_kept_close": [serialize_seed(row) for row in seeds],
            "guestbook_enabled": True,
        }
    )


@observer_garden_bp.route("/mood-boards/<int:board_id>/items/<int:item_id>/seed", methods=["POST"])
@alpha_jwt_required()
def observer_mood_board_item_seed(board_id, item_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    board = MoodBoard.query.filter_by(id=board_id, owner_type="observer", observer_id=observer.id).first()
    if not board:
        return error("not_found", "Mood Board not found.", 404)
    item = MoodBoardItem.query.filter_by(id=item_id, mood_board_id=board.id).first()
    if not item:
        return error("not_found", "Mood Board item not found.", 404)
    garden = get_or_create_default_garden(observer)
    seed_type, seed_id = _seed_target_from_mood_board_item(item, board)
    shared = record_shared_space(
        space_type="mood_board",
        space_id=board.id,
        observer=observer,
        strength=45,
        metadata={"mood_board_id": board.id, "mood_board_item_id": item.id, "item_type": item.item_type},
        create_seed=False,
    )
    seed = create_or_update_seed(
        garden,
        seed_type=seed_type,
        seed_id=seed_id,
        source_type="mood_board_overlap",
        source_ref_id=shared.id,
        reason_label="Added from your Mood Board.",
        metadata={"mood_board_id": board.id, "mood_board_item_id": item.id, "source_label": item.title},
    )
    nurture_seed(garden, seed, observer, nurture_type="mood_board_add", metadata={"mood_board_item_id": item.id})
    db.session.commit()
    return ok({"seed": serialize_seed(seed), "reason_label": seed.reason_label, "garden_home_update_hint": "from_mood_boards"}, 201)


@halls_bp.route("", methods=["GET"])
def public_halls():
    limit = _positive_int_arg("limit", default=50, maximum=100)
    offset = _positive_int_arg("offset", default=0, maximum=10000)
    base_query = PresenceHall.query.filter(PresenceHall.visibility.in_(["public", "unlisted"]), PresenceHall.status.in_(["scheduled", "live", "ended"]))
    query = base_query
    if request.args.get("status"):
        query = query.filter_by(status=request.args.get("status"))
    if request.args.get("hall_type"):
        query = query.filter_by(hall_type=request.args.get("hall_type"))
    host_room_id = _int_or_none(request.args.get("host_room_id"))
    if host_room_id:
        query = query.filter_by(host_room_id=host_room_id)
    total = query.count()
    rows = query.order_by(PresenceHall.starts_at.desc().nullslast(), PresenceHall.created_at.desc()).offset(offset).limit(limit).all()
    return ok(
        {
            "items": [serialize_hall(row) for row in rows],
            "total": total,
            "live_count": base_query.filter_by(status="live").count(),
            "scheduled_count": base_query.filter_by(status="scheduled").count(),
        }
    )


@halls_bp.route("", methods=["POST"])
@alpha_jwt_required()
def create_public_hall():
    observer, err = _current_observer_or_error()
    if err:
        return err
    payload = _canonical_hall_payload(_json_payload())
    try:
        if payload.get("host_type") == "room" and payload.get("host_room_id"):
            room, room_err = _load_owned_room(int(payload.get("host_room_id")))
            if room_err:
                return room_err
            hall = create_hall(payload, host_type="room", host_room=room, host_observer=None, actor_user=_resolve_owner_user())
        else:
            hall = create_hall(payload, host_type="observer", host_observer=observer)
        db.session.commit()
        return ok(serialize_hall(hall, include_children=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id_or_slug>", methods=["GET"])
def read_hall(hall_id_or_slug):
    hall, err = _load_hall_or_error(hall_id_or_slug)
    if err:
        return err
    observer = _current_optional_observer()
    user = get_current_user()
    if not _hall_read_allowed(hall, observer=observer, user=user):
        return error("forbidden", "Hall is private.", 403)
    return ok(serialize_hall(hall, include_children=True))


@halls_bp.route("/<hall_id>", methods=["PATCH"])
@alpha_jwt_required()
def patch_hall(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    try:
        update_hall(hall, _canonical_hall_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_hall(hall, include_children=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/join", methods=["POST"])
@limiter.limit("60 per minute; 240 per hour")
def join_hall_route(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    try:
        participant = join_hall(hall, observer=observer, guest_token=_json_payload().get("guest_token"), data=_json_payload())
        record_hall_activity_event(
            hall,
            "join",
            observer=observer,
            guest_token=participant.guest_token,
            room_id=participant.room_id,
            session_id=participant.session_id,
            source=_json_payload().get("source") or "hall_join",
            metadata={"participant_id": participant.id},
        )
        db.session.commit()
        return ok(_hall_status_payload(participant, joined=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/leave", methods=["POST"])
def leave_hall_route(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    try:
        participant = leave_hall(hall, observer=observer, guest_token=_json_payload().get("guest_token"))
        record_hall_activity_event(
            hall,
            "leave",
            observer=observer,
            guest_token=participant.guest_token,
            room_id=participant.room_id,
            session_id=participant.session_id,
            source=_json_payload().get("source") or "hall_leave",
            metadata={"participant_id": participant.id},
        )
        db.session.commit()
        return ok(_hall_status_payload(participant, joined=False))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/participants", methods=["GET"])
def hall_participants(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    if not _hall_read_allowed(hall, observer=observer, user=get_current_user()):
        return error("forbidden", "Hall is private.", 403)
    rows = HallParticipant.query.filter_by(hall_id=hall.id).filter(HallParticipant.status.in_(["joined", "present", "away"])).order_by(HallParticipant.joined_at.desc()).all()
    return ok({"items": [serialize_participant(row) for row in rows]})


@halls_bp.route("/<hall_id>/observations", methods=["GET"])
def hall_observations(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    if not _hall_read_allowed(hall, observer=observer, user=get_current_user()):
        return error("forbidden", "Hall is private.", 403)
    return ok({"items": [serialize_observation(row) for row in list_hall_observations(hall)]})


@halls_bp.route("/<hall_id>/observations", methods=["POST"])
@alpha_jwt_required()
@limiter.limit("40 per minute; 160 per hour")
def create_hall_observation(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer, obs_err = _current_observer_or_error()
    if obs_err:
        return obs_err
    if not _hall_read_allowed(hall, observer=observer, user=get_current_user()):
        return error("forbidden", "Hall is private.", 403)
    try:
        row = create_observation(observer, {**_json_payload(), "hall_id": hall.id}, hall=hall)
        record_hall_activity_event(
            hall,
            "observation",
            observer=observer,
            source="hall_observation",
            metadata={"observation_id": row.id},
        )
        db.session.commit()
        return ok(serialize_observation(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/zones", methods=["GET"])
def hall_zones(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    return ok({"items": [serialize_zone(row) for row in HallZone.query.filter_by(hall_id=hall.id).order_by(HallZone.id.asc()).all()]})


@halls_bp.route("/<hall_id>/zones", methods=["POST"])
@alpha_jwt_required()
def create_hall_zone(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    try:
        row = add_zone(hall, _canonical_zone_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_zone(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/portals", methods=["GET"])
def hall_portals(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    if not _hall_read_allowed(hall, observer=observer, user=get_current_user()):
        return error("forbidden", "Hall is private.", 403)
    rows = HallPortal.query.filter_by(hall_id=hall.id).order_by(HallPortal.id.asc()).all()
    return ok({"items": [serialize_portal(row) for row in rows]})


@halls_bp.route("/<hall_id>/portals", methods=["POST"])
@alpha_jwt_required()
def create_hall_portal(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    if request.method == "GET":
        rows = HallPortal.query.filter_by(hall_id=hall.id).order_by(HallPortal.id.asc()).all()
        return ok({"items": [serialize_portal(row) for row in rows]})
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    try:
        row = add_portal(hall, _canonical_portal_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_portal(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/portals/<int:portal_id>", methods=["PATCH"])
@alpha_jwt_required()
def patch_hall_portal(hall_id, portal_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    row = HallPortal.query.filter_by(id=portal_id, hall_id=hall.id).first()
    if not row:
        return error("not_found", "Portal not found.", 404)
    try:
        update_portal(row, _canonical_portal_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_portal(row))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/portals/<int:portal_id>/click", methods=["POST"])
def track_hall_portal_click(hall_id, portal_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    try:
        event = record_portal_click(
            hall,
            portal_id,
            observer=observer,
            guest_token=_json_payload().get("guest_token"),
            source=_json_payload().get("source") or "frontend",
            metadata=_json_payload().get("metadata"),
        )
        db.session.commit()
        return ok({"event": serialize_hall_activity_event(event)}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/stalls", methods=["GET"])
def hall_stalls(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    if not _hall_read_allowed(hall, observer=observer, user=get_current_user()):
        return error("forbidden", "Hall is private.", 403)
    rows = HallStall.query.filter_by(hall_id=hall.id).order_by(HallStall.id.asc()).all()
    return ok({"items": [serialize_stall(row) for row in rows]})


@halls_bp.route("/<hall_id>/stalls", methods=["POST"])
@alpha_jwt_required()
def create_hall_stall(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    if request.method == "GET":
        rows = HallStall.query.filter_by(hall_id=hall.id).order_by(HallStall.id.asc()).all()
        return ok({"items": [serialize_stall(row) for row in rows]})
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    try:
        row = add_stall(hall, _canonical_stall_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_stall(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/stalls/<int:stall_id>", methods=["PATCH"])
@alpha_jwt_required()
def patch_hall_stall(hall_id, stall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    row = HallStall.query.filter_by(id=stall_id, hall_id=hall.id).first()
    if not row:
        return error("not_found", "Stall not found.", 404)
    try:
        update_stall(row, _canonical_stall_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_stall(row))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/stalls/<int:stall_id>/visit", methods=["POST"])
def track_hall_stall_visit(hall_id, stall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    try:
        event = record_stall_visit(
            hall,
            stall_id,
            observer=observer,
            guest_token=_json_payload().get("guest_token"),
            source=_json_payload().get("source") or "frontend",
            metadata=_json_payload().get("metadata"),
        )
        db.session.commit()
        return ok({"event": serialize_hall_activity_event(event)}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/sessions", methods=["GET"])
def hall_sessions(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    observer = _current_optional_observer()
    if not _hall_read_allowed(hall, observer=observer, user=get_current_user()):
        return error("forbidden", "Hall is private.", 403)
    rows = HallSession.query.filter_by(hall_id=hall.id).order_by(HallSession.starts_at.asc(), HallSession.id.asc()).all()
    return ok({"items": [serialize_session(row) for row in rows]})


@halls_bp.route("/<hall_id>/sessions", methods=["POST"])
@alpha_jwt_required()
def create_hall_session(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    if request.method == "GET":
        rows = HallSession.query.filter_by(hall_id=hall.id).order_by(HallSession.starts_at.asc(), HallSession.id.asc()).all()
        return ok({"items": [serialize_session(row) for row in rows]})
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    try:
        row = create_session(hall, _canonical_session_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_session(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/sessions/<int:session_id>", methods=["PATCH"])
@alpha_jwt_required()
def patch_hall_session(hall_id, session_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    _, _, control_err = _require_hall_control(hall)
    if control_err:
        return control_err
    row = HallSession.query.filter_by(id=session_id, hall_id=hall.id).first()
    if not row:
        return error("not_found", "Session not found.", 404)
    try:
        transition_session_status(row, _canonical_session_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_session(row))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@halls_bp.route("/<hall_id>/moderation/actions", methods=["POST"])
@alpha_jwt_required()
def hall_moderation_action(hall_id):
    hall, err = _load_hall_or_error(hall_id)
    if err:
        return err
    try:
        payload = _json_payload()
        if payload.get("action_type") == "report":
            user = get_current_user()
            observer = get_or_create_observer_for_user(user, {}) if user else None
            if not user or not observer:
                return error("unauthorized", "Authentication required.", 401)
            if not _hall_read_allowed(hall, observer=observer, user=user):
                return error("forbidden", "Hall is private.", 403)
            flag, action = report_hall_content(hall, payload, reporter_user=user, reporter_observer=observer)
            db.session.commit()
            return ok({"flag": serialize_moderation_flag(flag), "action": serialize_hall_moderation_action(action)}, 201)
        user, observer, control_err = _require_hall_control(hall)
        if control_err:
            return control_err
        action = create_hall_moderation_action(hall, payload, actor_user=user, actor_observer=observer)
        db.session.commit()
        return ok(serialize_hall_moderation_action(action), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/rooms/<int:room_id>/halls", methods=["GET"])
@alpha_jwt_required()
def owner_room_halls(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    return ok({"items": [serialize_hall(row, include_children=True) for row in list_room_halls(room)]})


@presence_hall_owner_bp.route("/rooms/<int:room_id>/halls", methods=["POST"])
@alpha_jwt_required()
def owner_create_room_hall(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    try:
        hall = create_hall({**_canonical_hall_payload(_json_payload()), "host_type": "room"}, host_type="room", host_room=room, actor_user=_resolve_owner_user())
        db.session.commit()
        return ok(serialize_hall(hall, include_children=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls", methods=["GET"])
@alpha_jwt_required()
def owner_halls_alias():
    room_id = _room_id_from_request()
    if not room_id:
        return error("validation_error", "room_id is required.", 400)
    room, err = _load_owned_room(room_id)
    if err:
        return err
    return ok({"items": [serialize_hall(row, include_children=True) for row in list_room_halls(room)]})


@presence_hall_owner_bp.route("/halls", methods=["POST"])
@alpha_jwt_required()
def owner_create_hall_alias():
    payload = _canonical_hall_payload(_json_payload())
    room_id = _room_id_from_request(payload)
    if not room_id:
        return error("validation_error", "host_room_id is required.", 400)
    room, err = _load_owned_room(room_id)
    if err:
        return err
    try:
        hall = create_hall({**payload, "host_type": "room"}, host_type="room", host_room=room, actor_user=_resolve_owner_user())
        db.session.commit()
        return ok(serialize_hall(hall, include_children=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls/<int:hall_id>", methods=["GET"])
@alpha_jwt_required()
def owner_get_hall_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    return ok(serialize_hall(hall, include_children=True))


@presence_hall_owner_bp.route("/halls/<int:hall_id>", methods=["PATCH"])
@alpha_jwt_required()
def owner_update_hall_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    try:
        update_hall(hall, _canonical_hall_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_hall(hall, include_children=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls/<int:hall_id>", methods=["DELETE"])
@alpha_jwt_required()
def owner_delete_hall_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    hall.status = "archived"
    db.session.commit()
    return ok({"deleted": True})


@presence_hall_owner_bp.route("/halls/<int:hall_id>/zones", methods=["POST"])
@alpha_jwt_required()
def owner_add_hall_zone_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    try:
        row = add_zone(hall, _canonical_zone_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_zone(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls/<int:hall_id>/zones/<int:zone_id>", methods=["PATCH"])
@alpha_jwt_required()
def owner_update_hall_zone_alias(hall_id, zone_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    zone = HallZone.query.filter_by(id=zone_id, hall_id=hall.id).first()
    if not zone:
        return error("not_found", "Hall Zone not found.", 404)
    try:
        update_zone(zone, _canonical_zone_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_zone(zone))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls/<int:hall_id>/zones/<int:zone_id>", methods=["DELETE"])
@alpha_jwt_required()
def owner_remove_hall_zone_alias(hall_id, zone_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    zone = HallZone.query.filter_by(id=zone_id, hall_id=hall.id).first()
    if not zone:
        return error("not_found", "Hall Zone not found.", 404)
    zone.status = "archived"
    db.session.commit()
    return ok({"deleted": True})


@presence_hall_owner_bp.route("/halls/<int:hall_id>/sessions", methods=["POST"])
@alpha_jwt_required()
def owner_add_hall_session_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    try:
        row = create_session(hall, _canonical_session_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_session(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls/<int:hall_id>/stalls", methods=["POST"])
@alpha_jwt_required()
def owner_add_hall_stall_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    try:
        row = add_stall(hall, _canonical_stall_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_stall(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls/<int:hall_id>/portals", methods=["POST"])
@alpha_jwt_required()
def owner_add_hall_portal_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    try:
        row = add_portal(hall, _canonical_portal_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_portal(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/halls/<int:hall_id>/analytics", methods=["GET"])
@alpha_jwt_required()
def owner_hall_analytics_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    return ok(owner_hall_dashboard(hall))


@presence_hall_owner_bp.route("/halls/<int:hall_id>/moderation", methods=["POST"])
@alpha_jwt_required()
def owner_hall_moderation_alias(hall_id):
    hall, _, err = _load_owner_hall(hall_id, _room_id_from_request())
    if err:
        return err
    payload = _json_payload()
    payload = {
        **payload,
        "target_type": payload.get("target_type") or payload.get("target_kind"),
        "action_type": payload.get("action_type") or payload.get("action"),
    }
    try:
        user = _resolve_owner_user()
        observer = get_or_create_observer_for_user(user, {}) if user else None
        action = create_hall_moderation_action(hall, payload, actor_user=user, actor_observer=observer)
        db.session.commit()
        return ok(serialize_hall_moderation_action(action), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/rooms/<int:room_id>/halls/<int:hall_id>/analytics", methods=["GET"])
@alpha_jwt_required()
def owner_room_hall_analytics(room_id, hall_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    hall = PresenceHall.query.filter_by(id=hall_id, host_room_id=room.id).first()
    if not hall:
        return error("not_found", "Hall not found.", 404)
    return ok(owner_hall_dashboard(hall))


@presence_hall_owner_bp.route("/rooms/<int:room_id>/halls/<int:hall_id>/stalls", methods=["POST"])
@alpha_jwt_required()
def owner_room_hall_stall(room_id, hall_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    hall = PresenceHall.query.filter_by(id=hall_id, host_room_id=room.id).first()
    if not hall:
        return error("not_found", "Hall not found.", 404)
    try:
        row = add_stall(hall, _canonical_stall_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_stall(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_hall_owner_bp.route("/rooms/<int:room_id>/halls/<int:hall_id>/portals", methods=["POST"])
@alpha_jwt_required()
def owner_room_hall_portal(room_id, hall_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    hall = PresenceHall.query.filter_by(id=hall_id, host_room_id=room.id).first()
    if not hall:
        return error("not_found", "Hall not found.", 404)
    try:
        row = add_portal(hall, _canonical_portal_payload(_json_payload()))
        db.session.commit()
        return ok(serialize_portal(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@hall_paths_bp.route("/from-hall/<int:hall_id>", methods=["GET"])
def path_from_hall(hall_id):
    hall = PresenceHall.query.filter(
        PresenceHall.id == hall_id,
        PresenceHall.visibility.in_(["public", "unlisted"]),
        PresenceHall.status.in_(["scheduled", "live", "ended"]),
    ).first()
    if not hall:
        return error("not_found", "Hall not found.", 404)
    row = Path.query.filter_by(trailhead_type="hall", trailhead_id=hall.id, status="active").filter(Path.visibility.in_(["public", "unlisted", "system"])).order_by(Path.created_at.desc()).first()
    if not row:
        row = generate_path_from_hall(hall)
    record_hall_activity_event(hall, "path_open", observer=_current_optional_observer(), source="path_from_hall", metadata={"path_id": row.id})
    db.session.commit()
    return ok(serialize_path(row))


@hall_paths_bp.route("/generate/from-hall/<int:hall_id>", methods=["POST"])
def generate_public_path_from_hall(hall_id):
    hall = PresenceHall.query.filter(
        PresenceHall.id == hall_id,
        PresenceHall.visibility.in_(["public", "unlisted"]),
        PresenceHall.status.in_(["scheduled", "live", "ended"]),
    ).first()
    if not hall:
        return error("not_found", "Hall not found.", 404)
    row = generate_path_from_hall(hall)
    record_hall_activity_event(hall, "path_open", observer=_current_optional_observer(), source="generate_path_from_hall", metadata={"path_id": row.id})
    db.session.commit()
    return ok(serialize_path(row), 201)


@admin_presence_garden_hall_bp.route("/gardens", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def admin_gardens():
    rows = PresenceGarden.query.order_by(PresenceGarden.created_at.desc()).limit(100).all()
    return ok({"items": [serialize_garden(row, private=True) for row in rows]})


@admin_presence_garden_hall_bp.route("/halls", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def admin_halls():
    rows = PresenceHall.query.order_by(PresenceHall.created_at.desc()).limit(100).all()
    return ok({"items": [serialize_hall(row, include_children=True) for row in rows]})


@admin_presence_garden_hall_bp.route("/halls/<int:hall_id>", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def admin_hall_detail(hall_id):
    hall = PresenceHall.query.get(hall_id)
    if not hall:
        return error("not_found", "Hall not found.", 404)
    return ok(serialize_hall(hall, include_children=True))


@admin_presence_garden_hall_bp.route("/halls/<int:hall_id>/analytics", methods=["GET"])
@control_plane_required(scopes=["presence.analytics.read"])
def admin_hall_analytics(hall_id):
    hall = PresenceHall.query.get(hall_id)
    if not hall:
        return error("not_found", "Hall not found.", 404)
    return ok(owner_hall_dashboard(hall))


@admin_presence_garden_hall_bp.route("/halls/<int:hall_id>/moderation/actions", methods=["POST"])
@control_plane_required(scopes=["presence.node.update"])
def admin_hall_moderation_action(hall_id):
    hall = PresenceHall.query.get(hall_id)
    if not hall:
        return error("not_found", "Hall not found.", 404)
    try:
        action = create_hall_moderation_action(hall, _json_payload(), actor_user=_resolve_owner_user())
        db.session.commit()
        return ok({"controls": admin_controls(hall), "action": serialize_hall_moderation_action(action)}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@admin_presence_garden_hall_bp.route("/seeds/recompute-status", methods=["GET"])
@control_plane_required(scopes=["presence.analytics.read"])
def admin_seed_recompute_status():
    return ok(
        {
            "gardens_count": PresenceGarden.query.count(),
            "seeds_count": GardenSeed.query.count(),
            "active_count": GardenSeed.query.filter_by(status="active").count(),
            "wilting_count": GardenSeed.query.filter_by(status="wilting").count(),
            "composted_count": GardenSeed.query.filter_by(status="composted").count(),
        }
    )


@admin_presence_garden_hall_bp.route("/seeds/recompute", methods=["POST"])
@control_plane_required(scopes=["presence.analytics.read"])
def admin_seed_recompute():
    rows = []
    for garden in PresenceGarden.query.all():
        recompute_garden_weights(garden)
        compost_inactive_seeds(garden)
        rows.append(garden.id)
    db.session.commit()
    return ok({"garden_ids": rows, "recomputed": len(rows)})
