from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import verify_jwt_in_request

from ..extensions import db, limiter
from ..models import (
    FieldNote,
    ModerationFlag,
    MoodBoard,
    MoodBoardItem,
    Path,
    PathWalk,
    PresenceNode,
    PresencePass,
    RoomKey,
    Signal,
)
from ..security.alpha import alpha_jwt_required
from ..security.control_plane import control_plane_required, log_control_event
from ..security.policy import get_current_user
from ..services.presence_owner_identity import resolve_or_provision_presence_owner
from ..services.presence_editor_config import (
    PresenceEditorConfigError,
    attach_asset_to_draft,
    attach_uploaded_asset_to_draft,
    build_default_editable_config,
    collect_room_assets,
    draft_config_for_room,
    ensure_draft_config,
    history_for_room,
    preview_payload_for_room,
    published_config_for_room,
    publish_draft_config,
    rollback_published_config,
    serialize_editor_config,
    serialize_public_editable_config,
    update_draft_config,
    validate_uploaded_asset_fields,
)
from ..services.presence_media_storage import (
    PresenceMediaStorageError,
    PresenceMediaValidationError,
    build_presence_media_path,
    store_presence_image,
)
from ..services.presence_pass_service import (
    capture_encounter,
    create_pass,
    create_room_key,
    list_room_passes,
    resolve_room_key,
    room_key_entry_payload,
    serialize_encounter,
    serialize_pass,
    serialize_room_key,
    update_pass_status,
    update_room_key,
)
from ..services.presence_path_service import (
    generate_path_from_mood_board,
    generate_path_from_room,
    public_room_query,
    choose_fork,
    record_path_trace,
    serialize_path,
    serialize_path_trace,
    serialize_path_walk,
    start_path_walk,
)
from ..services.presence_shared_space_service import (
    derive_shared_space_from_path_walk,
    derive_shared_space_from_room_entry,
    record_shared_space,
)
from ..services.presence_service import (
    PresenceValidationError,
    create_presence_enquiry,
    finalize_presence_enquiry_delivery,
    public_presence_node_by_slug,
)
from ..services.presence_social_service import (
    action_moderation_flag,
    add_mood_board_item,
    add_signal,
    create_field_note,
    create_moderation_flag,
    create_mood_board,
    follow_room,
    get_or_create_observer_for_user,
    hide_field_note,
    list_passport,
    save_room,
    serialize_field_note,
    serialize_moderation_flag,
    serialize_mood_board,
    serialize_mood_board_item,
    serialize_observer_profile,
    serialize_passport_stamp,
    serialize_room_connection,
    serialize_signal,
    update_mood_board,
    update_observer_profile,
)
from ..services.presence_world_service import (
    compute_world_readiness,
    get_world_status,
    graph_summary_for_room,
    owner_room_dashboard,
    room_connections_for_owner,
    room_encounters_for_owner,
    room_field_notes_for_owner,
    serialize_world_readiness,
)
from .utils import error, ok


presence_graph_bp = Blueprint("presence_graph", __name__, url_prefix="/presence")
observer_bp = Blueprint("observer", __name__, url_prefix="/observer")
paths_bp = Blueprint("paths", __name__, url_prefix="/paths")
admin_presence_graph_bp = Blueprint("admin_presence_graph", __name__, url_prefix="/admin/presence")


def _json_payload() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _validation_error(exc: PresenceValidationError):
    return error("validation_error", str(exc), 400, details=getattr(exc, "details", None) or None)


def _editor_validation_error(exc: PresenceEditorConfigError):
    return error("validation_error", str(exc), 422, details=getattr(exc, "details", None) or None)


def _audit_platform_admin_editor_access(action: str, actor, room: PresenceNode, payload: dict | None = None) -> None:
    if getattr(actor, "role", None) != "platform_admin":
        return
    if room.owner_user_id and room.owner_user_id == getattr(actor, "id", None):
        return
    try:
        log_control_event(
            action,
            getattr(actor, "id", None),
            "presence_editable_config",
            str(room.id),
            {"room_id": room.id, **(payload or {})},
        )
    except Exception:
        current_app.logger.warning(
            "Presence editor platform-admin audit write failed",
            exc_info=True,
            extra={"room_id": room.id, "action": action},
        )


