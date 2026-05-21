from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = BACKEND_ROOT / ".env.presence-contract.local"


class ContractFailure(AssertionError):
    pass


class HttpContractClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        json_body: dict[str, Any] | None = None,
        expected: int | tuple[int, ...] = 200,
        unwrap: bool = True,
    ) -> Any:
        url = f"{self.base_url}{path}"
        data = None
        headers = {"Accept": "application/json"}
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(url, data=data, headers=headers, method=method.upper())
        status, payload = self._send(request)
        expected_set = {expected} if isinstance(expected, int) else set(expected)
        if status not in expected_set:
            raise ContractFailure(f"{method.upper()} {path} returned {status}; expected {sorted(expected_set)}. Payload: {payload}")
        if not unwrap:
            return payload
        if not isinstance(payload, dict) or payload.get("ok") is not True or "data" not in payload:
            raise ContractFailure(f"{method.upper()} {path} did not return canonical ok/data envelope: {payload}")
        return payload["data"]

    @staticmethod
    def _send(request: Request) -> tuple[int, Any]:
        try:
            with urlopen(request, timeout=15) as response:
                raw = response.read().decode("utf-8")
                return response.status, _json_or_text(raw)
        except HTTPError as exc:
            raw = exc.read().decode("utf-8")
            return exc.code, _json_or_text(raw)
        except URLError as exc:
            raise ContractFailure(f"Backend unavailable at {request.full_url}: {exc}") from exc


def _json_or_text(raw: str) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        value = value.strip()
        if value.startswith('"') or value.startswith("'"):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                value = value.strip("'\"")
        os.environ.setdefault(key.strip(), value)


def wait_for_backend(client: HttpContractClient, *, timeout_seconds: int = 30) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            payload = client.request("GET", "/healthz", expected=(200, 503), unwrap=False)
            if isinstance(payload, dict) and payload.get("status") == "ok":
                return payload
            if isinstance(payload, dict) and payload.get("ready") is True:
                return payload
            if isinstance(payload, dict) and payload.get("database", {}).get("ok") is True:
                return payload
            last_error = ContractFailure(f"Backend health not ready: {payload}")
        except Exception as exc:  # noqa: BLE001 - retry loop preserves the last failure.
            last_error = exc
        time.sleep(1)
    raise ContractFailure(f"Backend did not become ready within {timeout_seconds}s: {last_error}")


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ContractFailure(f"Missing required environment variable {name}. Run dev_presence_contract_bootstrap.py first.")
    return value


def first_item(payload: dict[str, Any], label: str) -> dict[str, Any]:
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise ContractFailure(f"Expected at least one {label} item, got {payload}")
    if not isinstance(items[0], dict):
        raise ContractFailure(f"Expected {label} items to be objects, got {items[0]!r}")
    return items[0]


def assert_list_envelope(payload: dict[str, Any], label: str) -> None:
    if "items" not in payload or not isinstance(payload["items"], list):
        raise ContractFailure(f"{label} list missing items[]: {payload}")


