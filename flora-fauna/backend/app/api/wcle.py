"""
Phase 1 — Weekly Cost-Lowering Engine (WCLE) API endpoints.

Provides CRUD for runs, packs, pledges, receipts, baseline prices,
and savings dashboard queries.
"""
from datetime import datetime

from flask import Blueprint, request

from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services import wcle_service
from ..models import (
    WCLERun, WCLEPack, WCLEPledge, WCLERunReceipt, WCLERetailBaselinePrice, db,
)
from .utils import ok, error

wcle_bp = Blueprint("wcle", __name__, url_prefix="/wcle")


def _wcle_error_response(exc: ValueError):
    if isinstance(exc, wcle_service.WCLEValidationError):
        return error(
            exc.code,
            str(exc),
            status=exc.status,
            details=exc.details,
        )
    return error("validation", str(exc), status=422)


# ---------------------------------------------------------------------------
# Runs
# ---------------------------------------------------------------------------

@wcle_bp.route("/runs", methods=["GET"])
@alpha_jwt_required()
def list_runs():
    """List runs with optional filters: postcode, supplier_type, status."""
    postcode = request.args.get("postcode")
    supplier_type = request.args.get("supplier_type")
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)

    q = WCLERun.query
    if postcode:
        q = q.filter(WCLERun.postcode == postcode)
    if supplier_type:
        q = q.filter(WCLERun.supplier_type == supplier_type)
    if status:
        q = q.filter(WCLERun.status == status)
    else:
        q = q.filter(WCLERun.status.in_(("OPEN", "CLOSED", "EXECUTED", "COMPLETED")))

    q = q.order_by(WCLERun.run_date.desc())
    total = q.count()
    runs = q.offset((page - 1) * per_page).limit(per_page).all()

    return ok({
        "runs": [r.to_dict() for r in runs],
        "total": total,
        "page": page,
        "per_page": per_page,
    })


@wcle_bp.route("/runs/<int:run_id>", methods=["GET"])
@alpha_jwt_required()
def get_run(run_id):
    """Get run detail with packs and pledge count."""
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)

    packs = WCLEPack.query.filter_by(run_id=run_id).all()
    pledge_count = WCLEPledge.query.filter(
        WCLEPledge.run_id == run_id,
        WCLEPledge.status.in_(("DRAFT", "CONFIRMED", "FULFILLED")),
    ).count()

    data = run.to_dict()
    data["packs"] = [p.to_dict() for p in packs]
    data["pledge_count"] = pledge_count
    data["organizer_username"] = run.organizer.username if run.organizer else None

    return ok(data)


@wcle_bp.route("/runs", methods=["POST"])
@require_permission("wcle:run:create")
def create_run():
    """Create a new run (organizer only)."""
    body = request.get_json(silent=True) or {}
    user = get_current_user()
    if not user:
        return error("unauthorized", "Not authenticated", status=401)

    required = ["title", "supplier_type", "run_date", "pledge_deadline"]
    for field in required:
        if field not in body:
            return error("validation", f"Missing required field: {field}", status=422)

    try:
        run_date = datetime.fromisoformat(body["run_date"])
        pledge_deadline = datetime.fromisoformat(body["pledge_deadline"])
    except (ValueError, TypeError) as e:
        return error("validation", f"Invalid date format: {e}", status=422)

    pickup_start = None
    pickup_end = None
    if body.get("pickup_window_start"):
        try:
            pickup_start = datetime.fromisoformat(body["pickup_window_start"])
        except (ValueError, TypeError):
            pass
    if body.get("pickup_window_end"):
        try:
            pickup_end = datetime.fromisoformat(body["pickup_window_end"])
        except (ValueError, TypeError):
            pass

    try:
        run = wcle_service.create_run(
            organizer_user_id=user.id,
            title=body["title"],
            supplier_type=body["supplier_type"],
            run_date=run_date,
            pledge_deadline=pledge_deadline,
            coordination_fee_cents=body.get("coordination_fee_per_household_cents", 0),
            max_households=body.get("max_households"),
            location_name=body.get("location_name"),
            address=body.get("address"),
            suburb=body.get("suburb"),
            postcode=body.get("postcode"),
            lat=body.get("lat"),
            lng=body.get("lng"),
            microcosm_id=body.get("microcosm_id"),
        )
    except ValueError as e:
        return _wcle_error_response(e)

    return ok(run.to_dict(), status=201)


