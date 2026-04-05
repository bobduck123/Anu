#!/usr/bin/env python3
"""Verify required environment contract keys exist in ANU env templates."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TARGETS = {
    ROOT / 'flora-fauna/backend/.env.example': {
        'DATABASE_URL',
        'JWT_SECRET_KEY',
        'SECRET_KEY',
    },
    ROOT / 'services/impact-service/.env.example': {
        'DATABASE_URL',
        'JWT_SECRET_KEY',
    },
    # frontend-next/.env.example is intentionally gitignored by frontend-next/.gitignore.
    # For CI contract checks, validate the tracked Vercel template instead.
    ROOT / 'frontend-next/vercel.env.example': {
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'CORE_API_ORIGIN',
        'IMPACT_API_ORIGIN',
    },
}


def parse_env_keys(path: Path) -> set[str]:
    keys: set[str] = set()
    for line in path.read_text(encoding='utf-8').splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)\s*=.*$', stripped)
        if match:
            keys.add(match.group(1))
    return keys


def main() -> int:
    failures: list[str] = []

    for env_file, required_keys in TARGETS.items():
        if not env_file.exists():
            failures.append(f"Missing env template: {env_file}")
            continue

        found = parse_env_keys(env_file)
        missing = sorted(required_keys - found)
        if missing:
            failures.append(f"{env_file}: missing keys {', '.join(missing)}")

    if failures:
        print('Environment contract check failed:')
        for failure in failures:
            print(f'  - {failure}')
        return 1

    print('Environment contract check passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
