# Known Limitations

- This repair has passed local automated proof but is not deployed/re-smoked on the hosted owner account yet.
- The code proves `?debug=1` is display-only; the exact hosted timing that made debug appear to restore access is an inference until deployed network/diagnostic observations are captured.
- Session hydration uses a bounded grace window; a persistently invalid, expired, or incorrectly configured hosted session will still require sign-in or operator correction.
- This pass deliberately leaves Canvas features, readiness logic, publish logic, public rendering, and RoomKey functionality unchanged except for regression verification.
- Existing Next.js multiple-lockfile warnings and backend SQLAlchemy legacy warnings remain outside this P0 auth scope.