def run_smoke() -> dict[str, Any]:
    base_url = require_env("PRESENCE_REAL_BACKEND_URL")
    observer_token = require_env("PRESENCE_REAL_OBSERVER_TOKEN")
    owner_token = require_env("PRESENCE_REAL_OWNER_TOKEN")
    hall_slug = require_env("PRESENCE_REAL_HALL_SLUG")
    room_id = require_env("PRESENCE_REAL_OWNER_ROOM_ID")
    board_id = require_env("PRESENCE_REAL_MOOD_BOARD_ID")
    item_id = require_env("PRESENCE_REAL_MOOD_BOARD_ITEM_ID")

    client = HttpContractClient(base_url)
    health = wait_for_backend(client)

    halls = client.request("GET", "/api/halls")
    assert_list_envelope(halls, "halls")
    for key in ("total", "live_count", "scheduled_count"):
        if key not in halls:
            raise ContractFailure(f"GET /api/halls missing {key}: {halls}")

    hall = client.request("GET", f"/api/halls/{hall_slug}")
    hall_id = hall.get("id")
    if not hall_id or hall.get("slug") != hall_slug:
        raise ContractFailure(f"Hall lookup mismatch for slug {hall_slug}: {hall}")
    portal_id = os.environ.get("PRESENCE_REAL_HALL_PORTAL_ID")
    stall_id = os.environ.get("PRESENCE_REAL_HALL_STALL_ID")
    if not portal_id:
        portal_id = str(first_item({"items": hall.get("portals") or []}, "portal")["id"])
    if not stall_id:
        stall_id = str(first_item({"items": hall.get("stalls") or []}, "stall")["id"])

    guest_join = client.request("POST", f"/api/halls/{hall_slug}/join", json_body={"guest_token": "presence-contract-smoke-guest"}, expected=(200, 201))
    if guest_join.get("joined") is not True:
        raise ContractFailure(f"Guest join did not report joined=true: {guest_join}")

    observer_join = client.request("POST", f"/api/halls/{hall_slug}/join", token=observer_token, expected=(200, 201))
    if observer_join.get("joined") is not True:
        raise ContractFailure(f"Observer join did not report joined=true: {observer_join}")

    participants = client.request("GET", f"/api/halls/{hall_slug}/participants")
    assert_list_envelope(participants, "participants")
    for participant in participants["items"]:
        if "user_id" in participant or "email" in participant:
            raise ContractFailure(f"Participant leaked private identity fields: {participant}")

    hall_observation = client.request(
        "POST",
        f"/api/halls/{hall_slug}/observations",
        token=observer_token,
        json_body={"body": "Real-backend contract Hall Observation.", "visibility": "hall"},
        expected=201,
    )
    if hall_observation.get("hall_id") != hall_id:
        raise ContractFailure(f"Hall Observation not attached to Hall {hall_id}: {hall_observation}")

    portal_click = client.request(
        "POST",
        f"/api/halls/{hall_slug}/portals/{portal_id}/click",
        json_body={"source": "contract_smoke"},
        expected=201,
    )
    stall_visit = client.request(
        "POST",
        f"/api/halls/{hall_slug}/stalls/{stall_id}/visit",
        json_body={"source": "contract_smoke"},
        expected=201,
    )
    for label, payload, event_type in (
        ("portal click", portal_click, "portal_click"),
        ("stall visit", stall_visit, "stall_visit"),
    ):
        event = payload.get("event")
        if not event or event.get("event_type") != event_type:
            raise ContractFailure(f"{label} did not capture a HallActivityEvent: {payload}")

    analytics_path = f"/api/presence/owner/halls/{hall_id}/analytics?{urlencode({'room_id': room_id})}"
    analytics = client.request("GET", analytics_path, token=owner_token)
    for key in ("portal_clicks", "stall_visits", "most_visited_stall", "most_used_portal", "people_gathered", "observations_shared"):
        if key not in analytics:
            raise ContractFailure(f"Hall analytics missing {key}: {analytics}")
    if int(analytics["portal_clicks"]) < 1 or int(analytics["stall_visits"]) < 1:
        raise ContractFailure(f"Hall analytics did not count portal/stall activity: {analytics}")

    garden_home = client.request("GET", "/api/garden/home", token=observer_token)
    if not isinstance(garden_home.get("sections"), list):
        raise ContractFailure(f"Garden home did not return frontend section list: {garden_home}")
    section_ids = {section.get("id") for section in garden_home["sections"]}
    if not {"new_growth", "from_mood_boards", "wilting_seeds", "compost"}.issubset(section_ids):
        raise ContractFailure(f"Garden home missing deterministic sections: {section_ids}")

    observation = client.request(
        "POST",
        "/api/observations",
        token=observer_token,
        json_body={
            "observation_kind": "room",
            "body": "Real-backend contract Observation.",
            "visibility": "mask_only",
            "source_kind": "room",
            "source_id": int(room_id),
        },
        expected=201,
    )
    observation_id = observation.get("id")

    self_promo_status, self_promo_payload = client._send(
        Request(
            f"{base_url}/api/observations",
            data=json.dumps({"body": "Book my services at hello@example.com", "visibility": "public"}).encode("utf-8"),
            headers={"Accept": "application/json", "Content-Type": "application/json", "Authorization": f"Bearer {observer_token}"},
            method="POST",
        )
    )
    if self_promo_status not in {400, 422}:
        raise ContractFailure(f"Self-promotion guard returned {self_promo_status}, expected 400/422: {self_promo_payload}")
    details = ((self_promo_payload or {}).get("error") or {}).get("details") if isinstance(self_promo_payload, dict) else None
    if isinstance(details, dict) and details.get("upgrade_required") is not True:
        raise ContractFailure(f"Self-promotion guard did not include upgrade_required detail: {self_promo_payload}")

    echo = client.request(
        "POST",
        f"/api/observations/{observation_id}/echoes",
        token=observer_token,
        json_body={"commentary": "Quoted from the real backend smoke run."},
        expected=201,
    )
    if echo.get("source_observation_id") != observation_id or echo.get("commentary") != "Quoted from the real backend smoke run.":
        raise ContractFailure(f"Echo commentary/attribution mismatch: {echo}")

    mood_seed = client.request(
        "POST",
        f"/api/observer/mood-boards/{board_id}/items/{item_id}/seed",
        token=observer_token,
        expected=201,
    )
    if "seed" not in mood_seed or mood_seed.get("garden_home_update_hint") != "from_mood_boards":
        raise ContractFailure(f"Mood Board Seed response mismatch: {mood_seed}")

    path = client.request("GET", f"/api/paths/from-hall/{hall_id}")
    if path.get("trailhead_type") != "hall":
        raise ContractFailure(f"Hall path did not use Hall trailhead: {path}")
    generated_path = client.request("POST", f"/api/paths/generate/from-hall/{hall_id}", expected=201)
    if generated_path.get("trailhead_type") != "hall":
        raise ContractFailure(f"Generated Hall path did not use Hall trailhead: {generated_path}")

    world_status, world_payload = client._send(Request(f"{base_url}/api/admin/presence/world-readiness", headers={"Accept": "application/json"}, method="GET"))
    if world_status not in {401, 403, 404}:
        raise ContractFailure(f"World readiness was publicly exposed; got {world_status}: {world_payload}")

    return {
        "backend_url": base_url,
        "health": health,
        "hall_id": hall_id,
        "hall_slug": hall_slug,
        "participants_seen": len(participants["items"]),
        "hall_observation_id": hall_observation.get("id"),
        "portal_click_event_id": portal_click["event"]["id"],
        "stall_visit_event_id": stall_visit["event"]["id"],
        "portal_clicks": analytics["portal_clicks"],
        "stall_visits": analytics["stall_visits"],
        "garden_sections": sorted(section_ids),
        "observation_id": observation_id,
        "echo_id": echo.get("id"),
        "mood_seed_id": mood_seed["seed"]["id"],
        "path_id": path.get("id"),
        "generated_path_id": generated_path.get("id"),
        "world_public_status": world_status,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke-test the real Presence Gardens/Halls backend contract over HTTP.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE, help="Env file emitted by dev_presence_contract_bootstrap.py.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_env(args.env_file)
    summary = run_smoke()
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ContractFailure as exc:
        print(f"CONTRACT_SMOKE_FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
