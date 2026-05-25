# Known Limitations

- Hosted owner verification for room 11 has not been rerun after this code fix. Deployment and hosted re-smoke remain required before a friendly pilot.
- Denial surfaces still render within the existing frontend page behavior; changing HTTP denial status codes was explicitly outside this P0 pass.
- This pass fixes lifecycle blockers only. It does not improve upload, crop, focal point, mobile inspector form, or work-reorder automation behavior.
- If optional legacy node hydration is unavailable, authenticated preview forms a safe render input from the protected editor response. This path is verified for the GGM pilot room; broad non-GGM fidelity remains outside this pass.
- The existing Next build/dev multiple-lockfile workspace-root warning remains.
- The existing backend SQLAlchemy legacy API warnings remain.
- No production/live screenshots or live cleanup proof exist because no hosted publication was performed.
- Paid pilots and public self-serve are not justified by this blocker fix alone.

