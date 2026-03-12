import math


def ewma_volatility(returns, lam=0.94):
    if lam < 0.90 or lam > 0.99:
        raise ValueError("ewma_lambda out of bounds")
    var = 0.0
    for r in returns:
        var = lam * var + (1 - lam) * (r ** 2)
    return math.sqrt(var)


def bayesian_sv(returns):
    # Simple shrinkage to prior variance
    if not returns:
        return 0.0
    mean = sum(returns) / len(returns)
    var = sum((r - mean) ** 2 for r in returns) / max(len(returns) - 1, 1)
    return math.sqrt(var * 0.7)


def garch_11(returns, alpha=0.1, beta=0.85, omega=0.05):
    if not returns:
        return 0.0
    var = returns[0] ** 2
    for r in returns[1:]:
        var = omega + alpha * (r ** 2) + beta * var
    return math.sqrt(var)


def phased_volatility(returns, params):
    n = len(returns)
    lam = params.get("ewma_lambda", 0.94)
    n_bayes = params.get("bayes_threshold", 60)
    n_garch = params.get("garch_threshold", 200)
    garch_enabled = params.get("garch_enabled", False)
    if n_bayes < 1 or n_garch < n_bayes:
        raise ValueError("thresholds invalid")
    if n < n_bayes:
        return {"method": "ewma", "volatility": ewma_volatility(returns, lam=lam)}
    if n < n_garch:
        return {"method": "bayesian_sv", "volatility": bayesian_sv(returns)}
    if garch_enabled:
        return {"method": "garch", "volatility": garch_11(returns)}
    return {"method": "bayesian_sv", "volatility": bayesian_sv(returns)}
