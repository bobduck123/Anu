#!/usr/bin/env python3
"""Smoke-test core runtime health/readiness contract payloads."""

from __future__ import annotations

import os
import sys
from pathlib import Path

os.environ.setdefault('FLASK_ENV', 'testing')
os.environ.setdefault('SECRET_KEY', 'm0-smoke-secret-key-1234567890-abcdefghij')
os.environ.setdefault('JWT_SECRET_KEY', 'm0-smoke-jwt-secret-key-1234567890-abcdefghij')

BACKEND_DIR = Path(__file__).resolve().parents[1] / 'flora-fauna' / 'backend'
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend_factory import load_create_app  # noqa: E402

create_app = load_create_app()
app = create_app(
    {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'AUTO_CREATE_ALL': False,
        'BETA_PLACEHOLDER_DATABASE': False,
        'BETA_PLACEHOLDER_STRIPE': False,
    }
)

with app.test_client() as client:
    health = client.get('/health')
    readiness = client.get('/readiness')

if health.status_code != 200:
    raise SystemExit(f'/health failed with {health.status_code}')

if readiness.status_code not in (200, 503):
    raise SystemExit(f'/readiness unexpected status {readiness.status_code}')

required_fields = ['status', 'service', 'component', 'contract_version', 'timestamp', 'dependencies']

for endpoint, payload in [('health', health.get_json()), ('readiness', readiness.get_json())]:
    if not isinstance(payload, dict):
        raise SystemExit(f'{endpoint}: payload is not an object')
    for field in required_fields:
        if field not in payload:
            raise SystemExit(f'{endpoint}: missing field {field}')

print('Core runtime smoke passed.')
