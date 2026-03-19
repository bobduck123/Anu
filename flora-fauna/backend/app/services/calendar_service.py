"""Calendar service — shifts, availability, combined event views."""

from datetime import date, time, datetime

from ..extensions import db
from ..models import Shift, ShiftAssignment, Availability, RecurringEvent, Event


def get_combined_events(node_id: int, start: date, end: date):
    """Return combined list of events + shifts within a date range."""
    events = Event.query.filter(
        Event.node_id == node_id,
        Event.date >= start.isoformat(),
        Event.date <= end.isoformat(),
    ).all()
    shifts = Shift.query.filter(
        Shift.node_id == node_id,
        Shift.date >= start,
        Shift.date <= end,
    ).all()

    items = []
    for e in events:
        d = e.to_dict()
        d["_type"] = "event"
        items.append(d)
    for s in shifts:
        d = s.to_dict()
        d["_type"] = "shift"
        items.append(d)
    items.sort(key=lambda x: x.get("date", ""))
    return items


def create_shift(node_id: int, created_by: int, data: dict) -> Shift:
    shift = Shift(
        node_id=node_id,
        title=data["title"],
        description=data.get("description"),
        date=date.fromisoformat(data["date"]),
        start_time=time.fromisoformat(data["start_time"]),
        end_time=time.fromisoformat(data["end_time"]),
        location=data.get("location"),
        max_volunteers=data.get("max_volunteers", 10),
        created_by=created_by,
    )
    db.session.add(shift)
    db.session.commit()
    return shift


def get_shift(shift_id: int) -> Shift | None:
    return Shift.query.get(shift_id)


def assign_volunteer(shift_id: int, user_id: int) -> ShiftAssignment:
    shift = Shift.query.get(shift_id)
    if not shift:
        raise ValueError("Shift not found")
    existing = ShiftAssignment.query.filter_by(shift_id=shift_id, user_id=user_id).first()
    if existing:
        raise ValueError("Already assigned")
    count = ShiftAssignment.query.filter_by(shift_id=shift_id).filter(
        ShiftAssignment.status.in_(("pending", "confirmed"))
    ).count()
    if count >= shift.max_volunteers:
        raise ValueError("Shift is full")
    assignment = ShiftAssignment(shift_id=shift_id, user_id=user_id, status="pending")
    db.session.add(assignment)
    db.session.commit()
    return assignment


def get_availability(user_id: int):
    return Availability.query.filter_by(user_id=user_id).all()


def set_availability(user_id: int, slots: list[dict]):
    Availability.query.filter_by(user_id=user_id).delete()
    for slot in slots:
        a = Availability(
            user_id=user_id,
            day_of_week=slot["day_of_week"],
            start_time=time.fromisoformat(slot["start_time"]),
            end_time=time.fromisoformat(slot["end_time"]),
        )
        db.session.add(a)
    db.session.commit()


def generate_ics(node_id: int, start: date, end: date) -> str:
    """Generate ICS calendar export."""
    items = get_combined_events(node_id, start, end)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Manara//Calendar//EN",
    ]
    for item in items:
        lines.append("BEGIN:VEVENT")
        d = item.get("date", "")
        st = item.get("start_time") or item.get("time", "00:00:00")
        lines.append(f"DTSTART:{d.replace('-', '')}T{st.replace(':', '')}".rstrip("T"))
        lines.append(f"SUMMARY:{item.get('title', 'Untitled')}")
        if item.get("location"):
            lines.append(f"LOCATION:{item['location']}")
        if item.get("description"):
            desc = item["description"][:200].replace("\n", "\\n")
            lines.append(f"DESCRIPTION:{desc}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
