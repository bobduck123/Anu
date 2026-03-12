import math


def robust_bayesian_filter(x_prev, P_prev, y, H, A, B, u, Q, R, nu=5):
    # Predict
    x_pred = A * x_prev + B * u
    P_pred = A * P_prev * A + Q
    # Innovation
    y_pred = H * x_pred
    resid = y - y_pred
    S = H * P_pred * H + R
    # Student-t scaling
    scale = (nu + (resid ** 2) / S) / (nu + 1)
    K = P_pred * H / S
    x_post = x_pred + K * resid
    P_post = (1 - K * H) * P_pred * scale
    return x_post, P_post