@wcle_bp.route("/runs/<int:run_id>", methods=["PATCH"])
@require_permission("wcle:run:manage")
def update_run(run_id):
    """Update run details (organizer only, pre-CLOSED)."""
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)
    if run.status not in ("DRAFT", "OPEN"):
        return error("validation", "Cannot update run after it is closed", status=422)

    body = request.get_json(silent=True) or {}
    updatable = [
        "title", "supplier_type", "location_name", "address", "suburb",
        "postcode", "lat", "lng", "coordination_fee_per_household_cents",
        "max_households",
    ]
    for k in updatable:
        if k in body:
            setattr(run, k, body[k])

    for date_field in ("run_date", "pledge_deadline", "pickup_window_start", "pickup_window_end"):
        if date_field in body and body[date_field]:
            try:
                setattr(run, date_field, datetime.fromisoformat(body[date_field]))
            except (ValueError, TypeError):
                return error("validation", f"Invalid date for {date_field}", status=422)

    db.session.commit()
    return ok(run.to_dict())


@wcle_bp.route("/runs/<int:run_id>/open", methods=["POST"])
@require_permission("wcle:run:manage")
def open_run(run_id):
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)
    try:
        run = wcle_service.open_run(run_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(run.to_dict())


@wcle_bp.route("/runs/<int:run_id>/close", methods=["POST"])
@require_permission("wcle:run:manage")
def close_run(run_id):
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)
    try:
        run = wcle_service.close_run(run_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(run.to_dict())


@wcle_bp.route("/runs/<int:run_id>/execute", methods=["POST"])
@require_permission("wcle:run:manage")
def execute_run(run_id):
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)
    try:
        run = wcle_service.execute_run(run_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(run.to_dict())


@wcle_bp.route("/runs/<int:run_id>/complete", methods=["POST"])
@require_permission("wcle:run:manage")
def complete_run(run_id):
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)
    body = request.get_json(silent=True) or {}
    try:
        run = wcle_service.complete_run(
            run_id,
            bulk_actual_total_cents=body.get("bulk_actual_total_cents"),
        )
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(run.to_dict())


@wcle_bp.route("/runs/<int:run_id>/cancel", methods=["POST"])
@require_permission("wcle:run:manage")
def cancel_run(run_id):
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)
    try:
        run = wcle_service.cancel_run(run_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(run.to_dict())


# ---------------------------------------------------------------------------
# Organizer Panel
# ---------------------------------------------------------------------------

@wcle_bp.route("/runs/<int:run_id>/organizer", methods=["GET"])
@require_permission("wcle:run:manage")
def organizer_panel(run_id):
    """Organizer view: pledges, aggregated quantities, split sheet."""
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)

    pledges = WCLEPledge.query.filter_by(run_id=run_id).all()
    packs = WCLEPack.query.filter_by(run_id=run_id).all()

    # Aggregate quantities across confirmed pledges
    import json
    aggregated = {}
    for pledge in pledges:
        if pledge.status not in ("CONFIRMED", "FULFILLED"):
            continue
        items = []
        if pledge.pack_id:
            pack = db.session.get(WCLEPack, pledge.pack_id)
            if pack:
                try:
                    items = json.loads(pack.items_json) if isinstance(pack.items_json, str) else pack.items_json or []
                except (json.JSONDecodeError, TypeError):
                    items = []
        if pledge.custom_items_json:
            try:
                items = json.loads(pledge.custom_items_json) if isinstance(pledge.custom_items_json, str) else pledge.custom_items_json or []
            except (json.JSONDecodeError, TypeError):
                pass
        for item in items:
            key = item.get("name", "unknown")
            if key not in aggregated:
                aggregated[key] = {"name": key, "unit": item.get("unit", ""), "total_qty": 0}
            aggregated[key]["total_qty"] += item.get("qty", 0)

    return ok({
        "run": run.to_dict(),
        "packs": [p.to_dict() for p in packs],
        "pledges": [p.to_dict() for p in pledges],
        "aggregated_quantities": list(aggregated.values()),
    })


# ---------------------------------------------------------------------------
# Packs
# ---------------------------------------------------------------------------

