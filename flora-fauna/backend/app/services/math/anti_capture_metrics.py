def hhi(shares):
    return sum(s ** 2 for s in shares)


def gini(values):
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    cumulative = 0.0
    for i, v in enumerate(sorted_vals, 1):
        cumulative += i * v
    total = sum(sorted_vals)
    if total == 0:
        return 0.0
    return (2 * cumulative) / (n * total) - (n + 1) / n
