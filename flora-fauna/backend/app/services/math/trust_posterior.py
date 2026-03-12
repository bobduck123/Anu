import math


def _log_beta(a, b):
    return math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)


def _betacf(a, b, x, max_iter=200, eps=3e-7):
    am, bm = 1.0, 1.0
    az = 1.0
    qab = a + b
    qap = a + 1.0
    qam = a - 1.0
    bz = 1.0 - qab * x / qap
    for m in range(1, max_iter + 1):
        em = float(m)
        tem = em + em
        d = em * (b - em) * x / ((qam + tem) * (a + tem))
        ap = az + d * am
        bp = bz + d * bm
        d = -(a + em) * (qab + em) * x / ((a + tem) * (qap + tem))
        app = ap + d * az
        bpp = bp + d * bz
        am, bm = ap / bpp, bp / bpp
        az, bz = app / bpp, 1.0
        if abs(app - az) < eps * abs(az):
            return az
    return az


def betainc(a, b, x):
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    bt = math.exp(math.log(x) * a + math.log(1 - x) * b - _log_beta(a, b))
    if x < (a + 1.0) / (a + b + 2.0):
        return bt * _betacf(a, b, x) / a
    return 1.0 - bt * _betacf(b, a, 1.0 - x) / b


def beta_quantile(a, b, q, tol=1e-5, max_iter=100):
    lo, hi = 0.0, 1.0
    for _ in range(max_iter):
        mid = (lo + hi) / 2.0
        cdf = betainc(a, b, mid)
        if abs(cdf - q) < tol:
            return mid
        if cdf < q:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0


def weighted_beta_posterior(success_weights, failure_weights, alpha0=1.0, beta0=1.0, decay_lambda=0.01):
    s = sum(success_weights)
    f = sum(failure_weights)
    alpha = alpha0 + s
    beta = beta0 + f
    lower = beta_quantile(alpha, beta, 0.05)
    return {
        "alpha": alpha,
        "beta": beta,
        "lower_bound": lower,
        "decay_lambda": decay_lambda,
    }
