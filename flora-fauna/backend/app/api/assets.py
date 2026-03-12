from flask import Blueprint, request, g

from ..security.policy import require_permission, get_current_user
from ..security.alpha import alpha_jwt_required
from datetime import datetime

from ..models import EquipmentAsset, InfrastructureAsset, EnergyOffsetRecord, CommunityAsset, AssetBooking, db
from ..services.feature_flag_service import is_enabled
from .utils import ok, error

assets_bp = Blueprint("assets", __name__, url_prefix="/assets")


# --- Equipment ---

@assets_bp.route("/equipment", methods=["GET"])
@alpha_jwt_required()
def list_equipment():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    items = EquipmentAsset.query.filter_by(node_id=user.node_id).all()
    return ok({"equipment": [{
        "id": e.id,
        "asset_type": e.asset_type,
        "name": e.name,
        "value_cents": e.value_cents,
        "depreciation_rate_pct": e.depreciation_rate_pct,
        "custodian_id": e.custodian_id,
        "insurance_coverage": e.insurance_coverage,
        "status": e.status,
    } for e in items]})


@assets_bp.route("/equipment", methods=["POST"])
@require_permission("assets:manage")
def create_equipment():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    item = EquipmentAsset(
        node_id=user.node_id,
        asset_type=payload.get("asset_type", "general"),
        name=payload.get("name", ""),
        value_cents=int(payload.get("value_cents", 0)),
        depreciation_rate_pct=float(payload.get("depreciation_rate_pct", 0)),
        custodian_id=payload.get("custodian_id"),
        insurance_coverage=payload.get("insurance_coverage"),
    )
    db.session.add(item)
    db.session.commit()
    return ok({"id": item.id}, status=201)


# --- Infrastructure ---

@assets_bp.route("/infrastructure", methods=["GET"])
@alpha_jwt_required()
def list_infrastructure():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    items = InfrastructureAsset.query.filter_by(node_id=user.node_id).all()
    return ok({"infrastructure": [{
        "id": i.id,
        "asset_type": i.asset_type,
        "name": i.name,
        "capex_cents": i.capex_cents,
        "annual_revenue_cents": i.annual_revenue_cents,
        "status": i.status,
    } for i in items]})


@assets_bp.route("/infrastructure", methods=["POST"])
@require_permission("assets:manage")
def create_infrastructure():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    item = InfrastructureAsset(
        node_id=user.node_id,
        asset_type=payload.get("asset_type", "property"),
        name=payload.get("name", ""),
        description=payload.get("description"),
        capex_cents=int(payload.get("capex_cents", 0)),
        annual_revenue_cents=int(payload.get("annual_revenue_cents", 0)),
        roi_projection_json=payload.get("roi_projection"),
    )
    db.session.add(item)
    db.session.commit()
    return ok({"id": item.id}, status=201)


# --- Energy Offset ---

@assets_bp.route("/energy", methods=["GET"])
@alpha_jwt_required()
def list_energy_records():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    records = EnergyOffsetRecord.query.filter_by(node_id=user.node_id).all()
    return ok({"energy_records": [{
        "id": r.id,
        "venue_id": r.venue_id,
        "power_usage_kwh": r.power_usage_kwh,
        "solar_generation_kwh": r.solar_generation_kwh,
        "savings_estimate_cents": r.savings_estimate_cents,
        "payback_months": r.payback_months,
    } for r in records]})


@assets_bp.route("/energy", methods=["POST"])
@require_permission("assets:manage")
def create_energy_record():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    power_kwh = float(payload.get("power_usage_kwh", 0))
    solar_kwh = float(payload.get("solar_generation_kwh", 0))

    # Simple savings estimate: $0.12/kWh offset
    savings = int((solar_kwh * 12))  # 12 cents per kWh
    # Simple payback: investment / monthly savings
    investment = int(payload.get("investment_cents", 0))
    monthly_savings = max(savings, 1)
    payback = int(investment / monthly_savings) if investment > 0 else None

    record = EnergyOffsetRecord(
        node_id=user.node_id,
        venue_id=payload.get("venue_id"),
        power_usage_kwh=power_kwh,
        solar_generation_kwh=solar_kwh,
        savings_estimate_cents=savings,
        payback_months=payback,
    )
    db.session.add(record)
    db.session.commit()
    return ok({"id": record.id, "savings_estimate_cents": savings, "payback_months": payback}, status=201)


# --- Community Asset Registry ---

