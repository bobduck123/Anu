# Route/status matrix

This matrix records the blocked hosted owner read-only run. The full JSON matrix was not generated because the proof stopped before completing all route checks.

| Surface | Method | Result | Notes |
|---|---:|---|---|
| Hosted sign-in | Browser | Reached | Owner sign-in reached the deployed app using local env credentials. No credentials were printed. |
| `/studio/11/editor` | Browser | Reached | V2 editor shell loaded: root, top chrome, outline, and inspector were visible. |
| Hosted layout-composition controls | Browser | Blocked | `presence-studio-v2-layout-label` was not found on the active hosted frontend. |
| `/api/presence/owner/nodes` | GET | Not recorded | The test stopped before writing the full route-status file. |
| `/api/presence/owner/nodes/11` | GET | Not recorded | The test stopped before writing the full route-status file. |
| `/api/presence/owner/rooms/11/editor` | GET | Not recorded | The test stopped before writing the full route-status file. |
| `/api/presence/owner/rooms/11/editor/draft` | GET | Not recorded | The test stopped before writing the full route-status file. |
| `/studio/11/editor/preview` | Browser | Not reached | Private preview was not checked after the layout-control blocker. |
| `/p/ggm-christina-goddard` | Browser | Not reached | Public route was not checked after the layout-control blocker. |
| `/presence/ggm-christina-goddard` | Browser | Not reached | Public route was not checked after the layout-control blocker. |

## Mutation/publication check

- Draft write/revert: not attempted.
- Publish: not attempted.
- Backend mutation: not attempted.
- Public state mutation: not attempted.
- Screenshots retained: none from the blocked hosted run.
