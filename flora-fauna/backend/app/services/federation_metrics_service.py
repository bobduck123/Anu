from datetime import datetime

from ..models import (
    Node,
    ImpactPool,
    Certification,
    SovereigntyIndex,
    MutualAidFlag,
    FederationProtocolVersion,
    CrossNodeMetricSnapshot,
    User,
    db,
)
from .ledger_service import pool_balance


def compute_cross_node_metrics():
    nodes = Node.query.all()
    total_nodes = len(nodes)
    total_treasury = 0
    for node in nodes:
        pools = ImpactPool.query.filter_by(node_id=node.id).all()
        total_treasury += sum(pool_balance(node.id, p.id) for p in pools)

    total_users = User.query.count()
    total_certified = Certification.query.filter_by(status="active").distinct(Certification.user_id).count()

    sovereignty_records = SovereigntyIndex.query.order_by(SovereigntyIndex.created_at.desc()).all()
    if sovereignty_records:
        avg_index = sum(r.index_value for r in sovereignty_records) / len(sovereignty_records)
    else:
        avg_index = 0.0

    mutual_aid_pairs = MutualAidFlag.query.filter_by(status="active").count()
    protocol_versions = {}
    for row in FederationProtocolVersion.query.filter_by(active=True).all():
        protocol_versions[str(row.node_id)] = row.version_label

    snapshot = CrossNodeMetricSnapshot(
        total_nodes=total_nodes,
        total_treasury_cents=int(total_treasury),
        total_users=int(total_users),
        total_certified_users=int(total_certified),
        average_sovereignty_index=float(avg_index),
        mutual_aid_pairs=mutual_aid_pairs,
        protocol_versions=protocol_versions,
        created_at=datetime.utcnow(),
    )
    db.session.add(snapshot)
    db.session.commit()
    return snapshot
