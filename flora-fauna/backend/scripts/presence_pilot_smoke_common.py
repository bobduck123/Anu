from __future__ import annotations

import ast
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import timedelta
from pathlib import Path
from typing import Any

from sqlalchemy.engine import make_url


@dataclass
class Step:
    name: str
    status: str
    route: str
    reason: str
    http_status: int | None = None
    latency_ms: int | None = None
    response_shape_matched: bool | None = None
    data: dict[str, Any] = field(default_factory=dict)


def load_env_file(path: Path | None) -> None:
    if not path or not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        key, raw_value = line.split("=", 1)
        value = raw_value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            try:
                value = ast.literal_eval(value)
            except (SyntaxError, ValueError):
                value = value[1:-1]
        os.environ[key.strip()] = str(value)


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name, default)
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def issue_hosted_subject_owner_token(email: str, backend_env_file: Path) -> str:
    """Issue a short-lived server-side smoke token for a bound hosted app user.

    Pilot ownership can move after fixture setup. This keeps hosted owner
    smokes on the current app-user/Supabase-subject binding without writing a
    token into evidence or weakening route authorization.
    """
    load_env_file(backend_env_file)
    raw = next(
        (
            os.environ.get(name)
            for name in ("PRESENCE_PILOT_GGM_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL")
            if os.environ.get(name)
        ),
        None,
    )
    if not raw:
        raise RuntimeError("Set POSTGRES_URL or PRESENCE_PILOT_GGM_DATABASE_URL before owner subject-token smoke.")
    normalized = f"postgresql://{raw[len('postgres://') :]}" if raw.startswith("postgres://") else raw
    url = make_url(normalized).difference_update_query(["supa", "pgbouncer"])
    if not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Owner subject-token smoke requires the hosted PostgreSQL target.")

    backend_root = Path(__file__).resolve().parents[1]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    database_url = url.render_as_string(hide_password=False)
    os.environ["DATABASE_URL"] = database_url
    from backend_factory import load_create_app

    app = load_create_app()({"SQLALCHEMY_DATABASE_URI": database_url, "AUTO_CREATE_ALL": False})
    with app.app_context():
        from flask_jwt_extended import create_access_token
        from manara_backend_app.models import User

        user = User.query.filter_by(email=email.lower()).first()
        if not user or not user.global_subject_id:
            raise RuntimeError("Hosted owner smoke requires one bound app user for the requested email.")
        return create_access_token(
            identity=user.global_subject_id,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": "authenticated",
                "email": user.email,
                "user_metadata": {"display_name": "GGM pilot owner smoke"},
                "app_metadata": {"provider": "email"},
            },
            expires_delta=timedelta(minutes=10),
        )


def data_value(payload: dict[str, Any]) -> Any:
    return payload.get("data")


def data_dict(payload: dict[str, Any]) -> dict[str, Any]:
    data = data_value(payload)
    return data if isinstance(data, dict) else {}


def json_shape(payload: Any) -> list[str]:
    return sorted(payload.keys()) if isinstance(payload, dict) else [type(payload).__name__]


def request_json(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    token: str | None = None,
    body: dict[str, Any] | None = None,
    timeout: int = 25,
) -> tuple[int, dict[str, Any], int]:
    headers = {"Accept": "application/json"}
    raw_body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        headers["Content-Type"] = "application/json"
        raw_body = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(f"{base_url.rstrip('/')}{path}", data=raw_body, headers=headers, method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return response.status, decode_json(raw), elapsed_ms(started)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return exc.code, decode_json(raw), elapsed_ms(started)


def request_text(
    base_url: str,
    path: str,
    *,
    timeout: int = 25,
) -> tuple[int, str, int]:
    request = urllib.request.Request(f"{base_url.rstrip('/')}{path}", headers={"Accept": "text/html"}, method="GET")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace"), elapsed_ms(started)
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace"), elapsed_ms(started)


def decode_json(raw: str) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {"_non_json": raw[:300]}
    return payload if isinstance(payload, dict) else {"_json": payload}


def elapsed_ms(started: float) -> int:
    return int(round((time.perf_counter() - started) * 1000))


def add_step(
    steps: list[Step],
    name: str,
    status: str,
    route: str,
    reason: str,
    *,
    http_status: int | None = None,
    latency_ms: int | None = None,
    response_shape_matched: bool | None = None,
    **data: Any,
) -> Step:
    step = Step(
        name=name,
        status=status,
        route=route,
        reason=reason,
        http_status=http_status,
        latency_ms=latency_ms,
        response_shape_matched=response_shape_matched,
        data=data,
    )
    steps.append(step)
    return step


def missing_step(steps: list[Step], name: str, route: str, *names: str) -> None:
    add_step(
        steps,
        name,
        "blocked",
        route,
        f"Missing required smoke input: {', '.join(names)}.",
        missing_env=list(names),
    )


def status_counts(steps: list[Step]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for step in steps:
        counts[step.status] = counts.get(step.status, 0) + 1
    return counts


def build_result(name: str, *, inputs: dict[str, Any], steps: list[Step], notes: list[str] | None = None) -> dict[str, Any]:
    counts = status_counts(steps)
    return {
        "name": name,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "result": "fail" if counts.get("fail") else "blocked" if counts.get("blocked") else "pass",
        "summary": counts,
        "inputs": inputs,
        "steps": [asdict(step) for step in steps],
        "notes": notes or [],
        "secret_values_printed": False,
    }


def write_artifacts(result: dict[str, Any], json_path: Path, markdown_path: Path, title: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    rows = [
        f"# {title}",
        "",
        f"- Generated: `{result['generated_at']}`",
        f"- Result: `{result['result']}`",
        f"- Summary: `{json.dumps(result['summary'], sort_keys=True)}`",
        "- Secret values printed: `false`",
        "",
        "| Step | Status | Route | HTTP | Latency ms | Shape | Reason |",
        "|---|---|---|---:|---:|---|---|",
    ]
    for step in result["steps"]:
        reason = str(step["reason"]).replace("|", "/")
        rows.append(
            f"| `{step['name']}` | `{step['status']}` | `{step['route']}` | "
            f"{step.get('http_status') or ''} | {step.get('latency_ms') or ''} | "
            f"{step.get('response_shape_matched')} | {reason} |"
        )
    if result.get("notes"):
        rows.extend(["", "## Notes", ""])
        rows.extend(f"- {note}" for note in result["notes"])
    markdown_path.write_text("\n".join(rows) + "\n", encoding="utf-8")


def token_placeholder_url(frontend_url: str | None) -> str:
    base = (frontend_url or "<presence-frontend-url>").rstrip("/")
    return f"{base}/r/<roomkey-token>"


def contains_private_identity_key(value: Any) -> bool:
    if isinstance(value, dict):
        for key, item in value.items():
            lowered = str(key).lower()
            if lowered in {"email", "raw_email", "user_id", "observer_id", "ip_hash", "user_agent_hash"}:
                return True
            if contains_private_identity_key(item):
                return True
    if isinstance(value, list):
        return any(contains_private_identity_key(item) for item in value)
    return False
