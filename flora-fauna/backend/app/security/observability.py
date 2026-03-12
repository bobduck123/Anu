from __future__ import annotations

from prometheus_client import Counter, Histogram


control_plane_auth_failures_total = Counter(
    "control_plane_auth_failures_total",
    "Number of control-plane auth failures by reason",
    ["reason"],
)

connector_pull_jobs_total = Counter(
    "connector_pull_jobs_total",
    "Number of connector pull jobs by outcome",
    ["status"],
)

connector_pull_job_duration_seconds = Histogram(
    "connector_pull_job_duration_seconds",
    "Connector pull job execution duration",
    buckets=(0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60),
)

world_snapshot_verify_failures_total = Counter(
    "world_snapshot_verify_failures_total",
    "World snapshot signature verification failures",
)


def observe_control_auth_failure(reason: str) -> None:
    control_plane_auth_failures_total.labels(reason=reason or "unknown").inc()


def observe_connector_pull_job(status: str, duration_seconds: float | None = None) -> None:
    connector_pull_jobs_total.labels(status=status or "unknown").inc()
    if duration_seconds is not None:
        connector_pull_job_duration_seconds.observe(max(0.0, float(duration_seconds)))


def observe_world_verify_result(verified: bool) -> None:
    if not bool(verified):
        world_snapshot_verify_failures_total.inc()

