def _build_graph(scores, capacity, influence_cap, burnout_cap, diversity_penalty):
    users = sorted({u for u, _, _ in scores})
    guilds = sorted({g for _, g, _ in scores})
    user_idx = {u: i for i, u in enumerate(users)}
    guild_idx = {g: i for i, g in enumerate(guilds)}

    edges = []
    for u, g, score in scores:
        penalty = diversity_penalty.get(g, 0.0)
        if influence_cap.get(u, 0) >= 1:
            continue
        if burnout_cap.get(u, 0) >= 1:
            continue
        cost = -score + penalty
        edges.append((user_idx[u], guild_idx[g], cost))
    return users, guilds, edges


def min_cost_flow(scores, capacity, influence_cap=None, burnout_cap=None, diversity_penalty=None):
    influence_cap = influence_cap or {}
    burnout_cap = burnout_cap or {}
    diversity_penalty = diversity_penalty or {}
    users, guilds, edges = _build_graph(scores, capacity, influence_cap, burnout_cap, diversity_penalty)
    assignments = {}
    guild_counts = {g: 0 for g in guilds}
    for u_idx, g_idx, cost in sorted(edges, key=lambda e: e[2]):
        user = users[u_idx]
        guild = guilds[g_idx]
        if user in assignments:
            continue
        if guild_counts[guild] >= capacity.get(guild, 1):
            continue
        assignments[user] = guild
        guild_counts[guild] += 1
    return assignments


def assignment_optimizer(scores, capacity, influence_cap=None, burnout_cap=None, diversity_penalty=None):
    return min_cost_flow(scores, capacity, influence_cap, burnout_cap, diversity_penalty)
