from __future__ import annotations

from pathlib import Path
from typing import Any

from flask import current_app

from ..models import PublicArchiveRecord

DEFAULT_DECISION_REGISTER_FILENAME = "DECISION_REGISTER_2026-04-07.md"


def _decision_register_path() -> Path:
    configured = current_app.config.get("DECISION_REGISTER_PATH")
    if configured:
        return Path(str(configured))

    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / "docs" / "program" / DEFAULT_DECISION_REGISTER_FILENAME
        if candidate.exists():
            return candidate

    return current.parents[4] / "docs" / "program" / DEFAULT_DECISION_REGISTER_FILENAME


def _normalize_decision_id(value: str | None) -> str:
    return str(value or "").strip().upper()


def _parse_register_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []

    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    table_started = False
    rows: list[dict[str, str]] = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if table_started:
                break
            continue

        if not table_started and line.startswith("| ID |"):
            table_started = True
            continue

        if not table_started:
            continue

        if not line.startswith("|"):
            break

        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) < 9:
            continue
        if all(set(cell) <= {"-", ":", " "} for cell in cells):
            continue

        rows.append(
            {
                "decision_id": _normalize_decision_id(cells[0]),
                "title": cells[1],
                "decision_statement": cells[2],
                "why_it_matters": cells[3],
                "default_assumption": cells[4],
                "owner": cells[5],
                "due_date": cells[6],
                "blocking_impact": cells[7],
                "current_status": cells[8],
            }
        )

    return [row for row in rows if row["decision_id"]]


def _published_archive_rows(node_slug: str | None = None) -> list[PublicArchiveRecord]:
    query = PublicArchiveRecord.query.filter(
        PublicArchiveRecord.record_type == "governance-decision-summary",
        PublicArchiveRecord.visibility_class == "public",
    )
    if node_slug:
        query = query.filter(PublicArchiveRecord.node_slug == node_slug)
    return query.order_by(PublicArchiveRecord.updated_at.desc(), PublicArchiveRecord.id.desc()).all()


def _decision_archive_map(node_slug: str | None = None) -> dict[str, PublicArchiveRecord]:
    mapping: dict[str, PublicArchiveRecord] = {}
    for record in _published_archive_rows(node_slug=node_slug):
        metadata = record.metadata_json if isinstance(record.metadata_json, dict) else {}
        decision_id = _normalize_decision_id(metadata.get("decision_id"))
        if not decision_id:
            continue
        if decision_id in mapping:
            continue
        mapping[decision_id] = record
    return mapping


def _project_public_decision(row: dict[str, str], archive_record: PublicArchiveRecord) -> dict[str, Any]:
    return {
        "decision_id": row["decision_id"],
        "title": row["title"],
        "decision_statement": row["decision_statement"],
        "why_it_matters": row["why_it_matters"],
        "owner": row["owner"],
        "due_date": row["due_date"] or None,
        "current_status": row["current_status"],
        "record_route": f"/archive/{archive_record.slug}",
        "archive_record_slug": archive_record.slug,
        "publication_scope": "public_summary",
        "source_label": "Decision register (public-safe projection)",
        "summary": row["decision_statement"],
    }


def list_public_decision_summaries(*, node_slug: str | None = None, limit: int = 30) -> dict[str, Any]:
    safe_limit = max(1, min(limit, 100))
    rows = _parse_register_rows(_decision_register_path())
    archive_map = _decision_archive_map(node_slug=node_slug)

    decisions: list[dict[str, Any]] = []
    for row in rows:
        archive_record = archive_map.get(row["decision_id"])
        if not archive_record:
            continue
        decisions.append(_project_public_decision(row, archive_record))
        if len(decisions) >= safe_limit:
            break

    return {
        "decisions": decisions,
        "degraded_honesty": {
            "is_degraded": len(decisions) == 0,
            "reason": "no_public_decision_summaries" if len(decisions) == 0 else None,
            "fallback": (
                "No decisions are currently published as public-safe summaries; restricted decisions remain docs-only."
                if len(decisions) == 0
                else None
            ),
        },
    }


def get_public_decision_summary(decision_ref: str, *, node_slug: str | None = None) -> dict[str, Any] | None:
    ref = str(decision_ref or "").strip()
    if not ref:
        return None

    rows = _parse_register_rows(_decision_register_path())
    rows_by_id = {row["decision_id"]: row for row in rows}
    archive_map = _decision_archive_map(node_slug=node_slug)

    normalized_ref = _normalize_decision_id(ref)
    archive_row = archive_map.get(normalized_ref)
    if archive_row:
        return _project_public_decision(rows_by_id[normalized_ref], archive_row)

    for decision_id, archive_record in archive_map.items():
        if archive_record.slug == ref:
            row = rows_by_id.get(decision_id)
            if not row:
                return None
            return _project_public_decision(row, archive_record)

    return None