@wcle_bp.route("/runs/<int:run_id>/packs", methods=["GET"])
@alpha_jwt_required()
def list_packs(run_id):
    packs = WCLEPack.query.filter_by(run_id=run_id).all()
    return ok([p.to_dict() for p in packs])


@wcle_bp.route("/runs/<int:run_id>/packs", methods=["POST"])
@require_permission("wcle:run:manage")
def create_pack(run_id):
    user = get_current_user()
    run = db.session.get(WCLERun, run_id)
    if not run:
        return error("not_found", "Run not found", status=404)
    if user and run.organizer_user_id != user.id and user.role not in ("node_admin", "platform_admin"):
        return error("forbidden", "Not the organizer of this run", status=403)

    body = request.get_json(silent=True) or {}
    if not body.get("name"):
        return error("validation", "Missing required field: name", status=422)
    if not body.get("items"):
        return error("validation", "Missing required field: items", status=422)

    try:
        pack = wcle_service.create_pack(
            run_id=run_id,
            name=body["name"],
            items=body["items"],
            description=body.get("description"),
            adjustable_quantities=body.get("adjustable_quantities", False),
            waste_buffer_bps=body.get("waste_buffer_bps", 500),
        )
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(pack.to_dict(), status=201)


@wcle_bp.route("/packs/<int:pack_id>", methods=["PATCH"])
@require_permission("wcle:run:manage")
def update_pack(pack_id):
    pack = db.session.get(WCLEPack, pack_id)
    if not pack:
        return error("not_found", "Pack not found", status=404)
    body = request.get_json(silent=True) or {}
    try:
        pack = wcle_service.update_pack(pack_id, **body)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(pack.to_dict())


# ---------------------------------------------------------------------------
# Pledges
# ---------------------------------------------------------------------------

@wcle_bp.route("/runs/<int:run_id>/pledges", methods=["GET"])
@alpha_jwt_required()
def list_pledges(run_id):
    status_filter = request.args.get("status")
    q = WCLEPledge.query.filter_by(run_id=run_id)
    if status_filter:
        q = q.filter(WCLEPledge.status == status_filter)
    pledges = q.all()
    return ok([p.to_dict() for p in pledges])


