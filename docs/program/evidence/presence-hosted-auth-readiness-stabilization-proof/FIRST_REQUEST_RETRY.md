# First-Request Recovery

## Purpose

Hosted reports indicate that a first owner read can fail while an immediate second request succeeds. The exact infrastructure cause requires deployed observation; the UI must nevertheless avoid permanently converting a transient owner-read failure into an access denial or stale readiness blocker.

## Implemented Policy

`ownerReadFetch()` is used only for owner data reads and the existing protected preview ensure/read operation.

| Condition | Automatic recovery |
| --- | --- |
| Network error | Retry with bounded backoff |
| `408`, `429`, `502`, `503`, `504` | Retry with bounded backoff |
| First `401` while a local session token exists | One verification retry |
| `403` | No retry; honour denial |
| Save draft mutation | No automatic retry |
| Publish mutation | No automatic retry |
| Destructive action | No automatic retry |

The default attempt ceiling is three and the backoff is small (`180ms`, then `450ms`).

## Diagnostics

When development logging is active, or an owner opens the editor with `?debug=1`, read recovery emits safe console diagnostics:

- route and method,
- response status,
- retry attempt and recovery result,
- request duration,
- whether an owner session was present,
- bearer-session transport label.

No token, account identifier, private email, draft data, or audit metadata is logged.

## Proof

- Unit test: first `503`, then success recovers.
- Unit test: first network error, then success recovers.
- Unit test: confirmed `403` is returned without retry.
- Unit test: an unclassified POST mutation is not retried.
- Browser test: first owner node/editor reads fail transiently and Canvas recovers rather than showing a stale gate.
