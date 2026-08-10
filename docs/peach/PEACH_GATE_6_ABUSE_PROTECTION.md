# PEACH Gate 6 Abuse Protection

Status: implemented for private staging

## Protections Implemented

- Same-origin checks on public mutating API routes.
- Same-origin checks on steward review API.
- Signed CSRF tokens on server-action forms.
- In-memory rate limits on contribution, support, consent operation, and steward login attempts.
- Enum validation for contribution type, consent level, visibility preference, review status, and support path.
- Body/field length limits.
- Plain JSON error responses for API failures.

## Limits

- Contributions: 5 per minute per client key.
- Support intents: 5 per minute per client key.
- Consent operation requests: 4 per minute per client key.
- Steward login: 5 per minute per client key.
- Contribution body: 5000 characters.
- Short text fields: 200 characters.
- Consent operation details: 1200 characters.

## Demonstrated

Six support-intent attempts returned:

```text
201,201,201,201,201,429
```

Missing or mismatched `Origin` on a mutating public API returned `403`.

## Known Limitations

- Rate limits are in-memory and reset on process restart.
- No distributed rate limit store.
- No CAPTCHA or bot scoring.
- No request body byte limit beyond framework/runtime defaults.
- No WAF.

## Future Requirements

Gate 7 should move rate limits to a durable/shared store, add deployment-level request limits, add structured logging for rejected requests, and add private staging allowlists.
