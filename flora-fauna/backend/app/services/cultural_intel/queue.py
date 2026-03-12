from __future__ import annotations

import random
import time
from datetime import timedelta
from typing import Any

from flask import current_app, has_app_context
from sqlalchemy import and_, or_

from ...extensions import db
from ...time_utils import now_utc
from ...models import ConnectorPullJob
from ...security.observability import observe_connector_pull_job
from .engine import pull_connector


ACTIVE_JOB_STATUSES = ("queued", "retry", "running")


def _cfg_int(name: str, default: int, minimum: int = 1, maximum: int = 86_400) -> int:
    raw = default
    if has_app_context():
        raw = current_app.config.get(name, default)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = int(default)
    return max(minimum, min(maximum, value))


def _lease_seconds() -> int:
    return _cfg_int("CONNECTOR_PULL_JOB_LEASE_SECONDS", 180, minimum=5, maximum=3600)


def _stale_seconds() -> int:
    return _cfg_int("CONNECTOR_PULL_JOB_STALE_SECONDS", 900, minimum=30, maximum=86_400)


def _retry_delay_seconds(attempts: int) -> int:
    # Exponential backoff plus bounded jitter for load-smoothing.
    base = min(300, 2 ** max(1, int(attempts)))
    jitter = min(30, int(base * 0.25))
    return int(base + random.randint(0, max(0, jitter)))


def _active_job_by_request_key(connector_id: int, request_key: str) -> ConnectorPullJob | None:
    return (
        ConnectorPullJob.query.filter(
            ConnectorPullJob.connector_id == int(connector_id),
            ConnectorPullJob.request_key == str(request_key),
            ConnectorPullJob.status.in_(ACTIVE_JOB_STATUSES),
        )
        .order_by(ConnectorPullJob.id.desc())
        .first()
    )


def enqueue_connector_pull_job(
    connector_id: int,
    requested_by: int | None = None,
    payload: dict[str, Any] | None = None,
    max_attempts: int = 5,
) -> tuple[ConnectorPullJob, bool]:
    body = payload or {}
    request_key = str(body.get("request_key") or "").strip()[:160] if isinstance(body, dict) else ""
    if request_key:
        existing = _active_job_by_request_key(connector_id, request_key)
        if existing:
            return existing, True

    job = ConnectorPullJob(
        connector_id=connector_id,
        requested_by=requested_by,
        status="queued",
        attempts=0,
        max_attempts=max(1, int(max_attempts)),
        payload_json=body,
        request_key=request_key or None,
        not_before=now_utc(),
    )
    db.session.add(job)
    db.session.flush()
    return job, False


def get_connector_pull_job(job_id: int) -> ConnectorPullJob | None:
    return db.session.get(ConnectorPullJob, job_id)


def list_connector_pull_jobs(
    limit: int = 50,
    status: str | None = None,
    connector_id: int | None = None,
) -> list[ConnectorPullJob]:
    query = ConnectorPullJob.query
    if status:
        query = query.filter_by(status=status)
    if connector_id:
        query = query.filter_by(connector_id=connector_id)
    return query.order_by(ConnectorPullJob.id.desc()).limit(max(1, min(500, int(limit)))).all()


def recover_stale_connector_pull_jobs(
    *,
    stale_after_seconds: int | None = None,
    limit: int = 100,
) -> dict[str, int]:
    now = now_utc()
    stale_seconds = stale_after_seconds if stale_after_seconds is not None else _stale_seconds()
    stale_seconds = max(30, int(stale_seconds))
    stale_cutoff = now - timedelta(seconds=stale_seconds)
    rows = (
        ConnectorPullJob.query.filter(
            ConnectorPullJob.status == "running",
            or_(
                ConnectorPullJob.lease_expires_at <= now,
                and_(
                    ConnectorPullJob.lease_expires_at.is_(None),
                    ConnectorPullJob.started_at <= stale_cutoff,
                ),
            ),
        )
        .order_by(ConnectorPullJob.started_at.asc(), ConnectorPullJob.id.asc())
        .limit(max(1, min(1000, int(limit))))
        .all()
    )
    retried = 0
    dead_lettered = 0
    for row in rows:
        row.worker_id = None
        row.lease_expires_at = None
        if int(row.attempts or 0) >= int(row.max_attempts or 1):
            row.status = "dead_letter"
            row.completed_at = now
            row.dead_letter_reason = "Recovered stale running job: max attempts exceeded"
            dead_lettered += 1
        else:
            row.status = "retry"
            row.not_before = now
            row.last_error = "Recovered stale running job after lease timeout"
            retried += 1
    if rows:
        db.session.flush()
    return {
        "recovered": len(rows),
        "retried": retried,
        "dead_lettered": dead_lettered,
    }


