from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import PublicArchiveRecord, PublicTrustReport


def _resolve_archive_record(report: PublicTrustReport) -> PublicArchiveRecord | None:
    if not report.archive_record_id:
        return None
    return db.session.get(PublicArchiveRecord, report.archive_record_id)


def _build_report_projection(report: PublicTrustReport, archive_record: PublicArchiveRecord | None) -> dict[str, Any]:
    report_dict = report.to_dict()
    return {
        "id": report_dict["id"],
        "slug": report_dict["slug"],
        "title": report_dict["title"],
        "summary": report_dict["summary"],
        "body": report_dict["body"],
        "sections": report_dict["sections"],
        "report_type": report_dict["report_type"],
        "status": report_dict["status"],
        "node_slug": report_dict["node_slug"],
        "jurisdiction": report_dict["jurisdiction"],
        "published_at": report_dict["published_at"],
        "effective_at": report_dict["effective_at"],
        "source_notes": report_dict["source_notes"],
        "provenance_summary": report_dict["provenance_summary"],
        "freshness_hint": report_dict["freshness_hint"],
        "public_visibility": bool(report_dict["public_visibility"]),
        "archive_record_id": report_dict["archive_record_id"],
        "record_route": f"/archive/{archive_record.slug}" if archive_record else None,
        "sponsor_disclosure_ref": report_dict["sponsor_disclosure_ref"],
    }


def _resolve_report(report_ref: str) -> PublicTrustReport | None:
    report = PublicTrustReport.query.filter_by(slug=report_ref).first()
    if report is not None:
        return report

    try:
        report_id = int(report_ref)
    except (TypeError, ValueError):
        return None

    return db.session.get(PublicTrustReport, report_id)


def _is_publicly_visible(report: PublicTrustReport) -> bool:
    metadata = report.metadata_json if isinstance(report.metadata_json, dict) else {}
    return bool(metadata.get("public_visibility", True))


def list_public_trust_reports(node_slug: str | None = None, limit: int = 30):
    limit = max(1, min(limit, 100))
    query = PublicTrustReport.query
    if node_slug:
        query = query.filter_by(node_slug=node_slug)

    reports = (
        query.order_by(PublicTrustReport.published_at.desc(), PublicTrustReport.id.desc())
        .limit(limit)
        .all()
    )

    visible_reports = [report for report in reports if _is_publicly_visible(report)]

    archive_records_by_id: dict[int, PublicArchiveRecord] = {}
    archive_record_ids = [report.archive_record_id for report in visible_reports if report.archive_record_id]
    if archive_record_ids:
        for record in PublicArchiveRecord.query.filter(PublicArchiveRecord.id.in_(archive_record_ids)).all():
            archive_records_by_id[record.id] = record

    report_summaries = [
        _build_report_projection(report, archive_records_by_id.get(report.archive_record_id))
        for report in visible_reports
    ]
    for report in report_summaries:
        report.pop("body", None)
        report.pop("sections", None)
        report.pop("provenance_summary", None)
        report.pop("archive_record_id", None)
        report.pop("sponsor_disclosure_ref", None)

    return {
        "reports": report_summaries,
        "degraded_honesty": {
            "is_degraded": len(report_summaries) == 0,
            "reason": "no_public_trust_reports" if len(report_summaries) == 0 else None,
            "fallback": "Trust reporting is available but no public report is published for this scope yet."
            if len(report_summaries) == 0
            else None,
        },
    }


def get_public_trust_report_detail(report_ref: str):
    report = _resolve_report(report_ref)
    if report is None:
        return None

    if not _is_publicly_visible(report):
        return None

    archive_record = _resolve_archive_record(report)
    report_projection = _build_report_projection(report, archive_record)
    return {
        "report": report_projection,
        "archive_record": archive_record.to_dict() if archive_record else None,
        "degraded_honesty": {
            "is_degraded": False,
            "reason": None,
            "fallback": None,
        },
    }
