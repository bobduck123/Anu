#!/usr/bin/env python3
"""Verify ANU runtime health/readiness contract across core and impact endpoints."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

CONTRACT_VERSION = "m0.2026-04-01"
DEFAULT_TARGETS = {
    "core_health": "http://127.0.0.1:5000/health",
    "core_readiness": "http://127.0.0.1:5000/readiness",
    "impact_health": "http://127.0.0.1:5003/v1/health",
    "impact_falak_health": "http://127.0.0.1:5003/v1/falak/health",
    "impact_falak_readiness": "http://127.0.0.1:5003/v1/falak/readiness",
}

REQUIRED_FIELDS = ["status", "service", "component", "contract_version", "timestamp", "dependencies"]
REQUIRED_DEPENDENCIES = ["database", "redis", "stripe", "postgis"]


def parse_json(url: str):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as response:
        body = response.read().decode("utf-8")
        payload = json.loads(body)
        return response.status, payload


def validate_payload(name: str, payload: dict) -> list[str]:
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if field not in payload:
            errors.append(f"{name}: missing field '{field}'")

    if payload.get("contract_version") != CONTRACT_VERSION:
        errors.append(
            f"{name}: contract_version expected {CONTRACT_VERSION}, got {payload.get('contract_version')}"
        )

    deps = payload.get("dependencies")
    if not isinstance(deps, dict):
        errors.append(f"{name}: dependencies must be an object")
    else:
        for dep in REQUIRED_DEPENDENCIES:
            if dep not in deps:
                errors.append(f"{name}: dependencies missing '{dep}'")

    timestamp = payload.get("timestamp")
    if isinstance(timestamp, str):
        try:
            datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except ValueError:
            errors.append(f"{name}: timestamp is not valid ISO-8601")
    else:
        errors.append(f"{name}: timestamp must be a string")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify M0 runtime health/readiness contract")
    parser.add_argument("--skip-unreachable", action="store_true", help="Skip endpoints that are not reachable")
    args = parser.parse_args()

    failures: list[str] = []
    unreachable: list[str] = []

    print("Verifying runtime contract targets:")
    for name, url in DEFAULT_TARGETS.items():
        print(f"- {name}: {url}")
        try:
            status_code, payload = parse_json(url)
            if not isinstance(payload, dict):
                failures.append(f"{name}: expected JSON object payload")
                continue
            failures.extend(validate_payload(name, payload))
            if status_code >= 500 and name.endswith("health"):
                failures.append(f"{name}: returned {status_code}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            message = f"{name}: unreachable ({exc})"
            if args.skip_unreachable:
                unreachable.append(message)
            else:
                failures.append(message)

    if unreachable:
        print("\nSkipped unreachable endpoints:")
        for msg in unreachable:
            print(f"  - {msg}")

    if failures:
        print("\nContract verification failed:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("\nContract verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
