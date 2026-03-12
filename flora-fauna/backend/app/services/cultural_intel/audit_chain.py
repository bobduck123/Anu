from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

from ...extensions import db
from ...models import ControlAuditCheckpoint, ControlAuditEvent
from ...security.control_plane import compute_control_event_hash_payload
from ...time_utils import now_utc
from .worlds import sign_payload, verify_signed_payload


def _storage_root() -> Path:
    root = Path(
        os.environ.get("AUDIT_CHECKPOINT_STORAGE_ROOT")
        or "static/audit_checkpoints"
    )
    if not root.is_absolute():
        root = Path(os.getcwd()) / root
    root.mkdir(parents=True, exist_ok=True)
    return root


def _checkpoint_hash(events: list[ControlAuditEvent]) -> str:
    h = hashlib.sha256()
    for event in events:
        h.update((event.event_hash or "").encode("utf-8"))
        h.update(b"|")
    return h.hexdigest()


def export_control_audit_checkpoint(
    *,
    created_by: int | None = None,
    max_events: int = 1000,
) -> ControlAuditCheckpoint | None:
    max_events = max(1, min(5000, int(max_events)))
    last_cp = ControlAuditCheckpoint.query.order_by(ControlAuditCheckpoint.id.desc()).first()
    min_event_id = int(last_cp.to_event_id) + 1 if last_cp else 1

    events = (
        ControlAuditEvent.query.filter(ControlAuditEvent.id >= min_event_id)
        .order_by(ControlAuditEvent.id.asc())
        .limit(max_events)
        .all()
    )
    if not events:
        return None

    from_event_id = int(events[0].id)
    to_event_id = int(events[-1].id)
    checkpoint_hash = _checkpoint_hash(events)
    payload = {
        "from_event_id": from_event_id,
        "to_event_id": to_event_id,
        "event_count": len(events),
        "checkpoint_hash": checkpoint_hash,
        "generated_at": now_utc().isoformat(),
        "event_hashes": [row.event_hash for row in events],
    }
    signing = sign_payload(payload)

    storage_root = _storage_root()
    filename = f"checkpoint_{from_event_id}_{to_event_id}.json"
    file_path = storage_root / filename
    file_path.write_text(
        json.dumps(
            {
                **payload,
                "signature": signing["signature"],
                "signature_key_id": signing["signature_key_id"],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    row = ControlAuditCheckpoint(
        from_event_id=from_event_id,
        to_event_id=to_event_id,
        event_count=len(events),
        checkpoint_hash=checkpoint_hash,
        signature=signing["signature"],
        signature_key_id=signing["signature_key_id"],
        storage_uri=str(file_path),
        created_by=created_by,
    )
    db.session.add(row)
    db.session.flush()
    return row


def list_control_audit_checkpoints(limit: int = 100) -> list[ControlAuditCheckpoint]:
    return (
        ControlAuditCheckpoint.query.order_by(ControlAuditCheckpoint.id.desc())
        .limit(max(1, min(1000, int(limit))))
        .all()
    )


def verify_control_audit_chain(
    *,
    start_event_id: int | None = None,
    end_event_id: int | None = None,
    limit: int = 10000,
) -> dict[str, Any]:
    limit = max(1, min(100000, int(limit)))
    query = ControlAuditEvent.query
    if start_event_id is not None:
        query = query.filter(ControlAuditEvent.id >= int(start_event_id))
    if end_event_id is not None:
        query = query.filter(ControlAuditEvent.id <= int(end_event_id))

    rows = query.order_by(ControlAuditEvent.id.asc()).limit(limit).all()
    if not rows:
        return {
            "ok": True,
            "checked_events": 0,
            "issues": [],
            "start_event_id": None,
            "end_event_id": None,
        }

    previous = (
        ControlAuditEvent.query.filter(ControlAuditEvent.id < rows[0].id)
        .order_by(ControlAuditEvent.id.desc())
        .first()
    )
    issues: list[dict[str, Any]] = []

    for row in rows:
        expected_prev_hash = (previous.event_hash if previous else None) or "GENESIS"
        expected_chain_index = int(previous.chain_index or 0) + 1 if previous else 1
        if (row.prev_hash or "GENESIS") != expected_prev_hash:
            issues.append(
                {
                    "event_id": row.id,
                    "code": "prev_hash_mismatch",
                    "expected": expected_prev_hash,
                    "actual": row.prev_hash,
                }
            )
        if int(row.chain_index or 0) != expected_chain_index:
            issues.append(
                {
                    "event_id": row.id,
                    "code": "chain_index_mismatch",
                    "expected": expected_chain_index,
                    "actual": row.chain_index,
                }
            )
        expected_hash = compute_control_event_hash_payload(
            chain_index=int(row.chain_index or 0),
            prev_hash=(row.prev_hash or "GENESIS"),
            actor_id=row.actor_id,
            action=row.action,
            target_type=row.target_type,
            target_id=row.target_id,
            method=row.method,
            route=row.route,
            ip_address=row.ip_address,
            created_at=row.created_at,
            payload=row.payload or {},
        )
        if (row.event_hash or "") != expected_hash:
            issues.append(
                {
                    "event_id": row.id,
                    "code": "event_hash_mismatch",
                    "expected": expected_hash,
                    "actual": row.event_hash,
                }
            )
        previous = row

    return {
        "ok": len(issues) == 0,
        "checked_events": len(rows),
        "issues": issues[:200],
        "issue_count": len(issues),
        "start_event_id": rows[0].id,
        "end_event_id": rows[-1].id,
        "head_event_hash": rows[-1].event_hash,
        "head_chain_index": rows[-1].chain_index,
    }


def verify_control_audit_checkpoint(checkpoint_id: int) -> dict[str, Any]:
    row = db.session.get(ControlAuditCheckpoint, int(checkpoint_id))
    if not row:
        return {
            "ok": False,
            "code": "not_found",
            "message": "Control audit checkpoint not found",
        }

    events = (
        ControlAuditEvent.query.filter(
            ControlAuditEvent.id >= int(row.from_event_id),
            ControlAuditEvent.id <= int(row.to_event_id),
        )
        .order_by(ControlAuditEvent.id.asc())
        .all()
    )
    computed_hash = _checkpoint_hash(events)
    event_hashes = [event.event_hash for event in events]
    issues: list[str] = []
    if int(row.event_count or 0) != len(events):
        issues.append("event_count_mismatch")
    if str(row.checkpoint_hash or "") != computed_hash:
        issues.append("checkpoint_hash_mismatch")

    file_payload = None
    signature_valid = False
    if row.storage_uri:
        path = Path(str(row.storage_uri))
        if path.exists():
            try:
                loaded = json.loads(path.read_text(encoding="utf-8"))
                signature = loaded.pop("signature", None)
                signature_key_id = loaded.pop("signature_key_id", None)
                file_payload = loaded
                if file_payload.get("from_event_id") != int(row.from_event_id):
                    issues.append("storage_from_event_mismatch")
                if file_payload.get("to_event_id") != int(row.to_event_id):
                    issues.append("storage_to_event_mismatch")
                if file_payload.get("event_count") != int(row.event_count):
                    issues.append("storage_event_count_mismatch")
                if file_payload.get("checkpoint_hash") != str(row.checkpoint_hash):
                    issues.append("storage_checkpoint_hash_mismatch")
                if file_payload.get("event_hashes") != event_hashes:
                    issues.append("storage_event_hashes_mismatch")
                if signature:
                    signature_valid = verify_signed_payload(
                        file_payload,
                        signature,
                        signature_key_id=signature_key_id,
                    )
                    if not signature_valid:
                        issues.append("storage_signature_invalid")
                else:
                    issues.append("storage_signature_missing")
            except Exception:
                issues.append("storage_unreadable")
        else:
            issues.append("storage_missing")
    else:
        issues.append("storage_uri_missing")

    return {
        "ok": len(issues) == 0,
        "checkpoint_id": row.id,
        "from_event_id": row.from_event_id,
        "to_event_id": row.to_event_id,
        "event_count": row.event_count,
        "computed_event_count": len(events),
        "checkpoint_hash": row.checkpoint_hash,
        "computed_checkpoint_hash": computed_hash,
        "signature_valid": bool(signature_valid),
        "issues": issues,
    }