def _load_public_room(room_id: int):
    room = public_room_query().filter_by(id=room_id).first()
    if not room:
        return None, error("not_found", "Presence Room not found.", 404)
    return room, None


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


def _load_path(path_id: int, *, public_only: bool = True):
    query = Path.query.filter_by(id=path_id)
    if public_only:
        query = query.filter(Path.status == "active", Path.visibility.in_(["public", "unlisted", "system"]))
    path = query.first()
    if not path:
        return None, error("not_found", "Path not found.", 404)
    return path, None


@presence_graph_bp.route("/keys/<public_token>/resolve", methods=["GET"])
@limiter.limit("120 per minute; 600 per hour")
def resolve_public_room_key(public_token):
    room_key = resolve_room_key(public_token)
    if not room_key:
        return error("not_found", "Room Key not found.", 404)
    if room_key.status == "revoked":
        return error("revoked", "This Room Key has been revoked.", 410)
    if room_key.status == "paused":
        return ok({"room_key": serialize_room_key(room_key, include_token=False), "status": "paused", "message": "This Room Key is paused."}, 423)
    room, err = _load_public_room(room_key.room_id)
    if err:
        return err
    observer = _current_optional_observer()
    encounter = capture_encounter(room, {"source": room_key.key_type}, room_key=room_key, observer=observer)
    if observer:
        derive_shared_space_from_room_entry(encounter)
    db.session.commit()
    return ok(room_key_entry_payload(room, room_key, encounter))


