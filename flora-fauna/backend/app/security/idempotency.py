from __future__ import annotations

from functools import wraps

from flask import g, jsonify, make_response, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import ControlIdempotencyRecord


def idempotent_control_write():
    """
    Optional replay protection for control-plane write endpoints.
    Clients can send X-Idempotency-Key for safe retries.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
                return fn(*args, **kwargs)

            key = (request.headers.get("X-Idempotency-Key") or "").strip()
            if not key:
                return fn(*args, **kwargs)
            if len(key) > 160:
                return jsonify({
                    "ok": False,
                    "error": {"code": "validation_error", "message": "X-Idempotency-Key is too long"},
                    "request_id": getattr(g, "request_id", None),
                }), 400

            actor_id = getattr(g, "control_user_id", None)
            existing = ControlIdempotencyRecord.query.filter_by(
                actor_id=actor_id,
                method=request.method,
                route=request.path,
                idempotency_key=key,
            ).first()
            if existing:
                payload = existing.response_json or {"ok": True, "data": None}
                if isinstance(payload, dict):
                    payload.setdefault("meta", {})
                    if isinstance(payload["meta"], dict):
                        payload["meta"]["idempotent_replay"] = True
                response = make_response(jsonify(payload), existing.status_code)
                response.headers["X-Idempotency-Replayed"] = "true"
                return response

            result = fn(*args, **kwargs)
            response = make_response(result)

            if 200 <= response.status_code < 300:
                payload = response.get_json(silent=True)
                record = ControlIdempotencyRecord(
                    actor_id=actor_id,
                    method=request.method,
                    route=request.path,
                    idempotency_key=key,
                    status_code=response.status_code,
                    response_json=payload,
                )
                db.session.add(record)
                try:
                    db.session.commit()
                except IntegrityError:
                    db.session.rollback()
                    existing = ControlIdempotencyRecord.query.filter_by(
                        actor_id=actor_id,
                        method=request.method,
                        route=request.path,
                        idempotency_key=key,
                    ).first()
                    if existing:
                        replay_payload = existing.response_json or payload or {"ok": True, "data": None}
                        replay_response = make_response(jsonify(replay_payload), existing.status_code)
                        replay_response.headers["X-Idempotency-Replayed"] = "true"
                        return replay_response
            return response

        return wrapper

    return decorator
