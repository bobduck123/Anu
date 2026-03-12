"""Calendar API — combined events + shifts, shift CRUD, availability, ICS export."""

from datetime import date
from flask import Blueprint, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity

from .utils import ok, error
from app.services import calendar_service

calendar_bp = Blueprint("calendar", __name__, url_prefix="/calendar")


@calendar_bp.route("/events", methods=["GET"])
@jwt_required()
def combined_events():
    """GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD"""
    from app.models import User
    user = User.query.filter_by(username=get_jwt_identity()).first()
    if not user:
        return error("AUTH", "User not found", 401)
    node_id = user.node_id or 1
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return error("VALIDATION", "start and end query params required", 400)
    try:
        items = calendar_service.get_combined_events(
            node_id, date.fromisoformat(start), date.fromisoformat(end)
        )
    except Exception as e:
        return error("CALENDAR", str(e), 500)
    return ok(items)


@calendar_bp.route("/shifts", methods=["GET"])
@jwt_required()
def list_shifts():
    """GET /api/calendar/shifts?start=&end="""
    from app.models import User, Shift
    user = User.query.filter_by(username=get_jwt_identity()).first()
    if not user:
        return error("AUTH", "User not found", 401)
    node_id = user.node_id or 1
    start = request.args.get("start")
    end = request.args.get("end")
    q = Shift.query.filter_by(node_id=node_id)
    if start:
        q = q.filter(Shift.date >= date.fromisoformat(start))
    if end:
        q = q.filter(Shift.date <= date.fromisoformat(end))
    shifts = q.order_by(Shift.date).all()
    return ok([s.to_dict() for s in shifts])


@calendar_bp.route("/shifts", methods=["POST"])
@jwt_required()
def create_shift():
    """POST /api/calendar/shifts — organizer creates a shift."""
    from app.models import User
    user = User.query.filter_by(username=get_jwt_identity()).first()
    if not user:
        return error("AUTH", "User not found", 401)
    data = request.get_json(silent=True) or {}
    required = ("title", "date", "start_time", "end_time")
    missing = [k for k in required if not data.get(k)]
    if missing:
        return error("VALIDATION", f"Missing fields: {', '.join(missing)}", 400)
    try:
        shift = calendar_service.create_shift(user.node_id or 1, user.id, data)
    except Exception as e:
        return error("CALENDAR", str(e), 400)
    return ok(shift.to_dict(), 201)


@calendar_bp.route("/shifts/<int:shift_id>/assign", methods=["POST"])
@jwt_required()
def assign_shift(shift_id: int):
    """POST /api/calendar/shifts/:id/assign — volunteer signs up."""
    from app.models import User
    user = User.query.filter_by(username=get_jwt_identity()).first()
    if not user:
        return error("AUTH", "User not found", 401)
    try:
        assignment = calendar_service.assign_volunteer(shift_id, user.id)
    except ValueError as e:
        return error("CALENDAR", str(e), 400)
    return ok(assignment.to_dict(), 201)


@calendar_bp.route("/availability", methods=["GET"])
@jwt_required()
def get_availability():
    """GET /api/calendar/availability"""
    from app.models import User
    user = User.query.filter_by(username=get_jwt_identity()).first()
    if not user:
        return error("AUTH", "User not found", 401)
    slots = calendar_service.get_availability(user.id)
    return ok([s.to_dict() for s in slots])


@calendar_bp.route("/availability", methods=["PUT"])
@jwt_required()
def set_availability():
    """PUT /api/calendar/availability — replace all availability slots."""
    from app.models import User
    user = User.query.filter_by(username=get_jwt_identity()).first()
    if not user:
        return error("AUTH", "User not found", 401)
    data = request.get_json(silent=True) or {}
    slots = data.get("slots", [])
    try:
        calendar_service.set_availability(user.id, slots)
    except Exception as e:
        return error("CALENDAR", str(e), 400)
    return ok({"message": "Availability updated"})


@calendar_bp.route("/export.ics", methods=["GET"])
@jwt_required()
def export_ics():
    """GET /api/calendar/export.ics?start=&end="""
    from app.models import User
    user = User.query.filter_by(username=get_jwt_identity()).first()
    if not user:
        return error("AUTH", "User not found", 401)
    node_id = user.node_id or 1
    start = request.args.get("start", "2020-01-01")
    end = request.args.get("end", "2030-12-31")
    try:
        ics = calendar_service.generate_ics(node_id, date.fromisoformat(start), date.fromisoformat(end))
    except Exception as e:
        return error("CALENDAR", str(e), 500)
    return Response(ics, mimetype="text/calendar", headers={
        "Content-Disposition": "attachment; filename=calendar.ics"
    })
