from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import func

from ..models import Node, NodeConfig, User
from ..security.control_tenant_scope import normalize_control_operator_username


@dataclass
class ControlOperatorAssignmentNotFoundError(Exception):
    message: str


@dataclass
class ControlOperatorAssignmentValidationError(Exception):
    message: str
    details: dict[str, Any] | None = None


def _coerce_object(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    return {}


def _coerce_int_set(raw: Any) -> set[int]:
    values = raw if isinstance(raw, (list, tuple, set)) else [raw]
    parsed: set[int] = set()
    for value in values:
        try:
            candidate = int(value)
        except (TypeError, ValueError):
            continue
        if candidate > 0:
            parsed.add(candidate)
    return parsed


def _coerce_username_set(raw: Any) -> set[str]:
    values = raw if isinstance(raw, (list, tuple, set)) else [raw]
    parsed: set[str] = set()
    for value in values:
        normalized = normalize_control_operator_username(value)
        if normalized:
            parsed.add(normalized)
    return parsed


def _coerce_node_config_json(raw: Any) -> dict[str, Any]:
    return _coerce_object(raw)


def _resolve_node_and_config(node_id: int) -> tuple[Node, NodeConfig | None]:
    node = Node.query.get(node_id)
    if not node:
        raise ControlOperatorAssignmentNotFoundError("Tenant node not found")
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    return node, cfg


def _collect_assignment_sets(config_json: dict[str, Any]) -> tuple[set[str], set[int]]:
    assignment = _coerce_object(config_json.get("control_operator_assignments"))

    usernames = set()
    usernames.update(_coerce_username_set(assignment.get("usernames")))
    usernames.update(_coerce_username_set(config_json.get("control_operator_usernames")))

    user_ids = set()
    user_ids.update(_coerce_int_set(assignment.get("user_ids")))
    user_ids.update(_coerce_int_set(config_json.get("control_operator_user_ids")))

    return usernames, user_ids


def _apply_assignment_sets(config_json: dict[str, Any], *, usernames: set[str], user_ids: set[int]) -> dict[str, Any]:
    normalized_usernames = sorted(usernames)
    normalized_user_ids = sorted(user_ids)
    config_json["control_operator_assignments"] = {
        "usernames": normalized_usernames,
        "user_ids": normalized_user_ids,
    }
    # Keep legacy mirrors aligned for compatibility with older readers.
    config_json["control_operator_usernames"] = normalized_usernames
    config_json["control_operator_user_ids"] = normalized_user_ids
    return config_json


def _assignment_payload(node_id: int, usernames: set[str], user_ids: set[int]) -> dict[str, Any]:
    normalized_usernames = sorted(usernames)
    normalized_user_ids = sorted(user_ids)
    return {
        "node_id": int(node_id),
        "assignments": {
            "usernames": normalized_usernames,
            "user_ids": normalized_user_ids,
            "count": len(normalized_usernames),
        },
    }


def _require_operator_user(username: str) -> User:
    operator = User.query.filter(func.lower(User.username) == username).first()
    if not operator:
        raise ControlOperatorAssignmentValidationError(
            "Operator username not found",
            details={"username": ["No user exists for this username."]},
        )
    return operator


def get_control_operator_assignments(node_id: int) -> dict[str, Any]:
    _node, cfg = _resolve_node_and_config(node_id)
    config_json = _coerce_node_config_json(cfg.config_json if cfg else {})
    usernames, user_ids = _collect_assignment_sets(config_json)
    return _assignment_payload(node_id=node_id, usernames=usernames, user_ids=user_ids)


def assign_control_operator_username(node_id: int, requested_username: str) -> dict[str, Any]:
    normalized_username = normalize_control_operator_username(requested_username)
    if not normalized_username:
        raise ControlOperatorAssignmentValidationError(
            "Operator username is required",
            details={"username": ["This field is required."]},
        )

    _node, cfg = _resolve_node_and_config(node_id)
    operator = _require_operator_user(normalized_username)

    if cfg is None:
        cfg = NodeConfig(node_id=node_id, config_json={})

    config_json = _coerce_node_config_json(cfg.config_json)
    usernames, user_ids = _collect_assignment_sets(config_json)
    before_usernames = set(usernames)
    before_user_ids = set(user_ids)

    usernames.add(normalized_username)
    user_ids.add(int(operator.id))

    applied = usernames != before_usernames or user_ids != before_user_ids
    config_json = _apply_assignment_sets(config_json, usernames=usernames, user_ids=user_ids)
    cfg.config_json = config_json

    if cfg.id is None:
        from ..extensions import db

        db.session.add(cfg)

    payload = _assignment_payload(node_id=node_id, usernames=usernames, user_ids=user_ids)
    payload["mutation"] = {
        "action": "assign",
        "requested_username": str(requested_username or ""),
        "normalized_username": normalized_username,
        "operator_user_id": int(operator.id),
        "applied": bool(applied),
        "idempotent_noop": not bool(applied),
    }
    return payload


def unassign_control_operator_username(node_id: int, requested_username: str) -> dict[str, Any]:
    normalized_username = normalize_control_operator_username(requested_username)
    if not normalized_username:
        raise ControlOperatorAssignmentValidationError(
            "Operator username is required",
            details={"username": ["This field is required."]},
        )

    _node, cfg = _resolve_node_and_config(node_id)
    if cfg is None:
        payload = _assignment_payload(node_id=node_id, usernames=set(), user_ids=set())
        payload["mutation"] = {
            "action": "unassign",
            "requested_username": str(requested_username or ""),
            "normalized_username": normalized_username,
            "operator_user_id": None,
            "applied": False,
            "idempotent_noop": True,
        }
        return payload

    config_json = _coerce_node_config_json(cfg.config_json)
    usernames, user_ids = _collect_assignment_sets(config_json)
    before_usernames = set(usernames)
    before_user_ids = set(user_ids)

    usernames.discard(normalized_username)
    operator = User.query.filter(func.lower(User.username) == normalized_username).first()
    if operator:
        user_ids.discard(int(operator.id))

    applied = usernames != before_usernames or user_ids != before_user_ids
    config_json = _apply_assignment_sets(config_json, usernames=usernames, user_ids=user_ids)
    cfg.config_json = config_json

    payload = _assignment_payload(node_id=node_id, usernames=usernames, user_ids=user_ids)
    payload["mutation"] = {
        "action": "unassign",
        "requested_username": str(requested_username or ""),
        "normalized_username": normalized_username,
        "operator_user_id": int(operator.id) if operator else None,
        "applied": bool(applied),
        "idempotent_noop": not bool(applied),
    }
    return payload
