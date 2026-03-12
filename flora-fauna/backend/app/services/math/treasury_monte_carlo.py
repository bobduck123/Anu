import random
import math


def student_t_noise(df, scale):
    # Simple t noise via normal / sqrt(chi2/df)
    z = random.gauss(0, 1)
    chi2 = sum(random.gauss(0, 1) ** 2 for _ in range(df))
    return z / math.sqrt(chi2 / df) * scale


def simulate_balances(initial, monthly_net, months=12, trials=1000, df=5, scale=0.05, seed=42):
    random.seed(seed)
    simulations = []
    for _ in range(trials):
        balance = initial
        path = []
        for _ in range(months):
            noise = student_t_noise(df, scale) * abs(monthly_net or 1)
            balance += monthly_net + noise
            path.append(balance)
        simulations.append(path)
    return simulations


def cvar(samples, alpha=0.95):
    if not samples:
        return 0.0
    sorted_vals = sorted(samples)
    idx = int(alpha * len(sorted_vals))
    tail = sorted_vals[idx:]
    return sum(tail) / max(len(tail), 1)
