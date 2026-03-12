def _is_convex(objective):
    return bool(objective.get("convex", False))


def _fallback_linear(targets):
    total = sum(targets.values()) or 1.0
    return {k: v / total for k, v in targets.items()}


def optimize_allocations(targets, constraints):
    objective = constraints.get("objective") or {}
    if not _is_convex(objective):
        return _fallback_linear(targets)

    allocation = dict(targets)
    total = sum(allocation.values()) or 1.0
    allocation = {k: v / total for k, v in allocation.items()}

    for key, floor in constraints.get("min", {}).items():
        if allocation.get(key, 0) < floor:
            allocation[key] = floor
    for key, cap in constraints.get("max", {}).items():
        if allocation.get(key, 0) > cap:
            allocation[key] = cap

    total = sum(allocation.values()) or 1.0
    allocation = {k: v / total for k, v in allocation.items()}
    return allocation