@presence_graph_bp.route("/rooms/<int:room_id>/encounters", methods=["POST"])
@limiter.limit("60 per minute; 240 per hour")
def capture_room_encounter(room_id):
    room, err = _load_public_room(room_id)
    if err:
        return err
    data = _json_payload()
    room_key = resolve_room_key(data.get("room_key_token")) if data.get("room_key_token") else None
    if room_key and (room_key.room_id != room.id or room_key.status != "active"):
        return error("invalid_room_key", "Room Key is not active for this Room.", 400)
    observer = _current_optional_observer()
    try:
        encounter = capture_encounter(room, data, room_key=room_key, observer=observer)
        if observer:
            derive_shared_space_from_room_entry(encounter)
        db.session.commit()
        return ok({"encounter": serialize_encounter(encounter), "room_id": room.id, "available_actions": ["save", "follow", "field_note", "mood_board", "enquiry"]}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_graph_bp.route("/rooms/<int:room_id>/guest-enquiry", methods=["POST"])
@limiter.limit("20 per minute; 100 per hour")
def guest_room_enquiry(room_id):
    room, err = _load_public_room(room_id)
    if err:
        return err
    try:
        enquiry = create_presence_enquiry(room, _json_payload())
        db.session.commit()
        enquiry = finalize_presence_enquiry_delivery(room, enquiry, _json_payload())
        db.session.commit()
        return ok({"enquiry_id": enquiry.id, "delivery_status": enquiry.delivery_status}, 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/profile", methods=["POST"])
@alpha_jwt_required()
def create_observer_profile():
    observer, err = _current_observer_or_error()
    if err:
        return err
    try:
        update_observer_profile(observer, _json_payload())
        db.session.commit()
        return ok(serialize_observer_profile(observer, private=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/profile", methods=["GET"])
@alpha_jwt_required()
def read_observer_profile():
    observer, err = _current_observer_or_error()
    if err:
        return err
    db.session.commit()
    return ok(serialize_observer_profile(observer, private=True))


@observer_bp.route("/profile", methods=["PATCH"])
@alpha_jwt_required()
def patch_observer_profile():
    observer, err = _current_observer_or_error()
    if err:
        return err
    try:
        update_observer_profile(observer, _json_payload())
        db.session.commit()
        return ok(serialize_observer_profile(observer, private=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/rooms/<int:room_id>/save", methods=["POST"])
@alpha_jwt_required()
def observer_save_room(room_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    room, err = _load_public_room(room_id)
    if err:
        return err
    row = save_room(observer, room)
    record_shared_space(space_type="room", space_id=room.id, observer=observer, room=room, strength=60, metadata={"source": "room_save", "connection_id": row.id})
    db.session.commit()
    return ok({"connection": serialize_room_connection(row)}, 201)


@observer_bp.route("/rooms/<int:room_id>/follow", methods=["POST"])
@alpha_jwt_required()
def observer_follow_room(room_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    room, err = _load_public_room(room_id)
    if err:
        return err
    row = follow_room(observer, room)
    record_shared_space(space_type="room", space_id=room.id, observer=observer, room=room, strength=60, metadata={"source": "room_follow", "connection_id": row.id})
    db.session.commit()
    return ok({"connection": serialize_room_connection(row)}, 201)


@observer_bp.route("/passport", methods=["GET"])
@alpha_jwt_required()
def observer_passport():
    observer, err = _current_observer_or_error()
    if err:
        return err
    return ok({"items": [serialize_passport_stamp(row) for row in list_passport(observer)]})


@observer_bp.route("/connections", methods=["GET"])
@alpha_jwt_required()
def observer_connections():
    observer, err = _current_observer_or_error()
    if err:
        return err
    rows = observer.room_connections
    return ok({"items": [serialize_room_connection(row) for row in rows]})


@observer_bp.route("/mood-boards", methods=["POST"])
@alpha_jwt_required()
def observer_create_mood_board():
    observer, err = _current_observer_or_error()
    if err:
        return err
    try:
        board = create_mood_board("observer", _json_payload(), observer=observer)
        db.session.commit()
        return ok(serialize_mood_board(board, include_items=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/mood-boards", methods=["GET"])
@alpha_jwt_required()
def observer_list_mood_boards():
    observer, err = _current_observer_or_error()
    if err:
        return err
    rows = MoodBoard.query.filter_by(owner_type="observer", observer_id=observer.id).order_by(MoodBoard.created_at.desc()).all()
    return ok({"items": [serialize_mood_board(row) for row in rows]})


@observer_bp.route("/mood-boards/<int:board_id>", methods=["GET", "PATCH"])
@alpha_jwt_required()
def observer_mood_board_detail(board_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    board = MoodBoard.query.filter_by(id=board_id, observer_id=observer.id).first()
    if not board:
        return error("not_found", "Mood Board not found.", 404)
    if request.method == "PATCH":
        try:
            update_mood_board(board, _json_payload())
            db.session.commit()
        except PresenceValidationError as exc:
            db.session.rollback()
            return _validation_error(exc)
    return ok(serialize_mood_board(board, include_items=True))


@observer_bp.route("/mood-boards/<int:board_id>/items", methods=["POST"])
@alpha_jwt_required()
def observer_add_mood_board_item(board_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    board = MoodBoard.query.filter_by(id=board_id, observer_id=observer.id).first()
    if not board:
        return error("not_found", "Mood Board not found.", 404)
    try:
        item = add_mood_board_item(board, _json_payload(), observer=observer)
        db.session.commit()
        return ok(serialize_mood_board_item(item), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/mood-boards/<int:board_id>/items/<int:item_id>", methods=["DELETE"])
@alpha_jwt_required()
def observer_remove_mood_board_item(board_id, item_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    board = MoodBoard.query.filter_by(id=board_id, observer_id=observer.id).first()
    if not board:
        return error("not_found", "Mood Board not found.", 404)
    item = MoodBoardItem.query.filter_by(id=item_id, mood_board_id=board.id).first()
    if not item:
        return error("not_found", "Mood Board item not found.", 404)
    db.session.delete(item)
    db.session.commit()
    return ok({"deleted": True})


@observer_bp.route("/field-notes", methods=["POST"])
@alpha_jwt_required()
def observer_create_field_note():
    observer, err = _current_observer_or_error()
    if err:
        return err
    try:
        note = create_field_note(observer, _json_payload())
        db.session.commit()
        return ok(serialize_field_note(note), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/field-notes", methods=["GET"])
@alpha_jwt_required()
def observer_list_field_notes():
    observer, err = _current_observer_or_error()
    if err:
        return err
    rows = FieldNote.query.filter_by(author_observer_id=observer.id).order_by(FieldNote.created_at.desc()).all()
    return ok({"items": [serialize_field_note(row) for row in rows]})


@observer_bp.route("/signals", methods=["POST"])
@alpha_jwt_required()
def observer_add_signal():
    observer, err = _current_observer_or_error()
    if err:
        return err
    try:
        signal = add_signal(observer, _json_payload())
        db.session.commit()
        return ok(serialize_signal(signal), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/signals/<int:signal_id>", methods=["DELETE"])
@alpha_jwt_required()
def observer_delete_signal(signal_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    signal = Signal.query.filter_by(id=signal_id, observer_id=observer.id).first()
    if not signal:
        return error("not_found", "Signal not found.", 404)
    db.session.delete(signal)
    db.session.commit()
    return ok({"deleted": True})


@observer_bp.route("/paths/<int:path_id>/walks", methods=["POST"])
@alpha_jwt_required()
def observer_start_path_walk(path_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    path, err = _load_path(path_id)
    if err:
        return err
    walk = start_path_walk(observer, path, _json_payload())
    derive_shared_space_from_path_walk(walk)
    db.session.commit()
    return ok(serialize_path_walk(walk), 201)


@observer_bp.route("/paths/<int:path_id>/traces", methods=["POST"])
@alpha_jwt_required()
def observer_path_trace(path_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    path, err = _load_path(path_id)
    if err:
        return err
    try:
        trace = record_path_trace(observer, path, _json_payload())
        db.session.commit()
        return ok(serialize_path_trace(trace), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@observer_bp.route("/paths/<int:path_id>/choose", methods=["POST"])
@alpha_jwt_required()
def observer_choose_path(path_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    path, err = _load_path(path_id)
    if err:
        return err
    try:
        trace = choose_fork(observer, path, _json_payload())
        db.session.commit()
        return ok(serialize_path_trace(trace), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/passes", methods=["POST", "GET"])
@alpha_jwt_required()
def owner_room_passes(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    if request.method == "GET":
        return ok({"items": [serialize_pass(row, include_keys=True) for row in list_room_passes(room)]})
    try:
        row = create_pass(room, _resolve_owner_user(), _json_payload())
        db.session.commit()
        return ok(serialize_pass(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/passes/<int:pass_id>", methods=["PATCH"])
@alpha_jwt_required()
def owner_room_pass_detail(room_id, pass_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    row = PresencePass.query.filter_by(id=pass_id, room_id=room.id).first()
    if not row:
        return error("not_found", "Presence Pass not found.", 404)
    try:
        update_pass_status(row, _json_payload())
        db.session.commit()
        return ok(serialize_pass(row, include_keys=True))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/keys", methods=["POST", "GET"])
@alpha_jwt_required()
def owner_room_keys(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    if request.method == "GET":
        rows = RoomKey.query.filter_by(room_id=room.id).order_by(RoomKey.created_at.desc()).all()
        return ok({"items": [serialize_room_key(row) for row in rows]})
    try:
        row = create_room_key(room, _resolve_owner_user(), _json_payload())
        db.session.commit()
        return ok(serialize_room_key(row), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/keys/<int:key_id>", methods=["PATCH"])
@alpha_jwt_required()
def owner_room_key_detail(room_id, key_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    row = RoomKey.query.filter_by(id=key_id, room_id=room.id).first()
    if not row:
        return error("not_found", "Room Key not found.", 404)
    try:
        update_room_key(row, _json_payload())
        db.session.commit()
        return ok(serialize_room_key(row))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/editor", methods=["GET"])
@alpha_jwt_required()
def owner_room_editor(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    _audit_platform_admin_editor_access("presence.editor.read", actor, room)
    draft = draft_config_for_room(room)
    published = published_config_for_room(room)
    return ok(
        {
            "room": {
                "id": room.id,
                "slug": room.slug,
                "display_name": room.display_name,
                "owner_user_id": room.owner_user_id,
            },
            "draft": serialize_editor_config(draft),
            "published": serialize_editor_config(published),
            "published_public_config": serialize_public_editable_config(published),
            "suggested_config": build_default_editable_config(room) if not draft and not published else None,
            "history": [serialize_editor_config(row) for row in history_for_room(room)[:20]],
            "assets": collect_room_assets(room),
        }
    )


@presence_graph_bp.route("/owner/rooms/<int:room_id>/editor/draft", methods=["GET", "POST", "PATCH"])
@alpha_jwt_required()
def owner_room_editor_draft(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    if request.method == "GET":
        draft = draft_config_for_room(room)
        _audit_platform_admin_editor_access("presence.editor.draft.read", actor, room)
        return ok({"draft": serialize_editor_config(draft)})

    try:
        if request.method == "POST" and not _json_payload():
            draft, created = ensure_draft_config(room, actor)
        else:
            draft, created = update_draft_config(room, actor, _json_payload(), partial=request.method == "PATCH")
        db.session.commit()
        _audit_platform_admin_editor_access(
            "presence.editor.draft.update",
            actor,
            room,
            {"config_id": draft.id, "version": draft.version, "created": created},
        )
        return ok({"draft": serialize_editor_config(draft), "created": created}, 201 if created else 200)
    except PresenceEditorConfigError as exc:
        db.session.rollback()
        return _editor_validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/editor/preview", methods=["POST"])
@alpha_jwt_required()
def owner_room_editor_preview(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    try:
        payload = preview_payload_for_room(room, actor)
        db.session.commit()
        _audit_platform_admin_editor_access(
            "presence.editor.preview",
            actor,
            room,
            {"config_id": (payload.get("draft") or {}).get("id"), "version": (payload.get("draft") or {}).get("version")},
        )
        return ok(payload)
    except PresenceEditorConfigError as exc:
        db.session.rollback()
        return _editor_validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/editor/publish", methods=["POST"])
@alpha_jwt_required()
def owner_room_editor_publish(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    try:
        published = publish_draft_config(room, actor)
        db.session.commit()
        _audit_platform_admin_editor_access(
            "presence.editor.publish",
            actor,
            room,
            {"config_id": published.id, "version": published.version},
        )
        return ok(
            {
                "published": serialize_editor_config(published),
                "public_config": serialize_public_editable_config(published),
            }
        )
    except PresenceEditorConfigError as exc:
        db.session.rollback()
        return _editor_validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/editor/rollback", methods=["POST"])
@alpha_jwt_required()
def owner_room_editor_rollback(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    payload = _json_payload()
    try:
        restored = rollback_published_config(
            room,
            actor,
            version=payload.get("version"),
            config_id=payload.get("config_id") or payload.get("id"),
        )
        db.session.commit()
        _audit_platform_admin_editor_access(
            "presence.editor.rollback",
            actor,
            room,
            {"config_id": restored.id, "version": restored.version},
        )
        return ok(
            {
                "published": serialize_editor_config(restored),
                "public_config": serialize_public_editable_config(restored),
            }
        )
    except (PresenceEditorConfigError, TypeError, ValueError) as exc:
        db.session.rollback()
        return _editor_validation_error(PresenceEditorConfigError(str(exc)))


@presence_graph_bp.route("/owner/rooms/<int:room_id>/editor/history", methods=["GET"])
@alpha_jwt_required()
def owner_room_editor_history(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    _audit_platform_admin_editor_access("presence.editor.history.read", actor, room)
    return ok({"items": [serialize_editor_config(row) for row in history_for_room(room)]})


@presence_graph_bp.route("/owner/rooms/<int:room_id>/assets", methods=["GET"])
@alpha_jwt_required()
def owner_room_assets(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    _audit_platform_admin_editor_access("presence.editor.assets.read", actor, room)
    return ok({"items": collect_room_assets(room)})


@presence_graph_bp.route("/owner/rooms/<int:room_id>/assets/attach", methods=["POST"])
@alpha_jwt_required()
def owner_room_attach_asset(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    try:
        draft = attach_asset_to_draft(room, actor, _json_payload())
        db.session.commit()
        _audit_platform_admin_editor_access(
            "presence.editor.assets.attach",
            actor,
            room,
            {"config_id": draft.id, "version": draft.version},
        )
        return ok({"draft": serialize_editor_config(draft), "assets": collect_room_assets(room)}, 201)
    except PresenceEditorConfigError as exc:
        db.session.rollback()
        return _editor_validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/assets/upload", methods=["POST"])
@alpha_jwt_required()
def owner_room_upload_asset(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    actor = _resolve_owner_user()
    file = request.files.get("file")
    if not file or not getattr(file, "filename", ""):
        return error("validation_error", "Choose a JPG, PNG, or WEBP image to upload.", 422)
    try:
        role, alt_text = validate_uploaded_asset_fields(
            role=request.form.get("role") or "unused",
            alt_text=request.form.get("alt_text"),
        )
        storage_path = build_presence_media_path(
            owner_user_id=actor.id,
            node_id=room.id,
            target_type="editor_draft",
            filename=getattr(file, "filename", "") or "image",
        )
        stored = store_presence_image(file, storage_path=storage_path)
        media_id = storage_path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        draft, uploaded_asset = attach_uploaded_asset_to_draft(
            room,
            actor,
            url=stored.url,
            alt_text=alt_text,
            media_id=media_id,
            role=role,
            mime_type=stored.content_type,
            size_bytes=stored.size,
        )
        db.session.commit()
        _audit_platform_admin_editor_access(
            "presence.editor.assets.upload",
            actor,
            room,
            {"config_id": draft.id, "version": draft.version},
        )
        return ok(
            {
                "draft": serialize_editor_config(draft),
                "assets": collect_room_assets(room),
                "uploaded_asset": uploaded_asset,
                "storage_policy": "public_unlisted_until_used",
            },
            201,
        )
    except PresenceMediaValidationError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), 422)
    except PresenceEditorConfigError as exc:
        db.session.rollback()
        return _editor_validation_error(exc)
    except PresenceMediaStorageError as exc:
        db.session.rollback()
        return error("storage_unavailable", str(exc), 503)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/analytics", methods=["GET"])
@alpha_jwt_required()
def owner_room_analytics(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    return ok(owner_room_dashboard(room))


@presence_graph_bp.route("/owner/rooms/<int:room_id>/encounters", methods=["GET"])
@alpha_jwt_required()
def owner_room_encounters(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    return ok({"items": room_encounters_for_owner(room)})


@presence_graph_bp.route("/owner/rooms/<int:room_id>/connections", methods=["GET"])
@alpha_jwt_required()
def owner_room_connections(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    return ok({"items": room_connections_for_owner(room)})


@presence_graph_bp.route("/owner/rooms/<int:room_id>/field-notes", methods=["GET"])
@alpha_jwt_required()
def owner_room_field_notes(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    return ok({"items": room_field_notes_for_owner(room)})


@presence_graph_bp.route("/owner/rooms/<int:room_id>/field-notes/<int:note_id>/hide", methods=["POST"])
@alpha_jwt_required()
def owner_hide_field_note(room_id, note_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    note = FieldNote.query.filter_by(id=note_id, room_id=room.id).first()
    if not note:
        return error("not_found", "Field Note not found.", 404)
    hide_field_note(note)
    db.session.commit()
    return ok(serialize_field_note(note))


@presence_graph_bp.route("/owner/rooms/<int:room_id>/mood-boards", methods=["POST", "GET"])
@alpha_jwt_required()
def owner_room_mood_boards(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    if request.method == "GET":
        rows = MoodBoard.query.filter_by(owner_type="room", room_id=room.id).order_by(MoodBoard.created_at.desc()).all()
        return ok({"items": [serialize_mood_board(row, include_items=True) for row in rows]})
    try:
        board = create_mood_board("room", _json_payload(), room=room)
        db.session.commit()
        return ok(serialize_mood_board(board, include_items=True), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/paths/generate", methods=["POST"])
@alpha_jwt_required()
def owner_generate_room_path(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    path = generate_path_from_room(room, generated_by="room_owner", visibility="unlisted")
    db.session.commit()
    return ok(serialize_path(path), 201)


@presence_graph_bp.route("/owner/rooms/<int:room_id>/paths", methods=["GET"])
@alpha_jwt_required()
def owner_room_paths(room_id):
    room, err = _load_owned_room(room_id)
    if err:
        return err
    rows = Path.query.filter_by(trailhead_type="room", trailhead_id=room.id).order_by(Path.created_at.desc()).all()
    return ok({"items": [serialize_path(row, include_steps=False) for row in rows]})


@paths_bp.route("/<int:path_id>", methods=["GET"])
def read_public_path(path_id):
    path, err = _load_path(path_id)
    if err:
        return err
    return ok(serialize_path(path))


@paths_bp.route("/from-room/<int:room_id>", methods=["GET"])
def path_from_room(room_id):
    row = Path.query.filter_by(trailhead_type="room", trailhead_id=room_id, status="active").filter(Path.visibility.in_(["public", "unlisted", "system"])).order_by(Path.created_at.desc()).first()
    if not row:
        room, err = _load_public_room(room_id)
        if err:
            return err
        row = generate_path_from_room(room)
        db.session.commit()
    return ok(serialize_path(row))


@paths_bp.route("/from-mood-board/<int:board_id>", methods=["GET"])
def path_from_mood_board(board_id):
    board = MoodBoard.query.filter(
        MoodBoard.id == board_id,
        MoodBoard.status == "active",
        MoodBoard.visibility.in_(["public", "room_public", "unlisted"]),
    ).first()
    if not board:
        return error("not_found", "Mood Board not found.", 404)
    row = Path.query.filter_by(trailhead_type="mood_board", trailhead_id=board.id, status="active").filter(Path.visibility.in_(["public", "unlisted", "system"])).order_by(Path.created_at.desc()).first()
    if not row:
        row = generate_path_from_mood_board(board)
        db.session.commit()
    return ok(serialize_path(row))


@paths_bp.route("/generate/from-room/<int:room_id>", methods=["POST"])
def generate_public_path_from_room(room_id):
    room, err = _load_public_room(room_id)
    if err:
        return err
    row = generate_path_from_room(room)
    db.session.commit()
    return ok(serialize_path(row), 201)


@paths_bp.route("/generate/from-mood-board/<int:board_id>", methods=["POST"])
def generate_public_path_from_mood_board(board_id):
    board = MoodBoard.query.filter(
        MoodBoard.id == board_id,
        MoodBoard.status == "active",
        MoodBoard.visibility.in_(["public", "room_public", "unlisted"]),
    ).first()
    if not board:
        return error("not_found", "Mood Board not found.", 404)
    row = generate_path_from_mood_board(board)
    db.session.commit()
    return ok(serialize_path(row), 201)


@admin_presence_graph_bp.route("/world-readiness", methods=["GET"])
@control_plane_required(scopes=["presence.analytics.read"])
def admin_world_readiness():
    return ok(get_world_status())


@admin_presence_graph_bp.route("/world-readiness/recompute", methods=["POST"])
@control_plane_required(scopes=["presence.analytics.read"])
def admin_recompute_world_readiness():
    row = compute_world_readiness()
    db.session.commit()
    return ok(serialize_world_readiness(row), 201)


@admin_presence_graph_bp.route("/moderation/flags", methods=["GET"])
@control_plane_required(scopes=["presence.node.read"])
def admin_list_moderation_flags():
    status = request.args.get("status")
    query = ModerationFlag.query
    if status:
        query = query.filter_by(status=status)
    rows = query.order_by(ModerationFlag.created_at.desc()).limit(100).all()
    return ok({"items": [serialize_moderation_flag(row) for row in rows]})


@admin_presence_graph_bp.route("/moderation/flags/<int:flag_id>/action", methods=["POST"])
@control_plane_required(scopes=["presence.node.update"])
def admin_action_moderation_flag(flag_id):
    flag = ModerationFlag.query.get(flag_id)
    if not flag:
        return error("not_found", "Moderation flag not found.", 404)
    try:
        action_moderation_flag(flag, _json_payload())
        db.session.commit()
        return ok(serialize_moderation_flag(flag))
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)


@admin_presence_graph_bp.route("/rooms/<int:room_id>/graph-summary", methods=["GET"])
@control_plane_required(scopes=["presence.analytics.read"])
def admin_room_graph_summary(room_id):
    room = PresenceNode.query.get(room_id)
    if not room:
        return error("not_found", "Presence Room not found.", 404)
    return ok(graph_summary_for_room(room))


@observer_bp.route("/field-notes/<int:note_id>/report", methods=["POST"])
@alpha_jwt_required()
def observer_report_field_note(note_id):
    observer, err = _current_observer_or_error()
    if err:
        return err
    note = FieldNote.query.get(note_id)
    if not note:
        return error("not_found", "Field Note not found.", 404)
    try:
        flag = create_moderation_flag({"target_type": "field_note", "target_id": note.id, "reason": _json_payload().get("reason") or "Reported by observer."}, reporter_observer=observer)
        db.session.commit()
        return ok(serialize_moderation_flag(flag), 201)
    except PresenceValidationError as exc:
        db.session.rollback()
        return _validation_error(exc)
