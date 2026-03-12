from flask import jsonify, g


def ok(data=None, status=200):
    payload = {"ok": True, "data": data, "request_id": getattr(g, "request_id", None)}
    return jsonify(payload), status


def error(code, message, status=400, details=None):
    payload = {
        "ok": False,
        "error": {"code": code, "message": message, "details": details},
        "request_id": getattr(g, "request_id", None),
    }
    return jsonify(payload), status
