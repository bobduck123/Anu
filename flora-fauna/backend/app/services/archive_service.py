from __future__ import annotations

from math import ceil
from typing import Any

from sqlalchemy import func

from ..models import PublicArchiveRecord, PublicTrustReport


def _to_iso(value) -> str | None:
    return value.isoformat() if value else None


def _is_public_trust_report(report: PublicTrustReport) -> bool:
    metadata = report.metadata_json if isinstance(report.metadata_json, dict) else {}
    return bool(metadata.get("public_visibility", True))


def _resolve_related_report_map(records: list[PublicArchiveRecord]) -> dict[int, PublicTrustReport]:
    record_ids = [record.id for record in records]
    if not record_ids:
        return {}

    reports = (
        PublicTrustReport.query
        .filter(PublicTrustReport.archive_record_id.in_(record_ids))
        .order_by(PublicTrustReport.published_at.desc(), PublicTrustReport.id.desc())
        .all()
    )

    by_archive_id: dict[int, PublicTrustReport] = {}
    for report in reports:
        archive_record_id = report.archive_record_id
        if not archive_record_id:
            continue
        if archive_record_id in by_archive_id:
            continue
        if not _is_public_trust_report(report):
            continue
        by_archive_id[archive_record_id] = report

    return by_archive_id


def _derive_effective_at(record: PublicArchiveRecord, report_payload: dict[str, Any] | None) -> str | None:
    if report_payload:
        effective_at = report_payload.get("effective_at")
        if isinstance(effective_at, str) and effective_at.strip():
            return effective_at

    return _to_iso(record.updated_at)


def _derive_freshness_hint(record: PublicArchiveRecord, report_payload: dict[str, Any] | None) -> str | None:
    metadata = record.metadata_json if isinstance(record.metadata_json, dict) else {}
    record_hint = metadata.get("freshness_hint")
    if isinstance(record_hint, str) and record_hint.strip():
        return record_hint

    if report_payload:
        report_hint = report_payload.get("freshness_hint")
        if isinstance(report_hint, str) and report_hint.strip():
            return report_hint

    if record.last_verified_at:
        return f"Last verified {_to_iso(record.last_verified_at)}"

    if record.updated_at:
        return f"Last updated {_to_iso(record.updated_at)}"

    return None


def _project_archive_record(record: PublicArchiveRecord, report: PublicTrustReport | None) -> dict[str, Any]:
    report_payload = report.to_dict() if report else None
    metadata = record.metadata_json if isinstance(record.metadata_json, dict) else {}
    decision_id = str(metadata.get("decision_id") or "").strip().upper() or None
    related_decision_route = f"/archive/{record.slug}#decision-summary" if decision_id else None

    related_trust_report_slug = report_payload["slug"] if report_payload else None
    related_trust_report_route = (
        f"/transparency?report={related_trust_report_slug}" if related_trust_report_slug else None
    )

    return {
        "record_ref": record.slug,
        "slug": record.slug,
        "title": record.title,
        "record_type": record.record_type,
        "summary": record.summary,
        "provenance_label": record.provenance_summary,
        "source_label": record.provenance_summary,
        "source_route": record.source_route,
        "verification_status": record.verification_status,
        "status": record.verification_status,
        "published_at": report_payload["published_at"] if report_payload else None,
        "effective_at": _derive_effective_at(record, report_payload),
        "freshness_hint": _derive_freshness_hint(record, report_payload),
        "related_trust_report_slug": related_trust_report_slug,
        "related_trust_report_route": related_trust_report_route,
        "related_decision_id": decision_id,
        "related_decision_route": related_decision_route,
        "related_route": related_decision_route or related_trust_report_route or record.source_route,
        "record_route": f"/archive/{record.slug}",
        "is_trust_linked": bool(related_trust_report_slug),
        "is_decision_linked": bool(related_decision_route),
    }


