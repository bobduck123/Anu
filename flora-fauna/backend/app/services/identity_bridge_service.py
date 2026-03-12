import hashlib
import uuid
from datetime import datetime

from werkzeug.security import generate_password_hash

from .. import encryption
from ..config import Config
from ..extensions import db
from ..models import IdentityLink, User, Node, NodeConfig, BenefitsAccount, AuditRecord

try:
    import jwt
except Exception:  # pragma: no cover
    jwt = None


def _partner_hash(node_id, partner_user_id):
    secret = Config.SECRET_KEY or ""
    raw = f"{node_id}:{partner_user_id}:{secret}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _encrypt_partner_id(partner_user_id):
    return encryption.encrypt(partner_user_id)


def _node_config(node_id):
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    return cfg.config_json if cfg and isinstance(cfg.config_json, dict) else {}


def _jwks_key_from_config(config, kid):
    if jwt is None:
        return None
    jwks = config.get("oidc_jwks")
    if not jwks:
        return None
    keys = jwks.get("keys") if isinstance(jwks, dict) else jwks
    if not isinstance(keys, list):
        return None
    for key in keys:
        if kid and key.get("kid") != kid:
            continue
        try:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key)
        except Exception:
            continue
    return None


def verify_oidc_token(id_token, node_id):
    if jwt is None:
        raise ValueError("JWT library not available")
    config = _node_config(node_id)
    issuer = config.get("oidc_issuer")
    audience = config.get("oidc_audience")
    pub_key = config.get("oidc_public_key")
    header = jwt.get_unverified_header(id_token)
    key = _jwks_key_from_config(config, header.get("kid")) or pub_key
    if not key:
        raise ValueError("OIDC public key not configured")
    options = {"verify_aud": bool(audience), "verify_iss": bool(issuer)}
    return jwt.decode(id_token, key, algorithms=["RS256", "ES256"], audience=audience, issuer=issuer, options=options)


def find_or_create_identity_link(node_id, partner_user_id, auth_mode="jwt", link_confidence=1.0, actor_id=None):
    partner_hash = _partner_hash(node_id, partner_user_id)
    link = IdentityLink.query.filter_by(node_id=node_id, partner_user_hash=partner_hash).first()
    if link:
        link.last_seen_at = datetime.utcnow()
        link.link_confidence = max(link.link_confidence, link_confidence or 1.0)
        link.auth_mode = auth_mode or link.auth_mode
        db.session.commit()
        return link, User.query.filter_by(global_subject_id=link.global_subject_id).first()

    global_subject_id = str(uuid.uuid4())
    encrypted_partner = _encrypt_partner_id(partner_user_id)
    link = IdentityLink(
        node_id=node_id,
        partner_user_id=encrypted_partner,
        partner_user_hash=partner_hash,
        global_subject_id=global_subject_id,
        link_confidence=link_confidence or 1.0,
        auth_mode=auth_mode,
        created_at=datetime.utcnow(),
        last_seen_at=datetime.utcnow(),
    )
    db.session.add(link)

    node = Node.query.get(node_id)
    node_slug = node.slug if node else "node"
    username = f"shadow_{node_slug}_{global_subject_id[:8]}"
    pseudonym = f"{node_slug}_member_{global_subject_id[:6]}"
    email = f"shadow+{global_subject_id}@{node_slug}.local"
    shadow_user = User(
        username=username,
        email=email,
        pseudonym=pseudonym,
        password=generate_password_hash(str(uuid.uuid4())),
        role="participant",
        node_id=node_id,
        global_subject_id=global_subject_id,
    )
    db.session.add(shadow_user)

    account = BenefitsAccount.query.filter_by(node_id=node_id, global_subject_id=global_subject_id).first()
    if not account:
        db.session.add(BenefitsAccount(node_id=node_id, global_subject_id=global_subject_id, balance_cents=0))

    db.session.add(AuditRecord(
        actor_id=actor_id,
        node_id=node_id,
        action="IDENTITY_LINK_CREATED",
        entity_type="identity_link",
        entity_id=global_subject_id,
        payload={"auth_mode": auth_mode, "link_confidence": link_confidence},
    ))
    db.session.commit()
    return link, shadow_user


def resolve_identity_link(node_id, partner_user_id):
    partner_hash = _partner_hash(node_id, partner_user_id)
    return IdentityLink.query.filter_by(node_id=node_id, partner_user_hash=partner_hash).first()
