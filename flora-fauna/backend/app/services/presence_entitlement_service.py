"""Presence-specific internal plan entitlements."""

from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import PresencePlanEntitlement, User


INTERNAL_LIFETIME_FREE_PLAN_CODE = "internal_lifetime_free"
INTERNAL_COMP_BILLING_MODE = "internal_comp"
CONTROLLED_LAUNCH_SOURCE = "controlled_launch_pilot"


def _merge_metadata(
    existing: dict[str, Any] | None,
    incoming: dict[str, Any] | None,
) -> dict[str, Any]:
    return {**(existing or {}), **(incoming or {})}


def internal_lifetime_free_entitlement_for_user(
    user_id: int,
    *,
    source: str = CONTROLLED_LAUNCH_SOURCE,
) -> PresencePlanEntitlement | None:
    return PresencePlanEntitlement.query.filter_by(
        user_id=user_id,
        plan_code=INTERNAL_LIFETIME_FREE_PLAN_CODE,
        source=source,
    ).first()


def ensure_internal_lifetime_free_entitlement(
    user: User,
    *,
    source: str = CONTROLLED_LAUNCH_SOURCE,
    reason: str,
    metadata: dict[str, Any] | None = None,
) -> tuple[PresencePlanEntitlement, bool]:
    """Create or normalize the explicit zero-price lifetime Presence comp."""
    row = internal_lifetime_free_entitlement_for_user(user.id, source=source)
    created = row is None
    if created:
        row = PresencePlanEntitlement(
            user_id=user.id,
            plan_code=INTERNAL_LIFETIME_FREE_PLAN_CODE,
            source=source,
            billing_mode=INTERNAL_COMP_BILLING_MODE,
        )
        db.session.add(row)

    row.status = "active"
    row.billing_mode = INTERNAL_COMP_BILLING_MODE
    row.price_cents = 0
    row.currency = None
    row.ends_at = None
    row.lifetime = True
    row.reason = reason
    row.metadata_json = _merge_metadata(row.metadata_json, metadata)
    db.session.flush()
    return row, created


def is_active_internal_lifetime_free_entitlement(row: PresencePlanEntitlement | None) -> bool:
    return bool(
        row
        and row.plan_code == INTERNAL_LIFETIME_FREE_PLAN_CODE
        and row.status == "active"
        and row.billing_mode == INTERNAL_COMP_BILLING_MODE
        and row.price_cents == 0
        and row.ends_at is None
        and row.lifetime is True
    )
