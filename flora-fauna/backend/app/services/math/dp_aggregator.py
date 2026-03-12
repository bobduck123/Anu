import random


def laplace_noise(scale):
    u = random.uniform(-0.5, 0.5)
    return -scale * (1 if u >= 0 else -1) * (abs(u) * 2) ** 0.5


def dp_sum(value, epsilon=1.0, sensitivity=1.0):
    scale = sensitivity / max(epsilon, 1e-6)
    return value + laplace_noise(scale)