@assets_bp.route("/registry", methods=["GET"])
@alpha_jwt_required()
def list_assets_registry():
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    q = CommunityAsset.query
    if g.get("node_id"):
        q = q.filter_by(node_id=g.node_id)
    items = q.order_by(CommunityAsset.created_at.desc()).all()
    return ok({"assets": [{
        "id": a.id,
        "name": a.name,
        "asset_type": a.asset_type,
        "location_text": a.location_text,
        "lat": a.lat,
        "lng": a.lng,
        "ownership_type": a.ownership_type,
        "capacity_notes": a.capacity_notes,
        "booking_rules_json": a.booking_rules_json,
        "maintenance_notes": a.maintenance_notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in items]})


@assets_bp.route("/registry", methods=["POST"])
@require_permission("assets:manage")
def create_asset_registry():
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    name = (payload.get("name") or "").strip()
    asset_type = (payload.get("asset_type") or "").strip()
    if not name or not asset_type:
        return error("validation_error", "name and asset_type required", status=400)
    asset = CommunityAsset(
        node_id=user.node_id,
        name=name[:200],
        asset_type=asset_type[:120],
        location_text=payload.get("location_text"),
        lat=payload.get("lat"),
        lng=payload.get("lng"),
        ownership_type=payload.get("ownership_type"),
        capacity_notes=payload.get("capacity_notes"),
        booking_rules_json=payload.get("booking_rules_json"),
        maintenance_notes=payload.get("maintenance_notes"),
        created_by=user.id,
    )
    db.session.add(asset)
    db.session.commit()
    return ok({"id": asset.id}, status=201)


@assets_bp.route("/registry/<int:asset_id>", methods=["GET"])
@alpha_jwt_required()
def get_asset_registry(asset_id):
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    asset = CommunityAsset.query.get(asset_id)
    if not asset or (g.get("node_id") and asset.node_id != g.node_id):
        return error("not_found", "Asset not found", status=404)
    return ok({
        "asset": {
            "id": asset.id,
            "name": asset.name,
            "asset_type": asset.asset_type,
            "location_text": asset.location_text,
            "lat": asset.lat,
            "lng": asset.lng,
            "ownership_type": asset.ownership_type,
            "capacity_notes": asset.capacity_notes,
            "booking_rules_json": asset.booking_rules_json,
            "maintenance_notes": asset.maintenance_notes,
            "created_at": asset.created_at.isoformat() if asset.created_at else None,
        }
    })


@assets_bp.route("/registry/<int:asset_id>", methods=["PATCH"])
@require_permission("assets:manage")
def update_asset_registry(asset_id):
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    asset = CommunityAsset.query.get(asset_id)
    if not asset or (g.get("node_id") and asset.node_id != g.node_id):
        return error("not_found", "Asset not found", status=404)
    payload = request.get_json() or {}
    for key in ["name", "asset_type", "location_text", "lat", "lng", "ownership_type", "capacity_notes", "booking_rules_json", "maintenance_notes"]:
        if key in payload:
            setattr(asset, key, payload.get(key))
    db.session.commit()
    return ok({"id": asset.id})


@assets_bp.route("/registry/<int:asset_id>", methods=["DELETE"])
@require_permission("assets:manage")
def delete_asset_registry(asset_id):
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    asset = CommunityAsset.query.get(asset_id)
    if not asset or (g.get("node_id") and asset.node_id != g.node_id):
        return error("not_found", "Asset not found", status=404)
    db.session.delete(asset)
    db.session.commit()
    return ok({"deleted": True})


@assets_bp.route("/registry/<int:asset_id>/bookings", methods=["POST"])
@alpha_jwt_required()
def create_asset_booking(asset_id):
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    asset = CommunityAsset.query.get(asset_id)
    if not asset or (g.get("node_id") and asset.node_id != g.node_id):
        return error("not_found", "Asset not found", status=404)
    payload = request.get_json() or {}
    start_raw = payload.get("start_at")
    end_raw = payload.get("end_at")
    try:
        start_at = datetime.fromisoformat(start_raw)
        end_at = datetime.fromisoformat(end_raw)
    except Exception:
        return error("validation_error", "start_at and end_at must be ISO format", status=400)
    booking = AssetBooking(
        asset_id=asset_id,
        user_id=user.id,
        microcosm_id=payload.get("microcosm_id"),
        start_at=start_at,
        end_at=end_at,
        status="requested",
    )
    db.session.add(booking)
    db.session.commit()
    return ok({"id": booking.id, "status": booking.status}, status=201)


@assets_bp.route("/bookings/<int:booking_id>/approve", methods=["POST"])
@require_permission("assets:manage")
def approve_asset_booking(booking_id):
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    booking = AssetBooking.query.get(booking_id)
    if not booking:
        return error("not_found", "Booking not found", status=404)
    asset = CommunityAsset.query.get(booking.asset_id)
    if asset and g.get("node_id") and asset.node_id != g.node_id:
        return error("not_found", "Booking not found", status=404)
    booking.status = "approved"
    db.session.commit()
    return ok({"id": booking.id, "status": booking.status})


@assets_bp.route("/bookings/<int:booking_id>/cancel", methods=["POST"])
@alpha_jwt_required()
def cancel_asset_booking(booking_id):
    if not is_enabled("ASSETS_ENABLED"):
        return error("disabled", "Assets registry disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    booking = AssetBooking.query.get(booking_id)
    if not booking:
        return error("not_found", "Booking not found", status=404)
    asset = CommunityAsset.query.get(booking.asset_id)
    if asset and g.get("node_id") and asset.node_id != g.node_id:
        return error("not_found", "Booking not found", status=404)
    if booking.user_id != user.id and user.role not in ["node_admin", "platform_admin"]:
        return error("forbidden", "Insufficient permission", status=403)
    booking.status = "cancelled"
    db.session.commit()
    return ok({"id": booking.id, "status": booking.status})
