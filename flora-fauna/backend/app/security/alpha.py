from functools import wraps
from flask import current_app, has_app_context
from flask_jwt_extended import jwt_required


def alpha_jwt_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if has_app_context() and current_app.config.get("ALPHA_PUBLIC"):
                if current_app.config.get("ALPHA_AUTH_OPTIONAL"):
                    return jwt_required(optional=True)(fn)(*args, **kwargs)
                return jwt_required()(fn)(*args, **kwargs)
            return jwt_required()(fn)(*args, **kwargs)
        return wrapper
    return decorator
