import math


def logistic(x):
    return 1.0 / (1.0 + math.exp(-x))


def estimate_theta(evidence, b_values, prior_mean=0.0, prior_var=1.0, max_iter=50):
    theta = prior_mean
    for _ in range(max_iter):
        grad = 0.0
        hess = 0.0
        for e, b in zip(evidence, b_values):
            p = logistic(theta - b)
            grad += e - p
            hess -= p * (1 - p)
        grad += -(theta - prior_mean) / prior_var
        hess += -1 / prior_var
        if abs(hess) < 1e-6:
            break
        step = grad / hess
        theta -= step
        if abs(step) < 1e-4:
            break
    variance = -1 / hess if hess < 0 else prior_var
    return theta, math.sqrt(max(variance, 1e-6))


def conservative_theta(theta, sd, z=1.96):
    return theta - z * sd