@wcle_bp.route("/runs/<int:run_id>/pledges", methods=["POST"])
@alpha_jwt_required()
def create_pledge(run_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Not authenticated", status=401)
    body = request.get_json(silent=True) or {}
    try:
        pledge = wcle_service.create_pledge(
            run_id=run_id,
            user_id=user.id,
            pack_id=body.get("pack_id"),
            custom_items=body.get("custom_items"),
        )
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(pledge.to_dict(), status=201)


@wcle_bp.route("/pledges/<int:pledge_id>/confirm", methods=["POST"])
@alpha_jwt_required()
def confirm_pledge(pledge_id):
    user = get_current_user()
    pledge = db.session.get(WCLEPledge, pledge_id)
    if not pledge:
        return error("not_found", "Pledge not found", status=404)
    if user and pledge.user_id != user.id:
        return error("forbidden", "Not your pledge", status=403)
    try:
        pledge = wcle_service.confirm_pledge(pledge_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(pledge.to_dict())


@wcle_bp.route("/pledges/<int:pledge_id>/cancel", methods=["POST"])
@alpha_jwt_required()
def cancel_pledge(pledge_id):
    user = get_current_user()
    pledge = db.session.get(WCLEPledge, pledge_id)
    if not pledge:
        return error("not_found", "Pledge not found", status=404)
    if user and pledge.user_id != user.id:
        return error("forbidden", "Not your pledge", status=403)
    try:
        pledge = wcle_service.cancel_pledge(pledge_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(pledge.to_dict())


@wcle_bp.route("/pledges/<int:pledge_id>/fulfil", methods=["POST"])
@require_permission("wcle:run:manage")
def fulfil_pledge(pledge_id):
    """Organizer marks a pledge as picked up / fulfilled."""
    try:
        pledge = wcle_service.mark_pledge_fulfilled(pledge_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(pledge.to_dict())


@wcle_bp.route("/pledges/<int:pledge_id>/no-show", methods=["POST"])
@require_permission("wcle:run:manage")
def no_show_pledge(pledge_id):
    """Organizer marks a pledge as no-show."""
    try:
        pledge = wcle_service.mark_pledge_no_show(pledge_id)
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(pledge.to_dict())


@wcle_bp.route("/my-pledges", methods=["GET"])
@alpha_jwt_required()
def my_pledges():
    """Get current user's pledges across all runs."""
    user = get_current_user()
    if not user:
        return error("unauthorized", "Not authenticated", status=401)
    pledges = WCLEPledge.query.filter_by(user_id=user.id).order_by(
        WCLEPledge.created_at.desc()
    ).all()
    result = []
    for p in pledges:
        d = p.to_dict()
        run = db.session.get(WCLERun, p.run_id)
        d["run_title"] = run.title if run else None
        d["run_status"] = run.status if run else None
        d["run_date"] = run.run_date.isoformat() if run and run.run_date else None
        result.append(d)
    return ok(result)


# ---------------------------------------------------------------------------
# Receipts
# ---------------------------------------------------------------------------

@wcle_bp.route("/runs/<int:run_id>/receipts", methods=["GET"])
@require_permission("wcle:run:manage")
def list_receipts(run_id):
    receipts = WCLERunReceipt.query.filter_by(run_id=run_id).all()
    return ok([r.to_dict() for r in receipts])


@wcle_bp.route("/runs/<int:run_id>/receipts", methods=["POST"])
@require_permission("wcle:receipt:create")
def create_receipt(run_id):
    body = request.get_json(silent=True) or {}
    if "bulk_actual_total_cents" not in body:
        return error("validation", "Missing required field: bulk_actual_total_cents", status=422)
    try:
        receipt = wcle_service.add_receipt(
            run_id=run_id,
            bulk_actual_total_cents=body["bulk_actual_total_cents"],
            receipt_type=body.get("receipt_type", "MANUAL_ENTRY"),
            receipt_meta=body.get("receipt_meta"),
        )
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(receipt.to_dict(), status=201)


# ---------------------------------------------------------------------------
# Retail Baseline Prices
# ---------------------------------------------------------------------------

@wcle_bp.route("/baseline-prices", methods=["GET"])
@alpha_jwt_required()
def list_baseline_prices():
    item_key = request.args.get("item_key")
    retailer = request.args.get("retailer")
    q = WCLERetailBaselinePrice.query
    if item_key:
        q = q.filter(WCLERetailBaselinePrice.item_key == item_key)
    if retailer:
        q = q.filter(WCLERetailBaselinePrice.retailer == retailer)
    prices = q.order_by(WCLERetailBaselinePrice.captured_at.desc()).limit(200).all()
    return ok([p.to_dict() for p in prices])


@wcle_bp.route("/baseline-prices", methods=["POST"])
@require_permission("wcle:baseline:manage")
def create_baseline_price():
    body = request.get_json(silent=True) or {}
    required = ["item_key", "retailer", "price_cents", "unit"]
    for field in required:
        if field not in body:
            return error("validation", f"Missing required field: {field}", status=422)
    try:
        price = wcle_service.upsert_baseline_price(
            item_key=body["item_key"],
            retailer=body["retailer"],
            price_cents=body["price_cents"],
            unit=body["unit"],
            postcode=body.get("postcode"),
            source_note=body.get("source_note"),
        )
    except ValueError as e:
        return _wcle_error_response(e)
    return ok(price.to_dict(), status=201)


# ---------------------------------------------------------------------------
# Savings Dashboard
# ---------------------------------------------------------------------------

@wcle_bp.route("/savings/me", methods=["GET"])
@alpha_jwt_required()
def my_savings():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Not authenticated", status=401)
    summary = wcle_service.get_user_savings_summary(user.id)
    return ok(summary)


@wcle_bp.route("/savings/community", methods=["GET"])
@alpha_jwt_required()
def community_savings():
    microcosm_id = request.args.get("microcosm_id", type=int)
    result = wcle_service.get_community_savings(microcosm_id=microcosm_id)
    return ok(result)


# ---------------------------------------------------------------------------
# My Organizer Runs
# ---------------------------------------------------------------------------

@wcle_bp.route("/my-runs", methods=["GET"])
@alpha_jwt_required()
def my_runs():
    """Get runs organized by the current user."""
    user = get_current_user()
    if not user:
        return error("unauthorized", "Not authenticated", status=401)
    runs = WCLERun.query.filter_by(organizer_user_id=user.id).order_by(
        WCLERun.run_date.desc()
    ).all()
    return ok([r.to_dict() for r in runs])