def _list_available_record_types(node_slug: str | None = None) -> list[str]:
    query = PublicArchiveRecord.query.with_entities(PublicArchiveRecord.record_type).distinct()
    if node_slug:
        query = query.filter(PublicArchiveRecord.node_slug == node_slug)

    return sorted(
        {
            str(value)
            for (value,) in query.all()
            if isinstance(value, str) and value.strip()
        }
    )


def _build_pagination_payload(*, page: int, page_size: int, total_records: int) -> dict[str, Any]:
    total_pages = ceil(total_records / page_size) if total_records > 0 else 0
    has_previous = page > 1
    has_more = total_pages > 0 and page < total_pages

    return {
        "model": "offset",
        "page": page,
        "page_size": page_size,
        "total_records": total_records,
        "total_pages": total_pages,
        "has_more": has_more,
        "has_previous": has_previous,
        "next_page": page + 1 if has_more else None,
        "previous_page": page - 1 if has_previous else None,
        "ordering": ["updated_at:desc", "id:desc"],
    }


def _normalize_title_prefix(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _escape_like_pattern(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_public_archive_summaries(
    *,
    node_slug: str | None = None,
    record_type: str | None = None,
    title_prefix: str | None = None,
    page: int = 1,
    page_size: int = 24,
) -> dict[str, Any]:
    safe_page = max(1, page)
    safe_page_size = max(1, min(page_size, 100))
    normalized_title_prefix = _normalize_title_prefix(title_prefix)

    query = PublicArchiveRecord.query
    if node_slug:
        query = query.filter(PublicArchiveRecord.node_slug == node_slug)
    if record_type:
        query = query.filter(PublicArchiveRecord.record_type == record_type)
    if normalized_title_prefix:
        escaped_prefix = _escape_like_pattern(normalized_title_prefix.lower())
        query = query.filter(func.lower(PublicArchiveRecord.title).like(f"{escaped_prefix}%", escape="\\"))

    total_records = query.count()
    offset = (safe_page - 1) * safe_page_size

    records = (
        query
        .order_by(PublicArchiveRecord.updated_at.desc(), PublicArchiveRecord.id.desc())
        .offset(offset)
        .limit(safe_page_size)
        .all()
    )

    report_map = _resolve_related_report_map(records)
    projected = [_project_archive_record(record, report_map.get(record.id)) for record in records]

    if len(projected) == 0 and total_records == 0 and record_type and normalized_title_prefix:
        reason = "no_public_archive_records_for_record_type_and_title_prefix"
        fallback = (
            f"No public archive records are published for type '{record_type}' "
            f"with title prefix '{normalized_title_prefix}' in this scope yet."
        )
    elif len(projected) == 0 and total_records == 0 and record_type:
        reason = "no_public_archive_records_for_record_type"
        fallback = f"No public archive records are published for type '{record_type}' in this scope yet."
    elif len(projected) == 0 and total_records == 0 and normalized_title_prefix:
        reason = "no_public_archive_records_for_title_prefix"
        fallback = f"No public archive records are published for title prefix '{normalized_title_prefix}' in this scope yet."
    elif len(projected) == 0 and total_records == 0:
        reason = "no_public_archive_records"
        fallback = "No public archive records are currently published for this scope."
    elif len(projected) == 0:
        reason = "no_public_archive_records_for_page"
        fallback = "Archive records exist for this scope, but this page has no records."
    else:
        reason = None
        fallback = None

    return {
        "records": projected,
        "pagination": _build_pagination_payload(page=safe_page, page_size=safe_page_size, total_records=total_records),
        "available_record_types": _list_available_record_types(node_slug=node_slug),
        "applied_filters": {
            "record_type": record_type,
            "title_prefix": normalized_title_prefix,
            "node_slug": node_slug,
        },
        "applied_record_type_filter": record_type,
        "applied_title_prefix_filter": normalized_title_prefix,
        "degraded_honesty": {
            "is_degraded": len(projected) == 0,
            "reason": reason,
            "fallback": fallback,
        },
    }
