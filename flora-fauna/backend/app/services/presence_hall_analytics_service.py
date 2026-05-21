from __future__ import annotations

from typing import Any

from sqlalchemy import func

from ..extensions import db
from ..models import GardenSeed, HallActivityEvent, HallParticipant, HallPortal, HallStall, Observation, Path, PathTrace, PresenceHall, SharedSpace


def hall_entries(hall: PresenceHall) -> int:
    return HallParticipant.query.filter_by(hall_id=hall.id).count()


def participant_counts(hall: PresenceHall) -> dict[str, int]:
    rows = db.session.query(HallParticipant.status, func.count(HallParticipant.id)).filter_by(hall_id=hall.id).group_by(HallParticipant.status).all()
    return {status: int(count) for status, count in rows}


def observation_counts(hall: PresenceHall) -> dict[str, int]:
    rows = db.session.query(Observation.status, func.count(Observation.id)).filter_by(hall_id=hall.id).group_by(Observation.status).all()
    return {status: int(count) for status, count in rows}


def room_stall_clicks(hall: PresenceHall) -> list[dict[str, Any]]:
    counts = _event_counts(hall, "stall_visit", HallActivityEvent.stall_id)
    rows = HallStall.query.filter_by(hall_id=hall.id).all()
    return [
        {
            "stall_id": row.id,
            "room_id": row.room_id,
            "clicks": int(counts.get(row.id, 0)),
            "visits": int(counts.get(row.id, 0)),
            "status": row.status,
        }
        for row in rows
    ]


def portal_clicks(hall: PresenceHall) -> list[dict[str, Any]]:
    counts = _event_counts(hall, "portal_click", HallActivityEvent.portal_id)
    rows = HallPortal.query.filter_by(hall_id=hall.id).all()
    return [
        {
            "portal_id": row.id,
            "target_type": row.target_type,
            "target_id": row.target_id,
            "clicks": int(counts.get(row.id, 0)),
            "status": row.status,
        }
        for row in rows
    ]


def seeds_created(hall: PresenceHall) -> int:
    shared_space_ids = [str(row.id) for row in SharedSpace.query.filter_by(hall_id=hall.id).all()]
    if not shared_space_ids:
        return 0
    return GardenSeed.query.filter(GardenSeed.source_ref_id.in_(shared_space_ids), GardenSeed.source_type.in_(["same_hall", "same_table"])).count()


def path_activity_from_hall(hall: PresenceHall) -> dict[str, int]:
    path_ids = [row.id for row in Path.query.filter_by(trailhead_type="hall", trailhead_id=hall.id).all()]
    if not path_ids:
        return {"paths_count": 0, "traces_count": 0}
    traces = PathTrace.query.filter(PathTrace.path_id.in_(path_ids)).count()
    return {"paths_count": len(path_ids), "traces_count": int(traces)}


def activity_event_count(hall: PresenceHall, event_type: str) -> int:
    return HallActivityEvent.query.filter_by(hall_id=hall.id, event_type=event_type).count()


def most_visited_stall(hall: PresenceHall) -> dict[str, Any] | None:
    row = (
        db.session.query(HallActivityEvent.stall_id, func.count(HallActivityEvent.id).label("visits"))
        .filter(
            HallActivityEvent.hall_id == hall.id,
            HallActivityEvent.event_type == "stall_visit",
            HallActivityEvent.stall_id.isnot(None),
        )
        .group_by(HallActivityEvent.stall_id)
        .order_by(func.count(HallActivityEvent.id).desc())
        .first()
    )
    if not row:
        return None
    stall = HallStall.query.get(row.stall_id)
    return _stall_summary(stall, int(row.visits)) if stall else {"stall_id": row.stall_id, "visits": int(row.visits)}


def most_used_portal(hall: PresenceHall) -> dict[str, Any] | None:
    row = (
        db.session.query(HallActivityEvent.portal_id, func.count(HallActivityEvent.id).label("clicks"))
        .filter(
            HallActivityEvent.hall_id == hall.id,
            HallActivityEvent.event_type == "portal_click",
            HallActivityEvent.portal_id.isnot(None),
        )
        .group_by(HallActivityEvent.portal_id)
        .order_by(func.count(HallActivityEvent.id).desc())
        .first()
    )
    if not row:
        return None
    portal = HallPortal.query.get(row.portal_id)
    if not portal:
        return {"portal_id": row.portal_id, "clicks": int(row.clicks)}
    return {
        "portal_id": portal.id,
        "label": portal.label,
        "target_type": portal.target_type,
        "target_id": portal.target_id,
        "clicks": int(row.clicks),
    }


