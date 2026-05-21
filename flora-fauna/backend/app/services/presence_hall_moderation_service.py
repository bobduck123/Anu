from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import HallModerationAction, HallParticipant, Observation, PresenceHall
from .presence_service import PresenceValidationError
from .presence_social_service import clean_text, create_moderation_flag, json_object, validate_choice


MODERATION_TARGET_TYPES = {"participant", "observation", "seed", "room", "zone"}
MODERATION_ACTION_TYPES = {"warn", "mute", "remove", "ban", "hide", "restore", "slow_mode", "lock"}


def report_hall_content(hall: PresenceHall, data: dict[str, Any], *, reporter_user=None, reporter_observer=None):
    target_type = validate_choice(data.get("target_type"), MODERATION_TARGET_TYPES, field="target_type")
    target_id = _int_required(data.get("target_id"), "target_id")
    reason = clean_text(data.get("reason"), 1000) or "Reported from Hall."
    flag = create_moderation_flag(
        {"target_type": f"hall_{target_type}", "target_id": target_id, "reason": reason},
        reporter_user=reporter_user,
        reporter_observer=reporter_observer,
    )
    action = _record_action(
        hall,
        target_type=target_type,
        target_id=target_id,
        action_type="warn",
        reason=reason,
        actor_user=reporter_user,
        actor_observer=reporter_observer,
        metadata={"moderation_flag_id": flag.id, "reported": True},
    )
    if target_type == "observation":
        observation = Observation.query.get(target_id)
        if observation and observation.hall_id == hall.id and observation.moderation_state == "clean":
            observation.moderation_state = "flagged"
            observation.status = "flagged"
    return flag, action


def hide_observation(hall: PresenceHall, observation: Observation, *, actor_user=None, actor_observer=None, reason: str | None = None) -> HallModerationAction:
    if observation.hall_id != hall.id:
        raise PresenceValidationError("Observation does not belong to this Hall.")
    observation.status = "hidden"
    observation.moderation_state = "actioned"
    return _record_action(
        hall,
        target_type="observation",
        target_id=observation.id,
        action_type="hide",
        reason=reason,
        actor_user=actor_user,
        actor_observer=actor_observer,
    )


def remove_participant(hall: PresenceHall, participant: HallParticipant, *, actor_user=None, actor_observer=None, reason: str | None = None) -> HallModerationAction:
    if participant.hall_id != hall.id:
        raise PresenceValidationError("Participant does not belong to this Hall.")
    participant.status = "removed"
    return _record_action(
        hall,
        target_type="participant",
        target_id=participant.id,
        action_type="remove",
        reason=reason,
        actor_user=actor_user,
        actor_observer=actor_observer,
    )


def ban_participant(hall: PresenceHall, participant: HallParticipant, *, actor_user=None, actor_observer=None, reason: str | None = None) -> HallModerationAction:
    if participant.hall_id != hall.id:
        raise PresenceValidationError("Participant does not belong to this Hall.")
    participant.status = "banned"
    return _record_action(
        hall,
        target_type="participant",
        target_id=participant.id,
        action_type="ban",
        reason=reason,
        actor_user=actor_user,
        actor_observer=actor_observer,
    )


def host_controls(hall: PresenceHall) -> dict[str, Any]:
    return {
        "hall_id": hall.id,
        "actions": ["warn", "mute", "remove", "ban", "hide", "restore", "slow_mode", "lock"],
        "moderation_level": "shared_space",
    }


def admin_controls(hall: PresenceHall) -> dict[str, Any]:
    payload = host_controls(hall)
    payload["actions"].extend(["suspend_hall", "archive_hall"])
    payload["moderation_level"] = "admin"
    return payload


def create_hall_moderation_action(hall: PresenceHall, data: dict[str, Any], *, actor_user=None, actor_observer=None) -> HallModerationAction:
    target_type = validate_choice(data.get("target_type"), MODERATION_TARGET_TYPES, field="target_type")
    target_id = _int_required(data.get("target_id"), "target_id")
    action_type = validate_choice(data.get("action_type"), MODERATION_ACTION_TYPES, field="action_type")
    if target_type == "observation" and action_type == "hide":
        observation = Observation.query.get(target_id)
        if not observation:
            raise PresenceValidationError("Observation not found.")
        return hide_observation(hall, observation, actor_user=actor_user, actor_observer=actor_observer, reason=data.get("reason"))
    if target_type == "participant" and action_type in {"remove", "ban"}:
        participant = HallParticipant.query.get(target_id)
        if not participant:
            raise PresenceValidationError("Participant not found.")
        if action_type == "ban":
            return ban_participant(hall, participant, actor_user=actor_user, actor_observer=actor_observer, reason=data.get("reason"))
        return remove_participant(hall, participant, actor_user=actor_user, actor_observer=actor_observer, reason=data.get("reason"))
    return _record_action(
        hall,
        target_type=target_type,
        target_id=target_id,
        action_type=action_type,
        reason=data.get("reason"),
        actor_user=actor_user,
        actor_observer=actor_observer,
        metadata=data.get("metadata") or data.get("metadata_json"),
    )


def serialize_hall_moderation_action(action: HallModerationAction) -> dict[str, Any]:
    return {
        "id": action.id,
        "hall_id": action.hall_id,
        "actor_user_id": action.actor_user_id,
        "actor_observer_id": action.actor_observer_id,
        "target_type": action.target_type,
        "target_kind": action.target_type,
        "target_id": action.target_id,
        "action_type": action.action_type,
        "action": action.action_type,
        "reason": action.reason,
        "metadata": action.metadata_json or {},
        "created_at": action.created_at.isoformat() if action.created_at else None,
    }


def _record_action(
    hall: PresenceHall,
    *,
    target_type: str,
    target_id: int,
    action_type: str,
    reason: str | None = None,
    actor_user=None,
    actor_observer=None,
    metadata: dict[str, Any] | None = None,
) -> HallModerationAction:
    action = HallModerationAction(
        hall_id=hall.id,
        actor_user_id=getattr(actor_user, "id", None),
        actor_observer_id=getattr(actor_observer, "id", None),
        target_type=target_type,
        target_id=target_id,
        action_type=action_type,
        reason=clean_text(reason, 1000),
        metadata_json=json_object(metadata),
    )
    db.session.add(action)
    return action


def _int_required(value, field: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise PresenceValidationError(f"{field} must be an integer.")
    if parsed <= 0:
        raise PresenceValidationError(f"{field} must be an integer.")
    return parsed
