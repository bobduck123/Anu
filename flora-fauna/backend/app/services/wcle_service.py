"""
Weekly Cost-Lowering Engine (WCLE) — Core Services

Deterministic split/savings computation, ledger integration, and
notification triggers for Phase 1 bulk-buying runs.
"""
import hashlib
import json
from datetime import datetime
from typing import Any

from ..extensions import db
from ..models import (
    Notification,
    WCLEPack,
    WCLEPledge,
    WCLERun,
    WCLERunReceipt,
    WCLERetailBaselinePrice,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class WCLEValidationError(ValueError):
    """Structured WCLE validation error surfaced to API clients."""

    def __init__(self, code: str, message: str, *, status: int = 422, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.details = details


def _raise_run_not_found(run_id: int):
    raise WCLEValidationError(
        "wcle_run_not_found",
        "Run not found",
        status=404,
        details={"run_id": run_id},
    )


def _raise_pledge_not_found(pledge_id: int):
    raise WCLEValidationError(
        "wcle_pledge_not_found",
        "Pledge not found",
        status=404,
        details={"pledge_id": pledge_id},
    )


def _ensure_run_transition(
    run: WCLERun,
    *,
    action: str,
    allowed_from: tuple[str, ...],
    target_status: str,
    idempotent_statuses: tuple[str, ...] = (),
) -> bool:
    """
    Validate deterministic run transitions.

    Returns True when the run is already in an idempotent terminal state and
    callers should treat the operation as a safe no-op.
    """
    if run.status == target_status or run.status in idempotent_statuses:
        return True

    if run.status not in allowed_from:
        raise WCLEValidationError(
            "wcle_invalid_run_transition",
            f"Cannot {action} run from status {run.status}",
            details={
                "run_id": run.id,
                "action": action,
                "current_status": run.status,
                "allowed_from_statuses": list(allowed_from),
                "target_status": target_status,
            },
        )

    return False


def _ensure_pledge_transition(
    pledge: WCLEPledge,
    *,
    action: str,
    allowed_from: tuple[str, ...],
    target_status: str,
    idempotent_statuses: tuple[str, ...] = (),
) -> bool:
    """
    Validate deterministic pledge transitions.

    Returns True when the pledge is already in an idempotent status and the
    operation should be treated as a safe no-op.
    """
    if pledge.status == target_status or pledge.status in idempotent_statuses:
        return True

    if pledge.status not in allowed_from:
        raise WCLEValidationError(
            "wcle_invalid_pledge_transition",
            f"Cannot {action} pledge from status {pledge.status}",
            details={
                "pledge_id": pledge.id,
                "run_id": pledge.run_id,
                "action": action,
                "current_status": pledge.status,
                "allowed_from_statuses": list(allowed_from),
                "target_status": target_status,
            },
        )

    return False


def _normalize_requested_items(custom_items):
    if not custom_items:
        return []
    if isinstance(custom_items, list):
        return custom_items
    return _parse_items_json(custom_items)


def _canonical_request_payload(pack_id=None, custom_items=None):
    return {
        "pack_id": pack_id,
        "custom_items": _normalize_requested_items(custom_items),
    }


def _now():
    return datetime.utcnow()


def _parse_items_json(raw):
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []


# ---------------------------------------------------------------------------
# Run lifecycle
# ---------------------------------------------------------------------------

def create_run(organizer_user_id, title, supplier_type, run_date, pledge_deadline,
               coordination_fee_cents=0, max_households=None,
               location_name=None, address=None, suburb=None, postcode=None,
               lat=None, lng=None, microcosm_id=None):
    if supplier_type not in WCLERun.VALID_SUPPLIER_TYPES:
        raise WCLEValidationError(
            "wcle_invalid_supplier_type",
            f"Invalid supplier_type: {supplier_type}",
            details={
                "supplier_type": supplier_type,
                "valid_supplier_types": list(WCLERun.VALID_SUPPLIER_TYPES),
            },
        )
    run = WCLERun(
        title=title,
        supplier_type=supplier_type,
        location_name=location_name,
        address=address,
        suburb=suburb,
        postcode=postcode,
        lat=lat,
        lng=lng,
        organizer_user_id=organizer_user_id,
        microcosm_id=microcosm_id,
        run_date=run_date,
        pledge_deadline=pledge_deadline,
        coordination_fee_per_household_cents=coordination_fee_cents,
        max_households=max_households,
        status="DRAFT",
    )
    db.session.add(run)
    db.session.commit()
    return run


def open_run(run_id):
    run = db.session.get(WCLERun, run_id)
    if not run:
        _raise_run_not_found(run_id)
    is_noop = _ensure_run_transition(
        run,
        action="open",
        allowed_from=("DRAFT",),
        target_status="OPEN",
    )
    if is_noop:
        return run
    run.status = "OPEN"
    db.session.commit()
    _notify_run_event(run, "opened")
    return run


def close_run(run_id):
    """Close a run: aggregate pledges and compute retail/bulk estimate totals."""
    run = db.session.get(WCLERun, run_id)
    if not run:
        _raise_run_not_found(run_id)
    is_noop = _ensure_run_transition(
        run,
        action="close",
        allowed_from=("OPEN",),
        target_status="CLOSED",
    )
    if is_noop:
        return run

    confirmed = WCLEPledge.query.filter_by(run_id=run_id, status="CONFIRMED").all()

    # Compute aggregated totals from confirmed pledges
    total_retail = 0
    total_bulk_est = 0
    for p in confirmed:
        total_retail += p.estimated_retail_cents or 0
        total_bulk_est += p.estimated_bulk_cents or 0

    run.retail_equivalent_total_cents = total_retail
    run.bulk_estimate_total_cents = total_bulk_est
    run.status = "CLOSED"
    db.session.commit()
    _notify_run_event(run, "closed")
    return run


def execute_run(run_id):
    run = db.session.get(WCLERun, run_id)
    if not run:
        _raise_run_not_found(run_id)
    is_noop = _ensure_run_transition(
        run,
        action="execute",
        allowed_from=("CLOSED",),
        target_status="EXECUTED",
    )
    if is_noop:
        return run
    run.status = "EXECUTED"
    db.session.commit()
    return run


def complete_run(run_id, bulk_actual_total_cents=None):
    """
    Complete a run: allocate costs, compute savings, write ledger events.

    If bulk_actual_total_cents is provided, it overrides the receipt sum.
    """
    run = db.session.get(WCLERun, run_id)
    if not run:
        _raise_run_not_found(run_id)
    if run.status == "COMPLETED":
        if (
            bulk_actual_total_cents is not None
            and run.bulk_actual_total_cents is not None
            and run.bulk_actual_total_cents != bulk_actual_total_cents
        ):
            raise WCLEValidationError(
                "wcle_run_completion_immutable",
                "Run is already completed with a different final bulk total",
                status=409,
                details={
                    "run_id": run.id,
                    "current_status": run.status,
                    "persisted_bulk_actual_total_cents": run.bulk_actual_total_cents,
                    "requested_bulk_actual_total_cents": bulk_actual_total_cents,
                },
            )
        return run
    _ensure_run_transition(
        run,
        action="complete",
        allowed_from=("EXECUTED", "CLOSED"),
        target_status="COMPLETED",
    )

    # Determine actual bulk total
    if bulk_actual_total_cents is not None:
        actual = bulk_actual_total_cents
    else:
        receipts = WCLERunReceipt.query.filter_by(run_id=run_id).all()
        actual = sum(r.bulk_actual_total_cents for r in receipts)
    if actual < 0:
        raise WCLEValidationError(
            "wcle_invalid_bulk_total",
            "bulk_actual_total_cents cannot be negative",
            details={"bulk_actual_total_cents": actual},
        )

    run.bulk_actual_total_cents = actual

    # Get confirmed + fulfilled pledges (exclude CANCELLED)
    active_pledges = WCLEPledge.query.filter(
        WCLEPledge.run_id == run_id,
        WCLEPledge.status.in_(("CONFIRMED", "FULFILLED")),
    ).all()

    no_show_pledges = WCLEPledge.query.filter_by(run_id=run_id, status="NO_SHOW").all()

    # Allocate proportional bulk costs + coordination fees
    _allocate_costs(run, active_pledges, no_show_pledges, actual)

    run.status = "COMPLETED"
    db.session.commit()

    # Write ledger events (idempotent)
    _write_completion_ledger(run, active_pledges)

    # Notifications
    _notify_run_event(run, "completed")
    for p in active_pledges:
        _notify_savings(p)

    return run


def cancel_run(run_id):
    run = db.session.get(WCLERun, run_id)
    if not run:
        _raise_run_not_found(run_id)
    if run.status == "CANCELLED":
        return run
    if run.status == "COMPLETED":
        raise WCLEValidationError(
            "wcle_invalid_run_transition",
            "Cannot cancel a completed run",
            details={
                "run_id": run.id,
                "action": "cancel",
                "current_status": run.status,
                "allowed_from_statuses": ["DRAFT", "OPEN", "CLOSED", "EXECUTED"],
                "target_status": "CANCELLED",
            },
        )
    run.status = "CANCELLED"
    # Cancel all non-terminal pledges
    WCLEPledge.query.filter(
        WCLEPledge.run_id == run_id,
        WCLEPledge.status.in_(("DRAFT", "CONFIRMED")),
    ).update({"status": "CANCELLED"}, synchronize_session="fetch")
    db.session.commit()
    return run


# ---------------------------------------------------------------------------
# Pack CRUD
# ---------------------------------------------------------------------------

def create_pack(run_id, name, items, description=None,
                adjustable_quantities=False, waste_buffer_bps=500):
    run = db.session.get(WCLERun, run_id)
    if not run:
        _raise_run_not_found(run_id)

    retail_est = sum(
        (i.get("retail_unit_price_cents", 0) * i.get("qty", 0)) for i in items
    )
    bulk_est = sum(
        (i.get("bulk_unit_price_cents", 0) * i.get("qty", 0)) for i in items
    )

    pack = WCLEPack(
        run_id=run_id,
        name=name,
        description=description,
        items_json=json.dumps(items),
        adjustable_quantities=adjustable_quantities,
        waste_buffer_bps=waste_buffer_bps,
        retail_estimate_cents=retail_est,
        bulk_estimate_cents=bulk_est,
    )
    db.session.add(pack)
    db.session.commit()
    return pack


def update_pack(pack_id, **kwargs):
    pack = db.session.get(WCLEPack, pack_id)
    if not pack:
        raise ValueError("Pack not found")
    if "items" in kwargs:
        items = kwargs.pop("items")
        pack.items_json = json.dumps(items)
        pack.retail_estimate_cents = sum(
            (i.get("retail_unit_price_cents", 0) * i.get("qty", 0)) for i in items
        )
        pack.bulk_estimate_cents = sum(
            (i.get("bulk_unit_price_cents", 0) * i.get("qty", 0)) for i in items
        )
    for k, v in kwargs.items():
        if hasattr(pack, k):
            setattr(pack, k, v)
    db.session.commit()
    return pack


# ---------------------------------------------------------------------------
# Pledge CRUD
# ---------------------------------------------------------------------------

def create_pledge(run_id, user_id, pack_id=None, custom_items=None):
    run = db.session.get(WCLERun, run_id)
    if not run:
        _raise_run_not_found(run_id)
    if run.status != "OPEN":
        raise WCLEValidationError(
            "wcle_run_not_open_for_pledges",
            "Run is not open for pledges",
            details={
                "run_id": run_id,
                "current_status": run.status,
                "required_status": "OPEN",
            },
        )

    requested_payload = _canonical_request_payload(pack_id=pack_id, custom_items=custom_items)

    # Retry-safe idempotency guard: reuse matching active pledge.
    existing = WCLEPledge.query.filter(
        WCLEPledge.run_id == run_id,
        WCLEPledge.user_id == user_id,
        WCLEPledge.status.in_(("DRAFT", "CONFIRMED")),
    ).first()
    if existing:
        existing_payload = _canonical_request_payload(
            pack_id=existing.pack_id,
            custom_items=_parse_items_json(existing.custom_items_json),
        )
        if existing_payload == requested_payload:
            return existing
        raise WCLEValidationError(
            "wcle_pledge_exists_conflict",
            "An active pledge already exists for this run with different selections",
            status=409,
            details={
                "run_id": run_id,
                "user_id": user_id,
                "existing_pledge_id": existing.id,
                "existing_status": existing.status,
                "requested_payload": requested_payload,
                "existing_payload": existing_payload,
            },
        )

    if run.max_households:
        count = WCLEPledge.query.filter(
            WCLEPledge.run_id == run_id,
            WCLEPledge.status.in_(("DRAFT", "CONFIRMED")),
        ).count()
        if count >= run.max_households:
            raise WCLEValidationError(
                "wcle_max_households_reached",
                "Run has reached maximum households",
                status=409,
                details={
                    "run_id": run_id,
                    "max_households": run.max_households,
                    "active_households": count,
                },
            )

    retail_est = 0
    bulk_est = 0

    if pack_id:
        pack = db.session.get(WCLEPack, pack_id)
        if not pack or pack.run_id != run_id:
            raise WCLEValidationError(
                "wcle_invalid_pack_for_run",
                "Invalid pack for this run",
                details={
                    "run_id": run_id,
                    "pack_id": pack_id,
                },
            )
        retail_est = pack.retail_estimate_cents or 0
        bulk_est = pack.bulk_estimate_cents or 0

    if custom_items:
        retail_est = sum(
            (i.get("retail_unit_price_cents", 0) * i.get("qty", 0)) for i in custom_items
        )
        bulk_est = sum(
            (i.get("bulk_unit_price_cents", 0) * i.get("qty", 0)) for i in custom_items
        )

    pledge = WCLEPledge(
        run_id=run_id,
        user_id=user_id,
        pack_id=pack_id,
        custom_items_json=json.dumps(custom_items) if custom_items else None,
        status="DRAFT",
        estimated_retail_cents=retail_est,
        estimated_bulk_cents=bulk_est,
    )
    db.session.add(pledge)
    db.session.commit()
    return pledge


def confirm_pledge(pledge_id):
    pledge = db.session.get(WCLEPledge, pledge_id)
    if not pledge:
        _raise_pledge_not_found(pledge_id)
    is_noop = _ensure_pledge_transition(
        pledge,
        action="confirm",
        allowed_from=("DRAFT",),
        target_status="CONFIRMED",
    )
    if is_noop:
        return pledge
    pledge.status = "CONFIRMED"
    db.session.commit()
    return pledge


def cancel_pledge(pledge_id):
    pledge = db.session.get(WCLEPledge, pledge_id)
    if not pledge:
        _raise_pledge_not_found(pledge_id)
    is_noop = _ensure_pledge_transition(
        pledge,
        action="cancel",
        allowed_from=("DRAFT", "CONFIRMED"),
        target_status="CANCELLED",
    )
    if is_noop:
        return pledge
    pledge.status = "CANCELLED"
    db.session.commit()
    return pledge


def mark_pledge_fulfilled(pledge_id):
    pledge = db.session.get(WCLEPledge, pledge_id)
    if not pledge:
        _raise_pledge_not_found(pledge_id)
    is_noop = _ensure_pledge_transition(
        pledge,
        action="fulfil",
        allowed_from=("CONFIRMED",),
        target_status="FULFILLED",
    )
    if is_noop:
        return pledge
    pledge.status = "FULFILLED"
    pledge.pickup_confirmed_at = _now()
    db.session.commit()
    return pledge


def mark_pledge_no_show(pledge_id):
    pledge = db.session.get(WCLEPledge, pledge_id)
    if not pledge:
        _raise_pledge_not_found(pledge_id)
    is_noop = _ensure_pledge_transition(
        pledge,
        action="mark no-show",
        allowed_from=("CONFIRMED",),
        target_status="NO_SHOW",
    )
    if is_noop:
        return pledge
    pledge.status = "NO_SHOW"
    db.session.commit()
    return pledge


# ---------------------------------------------------------------------------
# Receipt
# ---------------------------------------------------------------------------

def add_receipt(run_id, bulk_actual_total_cents, receipt_type="MANUAL_ENTRY",
                receipt_meta=None):
    if receipt_type not in WCLERunReceipt.VALID_RECEIPT_TYPES:
        raise ValueError(f"Invalid receipt_type: {receipt_type}")
    if bulk_actual_total_cents < 0:
        raise ValueError("bulk_actual_total_cents cannot be negative")

    meta_str = json.dumps(receipt_meta) if receipt_meta else None
    hash_input = f"{run_id}:{bulk_actual_total_cents}:{meta_str}:{_now().isoformat()}"
    receipt_hash = hashlib.sha256(hash_input.encode()).hexdigest()

    receipt = WCLERunReceipt(
        run_id=run_id,
        receipt_type=receipt_type,
        receipt_hash=receipt_hash,
        receipt_meta_json=meta_str,
        bulk_actual_total_cents=bulk_actual_total_cents,
    )
    db.session.add(receipt)
    db.session.commit()
    return receipt


# ---------------------------------------------------------------------------
# Retail Baseline Prices
# ---------------------------------------------------------------------------

def upsert_baseline_price(item_key, retailer, price_cents, unit,
                          postcode=None, source_note=None):
    if retailer not in WCLERetailBaselinePrice.VALID_RETAILERS:
        raise ValueError(f"Invalid retailer: {retailer}")
    price = WCLERetailBaselinePrice(
        item_key=item_key,
        retailer=retailer,
        price_cents=price_cents,
        unit=unit,
        postcode=postcode,
        source_note=source_note,
        captured_at=_now(),
    )
    db.session.add(price)
    db.session.commit()
    return price


def get_latest_baseline(item_key, retailer=None):
    q = WCLERetailBaselinePrice.query.filter_by(item_key=item_key)
    if retailer:
        q = q.filter_by(retailer=retailer)
    return q.order_by(WCLERetailBaselinePrice.captured_at.desc()).first()


# ---------------------------------------------------------------------------
# Deterministic Cost Allocation (Split Engine)
# ---------------------------------------------------------------------------

def _allocate_costs(run, active_pledges, no_show_pledges, bulk_actual_cents):
    """
    Proportionally allocate bulk costs to active pledges.
    Deterministic rounding: largest-remainder method ensures exact sum.

    NO_SHOW policy: charged coordination fee, bulk allocation redistributed.
    """
    fee = run.coordination_fee_per_household_cents
    total_active = len(active_pledges)

    if total_active == 0:
        # Edge case: all no-shows, charge fees only
        for p in no_show_pledges:
            p.final_coordination_fee_cents = fee
            p.final_allocated_bulk_cents = 0
            p.final_total_cents = fee
            p.savings_cents = 0
        return

    # Compute each pledge's proportional share of bulk cost
    total_estimated_bulk = sum(p.estimated_bulk_cents or 0 for p in active_pledges)

    if total_estimated_bulk == 0:
        # Equal split if no estimates
        base = bulk_actual_cents // total_active
        remainder = bulk_actual_cents - (base * total_active)
        for i, p in enumerate(active_pledges):
            alloc = base + (1 if i < remainder else 0)
            p.final_allocated_bulk_cents = alloc
            p.final_coordination_fee_cents = fee
            p.final_total_cents = alloc + fee
            retail_equiv = p.estimated_retail_cents or 0
            p.savings_cents = max(0, retail_equiv - p.final_total_cents)
    else:
        # Proportional allocation with largest-remainder rounding
        exact_shares = []
        for p in active_pledges:
            share = (p.estimated_bulk_cents or 0) / total_estimated_bulk
            exact_shares.append(share * bulk_actual_cents)

        allocations = _largest_remainder_round(exact_shares, bulk_actual_cents)

        for i, p in enumerate(active_pledges):
            p.final_allocated_bulk_cents = allocations[i]
            p.final_coordination_fee_cents = fee
            p.final_total_cents = allocations[i] + fee
            retail_equiv = p.estimated_retail_cents or 0
            p.savings_cents = max(0, retail_equiv - p.final_total_cents)

    # NO_SHOW: coordination fee only, no bulk allocation
    for p in no_show_pledges:
        p.final_coordination_fee_cents = fee
        p.final_allocated_bulk_cents = 0
        p.final_total_cents = fee
        p.savings_cents = 0


def _largest_remainder_round(exact_values, target_sum):
    """
    Largest-remainder method: allocate integer cents so they sum exactly
    to target_sum, distributed proportionally to exact_values.
    """
    floors = [int(v) for v in exact_values]
    remainders = [v - f for v, f in zip(exact_values, floors)]
    floor_sum = sum(floors)
    shortfall = target_sum - floor_sum

    # Sort indices by remainder descending, break ties by index (deterministic)
    indices = sorted(range(len(remainders)), key=lambda i: (-remainders[i], i))

    for i in range(shortfall):
        floors[indices[i]] += 1

    return floors


# ---------------------------------------------------------------------------
# Ledger Integration (Append-only, Idempotent)
# ---------------------------------------------------------------------------

def _write_completion_ledger(run, active_pledges):
    """Write immutable ledger events for run completion. Idempotent."""
    from .ledger_service import append_entry
    from ..models import ImpactLedgerEntry, ImpactPool

    # Determine the node_id from the organizer
    from ..models import User
    organizer = db.session.get(User, run.organizer_user_id)
    node_id = organizer.node_id if organizer and organizer.node_id else 1

    # Ensure WCLE pool exists
    pool = ImpactPool.query.filter_by(node_id=node_id, slug="wcle_savings").first()
    if not pool:
        pool = ImpactPool(
            node_id=node_id,
            slug="wcle_savings",
            name="WCLE Savings Pool",
            description="Tracks cumulative savings from Weekly Cost-Lowering Engine runs",
            category="savings",
            created_by=run.organizer_user_id,
        )
        db.session.add(pool)
        db.session.flush()

    # Idempotency: check if RUN_COMPLETED already written
    existing = ImpactLedgerEntry.query.filter_by(
        reference_id=str(run.id),
        reference_type="WCLE_RUN_COMPLETED",
    ).first()
    if existing:
        return  # Already written, skip

    # RUN_COMPLETED event
    total_savings = sum(p.savings_cents or 0 for p in active_pledges)
    append_entry(
        node_id=node_id,
        pool_id=pool.id,
        entry_type="credit",
        amount_cents=total_savings,
        description=f"Run #{run.id} completed: {run.title}",
        reference_id=str(run.id),
        reference_type="WCLE_RUN_COMPLETED",
        created_by=run.organizer_user_id,
    )

    # Per-pledge events
    for pledge in active_pledges:
        pledge_ref = f"WCLE_PLEDGE_FULFILLED:{run.id}:{pledge.id}"
        existing_pledge = ImpactLedgerEntry.query.filter_by(
            reference_id=str(pledge.id),
            reference_type="WCLE_PLEDGE_FULFILLED",
        ).first()
        if existing_pledge:
            continue

        append_entry(
            node_id=node_id,
            pool_id=pool.id,
            entry_type="credit",
            amount_cents=pledge.savings_cents or 0,
            description=(
                f"Pledge #{pledge.id} fulfilled: saved {pledge.savings_cents or 0}c "
                f"(retail {pledge.estimated_retail_cents or 0}c - "
                f"bulk {pledge.final_allocated_bulk_cents or 0}c - "
                f"fee {pledge.final_coordination_fee_cents or 0}c)"
            ),
            reference_id=str(pledge.id),
            reference_type="WCLE_PLEDGE_FULFILLED",
            created_by=pledge.user_id,
        )


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def _notify_run_event(run, event_type):
    """Create notifications for run lifecycle events."""
    messages = {
        "opened": f"New run available: {run.title} at {run.location_name or run.supplier_type}",
        "closed": f"Run closed: {run.title} — pledges are locked in",
        "completed": f"Run completed: {run.title} — check your savings!",
        "deadline_approaching": f"Pledge deadline approaching for: {run.title}",
        "pickup_reminder": f"Pickup time for: {run.title}",
    }
    msg = messages.get(event_type)
    if not msg:
        return

    if event_type == "opened":
        # Notify microcosm members if run is in a microcosm
        if run.microcosm_id and run.microcosm:
            members = run.microcosm.members
            for member in members:
                if member.id != run.organizer_user_id:
                    _create_notification(member.id, msg)
    elif event_type in ("closed", "completed"):
        # Notify all pledgers
        pledges = WCLEPledge.query.filter(
            WCLEPledge.run_id == run.id,
            WCLEPledge.status.in_(("CONFIRMED", "FULFILLED", "NO_SHOW")),
        ).all()
        for p in pledges:
            _create_notification(p.user_id, msg)


def _notify_savings(pledge):
    if pledge.savings_cents and pledge.savings_cents > 0:
        savings_dollars = pledge.savings_cents / 100
        msg = f"You saved ${savings_dollars:.2f} on your latest bulk buy!"
        _create_notification(pledge.user_id, msg)


def _create_notification(user_id, message):
    notif = Notification(user_id=user_id, message=message)
    db.session.add(notif)
    db.session.commit()


# ---------------------------------------------------------------------------
# Query Helpers / Dashboard
# ---------------------------------------------------------------------------

def get_runs_near_postcode(postcode, limit=20):
    return WCLERun.query.filter(
        WCLERun.postcode == postcode,
        WCLERun.status.in_(("OPEN", "CLOSED")),
    ).order_by(WCLERun.run_date.asc()).limit(limit).all()


def get_user_savings_summary(user_id):
    """Compute savings summary for a user's dashboard."""
    pledges = WCLEPledge.query.filter_by(user_id=user_id, status="FULFILLED").all()

    now = _now()
    week_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    # Simplistic week boundary: last 7 days
    from datetime import timedelta
    week_start = now - timedelta(days=now.weekday())
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    this_week = sum(p.savings_cents or 0 for p in pledges
                    if p.pickup_confirmed_at and p.pickup_confirmed_at >= week_start)
    this_month = sum(p.savings_cents or 0 for p in pledges
                     if p.pickup_confirmed_at and p.pickup_confirmed_at >= month_start)
    this_year = sum(p.savings_cents or 0 for p in pledges
                    if p.pickup_confirmed_at and p.pickup_confirmed_at >= year_start)
    lifetime = sum(p.savings_cents or 0 for p in pledges)
    run_count = len(pledges)

    # Participation streak: count consecutive weeks with fulfilled pledges
    streak = _compute_streak(pledges)

    return {
        "savings_this_week_cents": this_week,
        "savings_this_month_cents": this_month,
        "savings_this_year_cents": this_year,
        "savings_lifetime_cents": lifetime,
        "runs_participated": run_count,
        "participation_streak_weeks": streak,
    }


def _compute_streak(pledges):
    """Count consecutive weeks (backward from now) with at least one fulfilled pledge."""
    if not pledges:
        return 0
    from datetime import timedelta
    now = _now()
    # Build set of (year, week_number) from fulfilled pledges
    weeks_with_activity = set()
    for p in pledges:
        if p.pickup_confirmed_at:
            iso = p.pickup_confirmed_at.isocalendar()
            weeks_with_activity.add((iso[0], iso[1]))

    streak = 0
    current = now
    while True:
        iso = current.isocalendar()
        if (iso[0], iso[1]) in weeks_with_activity:
            streak += 1
            current -= timedelta(weeks=1)
        else:
            break
    return streak


def get_community_savings(microcosm_id=None):
    """Total savings across all completed runs, optionally filtered by microcosm."""
    q = db.session.query(db.func.sum(WCLEPledge.savings_cents)).filter(
        WCLEPledge.status == "FULFILLED"
    )
    if microcosm_id:
        q = q.join(WCLERun, WCLEPledge.run_id == WCLERun.id).filter(
            WCLERun.microcosm_id == microcosm_id
        )
    total = q.scalar() or 0
    return {"total_savings_cents": total}