def source_breakdown(hall: PresenceHall) -> list[dict[str, Any]]:
    rows = (
        db.session.query(HallActivityEvent.source, func.count(HallActivityEvent.id))
        .filter(HallActivityEvent.hall_id == hall.id)
        .group_by(HallActivityEvent.source)
        .order_by(func.count(HallActivityEvent.id).desc())
        .all()
    )
    return [{"source": source or "unknown", "count": int(count)} for source, count in rows]


def top_stalls(hall: PresenceHall, *, limit: int = 5) -> list[dict[str, Any]]:
    rows = (
        db.session.query(HallActivityEvent.stall_id, func.count(HallActivityEvent.id).label("visits"))
        .filter(
            HallActivityEvent.hall_id == hall.id,
            HallActivityEvent.event_type == "stall_visit",
            HallActivityEvent.stall_id.isnot(None),
        )
        .group_by(HallActivityEvent.stall_id)
        .order_by(func.count(HallActivityEvent.id).desc())
        .limit(limit)
        .all()
    )
    result = []
    for stall_id, visits in rows:
        stall = HallStall.query.get(stall_id)
        if stall:
            result.append(_stall_summary(stall, int(visits)))
    return result


def owner_hall_dashboard(hall: PresenceHall) -> dict[str, Any]:
    participant_statuses = participant_counts(hall)
    observation_statuses = observation_counts(hall)
    path_activity = path_activity_from_hall(hall)
    participants_joined = hall_entries(hall)
    guests = HallParticipant.query.filter_by(hall_id=hall.id).filter(HallParticipant.guest_token.isnot(None)).count()
    observers = HallParticipant.query.filter_by(hall_id=hall.id).filter(HallParticipant.observer_id.isnot(None)).count()
    portal_click_total = activity_event_count(hall, "portal_click")
    stall_visit_total = activity_event_count(hall, "stall_visit")
    seed_count = seeds_created(hall)
    return {
        "hall_id": hall.id,
        "slug": hall.slug,
        "participants_joined": participants_joined,
        "guests": int(guests),
        "observers": int(observers),
        "observations_posted": int(sum(observation_statuses.values())),
        "observations_shared": int(observation_statuses.get("active", 0)),
        "rooms_entered": activity_event_count(hall, "room_enter") + stall_visit_total,
        "stall_visits": stall_visit_total,
        "portal_clicks": portal_click_total,
        "seeds_created": seed_count,
        "paths_generated": int(path_activity["paths_count"]),
        "paths_opened": activity_event_count(hall, "path_open"),
        "people_gathered": participants_joined,
        "most_visited_stall": most_visited_stall(hall),
        "most_used_portal": most_used_portal(hall),
        "source_breakdown": source_breakdown(hall),
        "top_stalls": top_stalls(hall),
        "entries_count": participants_joined,
        "participant_counts": participant_statuses,
        "observation_counts": observation_statuses,
        "room_stall_clicks": room_stall_clicks(hall),
        "portal_click_breakdown": portal_clicks(hall),
        "seeds_created_count": seed_count,
        "path_activity": path_activity,
    }


def _event_counts(hall: PresenceHall, event_type: str, column) -> dict[int, int]:
    rows = (
        db.session.query(column, func.count(HallActivityEvent.id))
        .filter(HallActivityEvent.hall_id == hall.id, HallActivityEvent.event_type == event_type, column.isnot(None))
        .group_by(column)
        .all()
    )
    return {int(key): int(count) for key, count in rows if key is not None}


def _stall_summary(stall: HallStall, visits: int) -> dict[str, Any]:
    room = stall.room
    return {
        "stall_id": stall.id,
        "room_id": stall.room_id,
        "room_slug": getattr(room, "slug", None),
        "room_display_name": getattr(room, "display_name", None),
        "visits": visits,
    }
