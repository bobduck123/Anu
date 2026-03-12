from flask import Flask
from flask_talisman import Talisman


def init_security_headers(app: Flask) -> None:
    Talisman(
        app,
        force_https=app.config.get("FORCE_HTTPS", False),
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,
        content_security_policy={
            "default-src": "'self'",
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "font-src": ["'self'"],
            "img-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'", "https://api.stripe.com"],
        },
        referrer_policy="strict-origin-when-cross-origin",
        frame_options="DENY",
        content_security_policy_nonce_in=["script-src"],
    )
