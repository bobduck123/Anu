# Known Limitations

- Hosted verification is not yet run for this repaired source state; deployment and owner re-smoke remain mandatory.
- The root infrastructure reason for first-request/second-request hosted behavior is not proven locally. Recovery is bounded mitigation plus diagnostics, not a claim that Vercel or backend cold-start behavior is solved at source.
- A persistent expired or mis-scoped hosted auth token will still deny access; retry is not an authentication bypass.
- Automatic retry is intentionally unavailable for save and publish writes. An owner must retry a failed write explicitly to avoid duplicate mutation.
- Readiness parity for inherited hero imagery is fixed for the live GGM room renderer. Non-GGM renderer support remains conservative and requires authored publishable media.
- This pass does not add upload, crop, focal-point controls, widgets, layout features, or new mobile inspector behavior.
- This pass does not promote the system to paid pilots or public self-serve readiness.