def claim_next_connector_pull_job(worker_id: str) -> ConnectorPullJob | None:
    now = now_utc()
    recover_stale_connector_pull_jobs(limit=100)

    running_connectors = (
        ConnectorPullJob.query.filter(
            ConnectorPullJob.status == "running",
            or_(
                ConnectorPullJob.lease_expires_at.is_(None),
                ConnectorPullJob.lease_expires_at > now,
            ),
        )
        .with_entities(ConnectorPullJob.connector_id)
        .distinct()
        .all()
    )
    busy_connector_ids = [row[0] for row in running_connectors if row and row[0]]

    query = ConnectorPullJob.query.filter(
        ConnectorPullJob.status.in_(["queued", "retry"]),
        or_(ConnectorPullJob.not_before.is_(None), ConnectorPullJob.not_before <= now),
    )
    if busy_connector_ids:
        query = query.filter(~ConnectorPullJob.connector_id.in_(busy_connector_ids))
    candidate = query.order_by(ConnectorPullJob.created_at.asc(), ConnectorPullJob.id.asc()).first()
    if not candidate:
        return None

    updated = (
        ConnectorPullJob.query.filter(
            ConnectorPullJob.id == candidate.id,
            ConnectorPullJob.status.in_(["queued", "retry"]),
        )
        .update(
            {
                "status": "running",
                "worker_id": worker_id,
                "started_at": now,
                "lease_expires_at": now + timedelta(seconds=_lease_seconds()),
                "updated_at": now,
                "attempts": int(candidate.attempts or 0) + 1,
            },
            synchronize_session=False,
        )
    )
    db.session.flush()
    if updated != 1:
        return None
    return db.session.get(ConnectorPullJob, candidate.id)


def process_connector_pull_job(job_id: int, worker_id: str) -> dict[str, Any]:
    job = db.session.get(ConnectorPullJob, job_id)
    if not job:
        raise ValueError("Connector pull job not found")

    if job.status != "running":
        job.status = "running"
        job.worker_id = worker_id
        job.started_at = job.started_at or now_utc()
        job.lease_expires_at = now_utc() + timedelta(seconds=_lease_seconds())
        job.attempts = max(1, int(job.attempts or 0))

    started_timer = time.perf_counter()
    try:
        result = pull_connector(job.connector_id)
        job.status = "succeeded"
        job.completed_at = now_utc()
        job.lease_expires_at = None
        job.last_error = None
        job.dead_letter_reason = None
        job.payload_json = {
            **(job.payload_json or {}),
            "result": result,
        }
        db.session.flush()
        observe_connector_pull_job(
            status="succeeded",
            duration_seconds=time.perf_counter() - started_timer,
        )
        return {
            "job_id": job.id,
            "status": job.status,
            "attempts": job.attempts,
            "result": result,
        }
    except Exception as exc:
        error_message = str(exc)
        if int(job.attempts or 0) >= int(job.max_attempts or 1):
            job.status = "dead_letter"
            job.completed_at = now_utc()
            job.lease_expires_at = None
            job.dead_letter_reason = error_message[:500]
        else:
            job.status = "retry"
            delay_seconds = _retry_delay_seconds(int(job.attempts or 1))
            job.not_before = now_utc() + timedelta(seconds=delay_seconds)
            job.lease_expires_at = None
            job.last_error = error_message[:500]
        observe_connector_pull_job(
            status=job.status,
            duration_seconds=time.perf_counter() - started_timer,
        )
        db.session.flush()
        raise


def heartbeat_connector_pull_job(
    *,
    job_id: int,
    worker_id: str,
    lease_seconds: int | None = None,
) -> ConnectorPullJob | None:
    row = db.session.get(ConnectorPullJob, int(job_id))
    if not row:
        return None
    if row.status != "running":
        return None
    if worker_id and row.worker_id and row.worker_id != worker_id:
        return None
    seconds = max(5, int(lease_seconds or _lease_seconds()))
    row.lease_expires_at = now_utc() + timedelta(seconds=seconds)
    db.session.flush()
    return row


def connector_pull_queue_stats() -> dict[str, Any]:
    status_rows = (
        ConnectorPullJob.query.with_entities(
            ConnectorPullJob.status,
            db.func.count(ConnectorPullJob.id),
        )
        .group_by(ConnectorPullJob.status)
        .all()
    )
    by_status = {str(status): int(count) for status, count in status_rows}
    total = int(sum(by_status.values()))
    running = int(by_status.get("running", 0))
    queued = int(by_status.get("queued", 0))
    retry = int(by_status.get("retry", 0))
    dead_letter = int(by_status.get("dead_letter", 0))
    return {
        "total": total,
        "running": running,
        "queued": queued,
        "retry": retry,
        "dead_letter": dead_letter,
        "by_status": by_status,
    }


def process_available_connector_jobs(worker_id: str, max_jobs: int = 20) -> dict[str, Any]:
    recovered = recover_stale_connector_pull_jobs(limit=100)
    processed = 0
    succeeded = 0
    dead_lettered = 0
    retried = 0
    failures: list[dict[str, Any]] = []

    while processed < max(1, int(max_jobs)):
        job = claim_next_connector_pull_job(worker_id=worker_id)
        if not job:
            break
        processed += 1
        try:
            process_connector_pull_job(job.id, worker_id=worker_id)
            db.session.commit()
            succeeded += 1
        except Exception as exc:
            db.session.commit()
            refreshed = db.session.get(ConnectorPullJob, job.id)
            if refreshed and refreshed.status == "dead_letter":
                dead_lettered += 1
            else:
                retried += 1
            failures.append({"job_id": job.id, "error": str(exc)})

    return {
        "worker_id": worker_id,
        "recovered": recovered,
        "processed": processed,
        "succeeded": succeeded,
        "retried": retried,
        "dead_lettered": dead_lettered,
        "failures": failures,
    }
