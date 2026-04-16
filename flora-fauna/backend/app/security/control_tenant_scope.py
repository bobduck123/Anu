from __future__ import annotations

from typing import Any

from ..models import NodeConfig, User


def _coerce_object(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    return {}


def _coerce_int_list(raw: Any) -> set[int]:
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


def normalize_control_operator_username(raw: Any) -> str:
    return str(raw or "").strip().lower()


def _coerce_str_list(raw: Any, *, normalize_usernames: bool = False) -> set[str]:
    values = raw if isinstance(raw, (list, tuple, set)) else [raw]
    parsed: set[str] = set()
    for value in values:
        text = normalize_control_operator_username(value) if normalize_usernames else str(value or "").strip()
        if text:
            parsed.add(text)
    return parsed


def _assignment_matches_user(config_json: dict[str, Any], user: User) -> bool:
    assignment = _coerce_object(config_json.get("control_operator_assignments"))

    assigned_user_ids = set()
    assigned_user_ids.update(_coerce_int_list(assignment.get("user_ids")))
    assigned_user_ids.update(_coerce_int_list(config_json.get("control_operator_user_ids")))

    assigned_usernames = set()
    assigned_usernames.update(_coerce_str_list(assignment.get("usernames"), normalize_usernames=True))
    assigned_usernames.update(_coerce_str_list(config_json.get("control_operator_usernames"), normalize_usernames=True))

    if user.id in assigned_user_ids:
        return True
    if normalize_control_operator_username(user.username) in assigned_usernames:
        return True
    return False


def resolve_persisted_control_managed_node_ids(user: User | None) -> set[int]:
    if not user:
        return set()

    managed: set[int] = set()
    if isinstance(user.node_id, int) and user.node_id > 0:
        managed.add(int(user.node_id))

    rows = NodeConfig.query.with_entities(NodeConfig.node_id, NodeConfig.config_json).all()
    for row in rows:
        node_id = int(row.node_id or 0)
        if node_id <= 0:
            continue
        config_json = _coerce_object(row.config_json)
        if _assignment_matches_user(config_json, user):
            managed.add(node_id)

    return managed


def resolve_effective_control_managed_node_ids(*, user: User | None, claims: dict[str, Any] | None) -> set[int] | None:
    if not user:
        return set()

    role = str((claims or {}).get("role") or user.role or "").strip().lower()
    if role == "platform_admin":
        return None

    persisted = resolve_persisted_control_managed_node_ids(user)

    raw_claims = claims or {}
    claimed: set[int] = set()
    claimed.update(_coerce_int_list(raw_claims.get("node_id")))
    claimed.update(_coerce_int_list(raw_claims.get("managed_node_ids")))

    if not claimed:
        return persisted

    return claimed.intersection(persisted)
