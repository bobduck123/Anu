# GGM Post-Onboarding Smoke

- Generated: `2026-05-22T06:55:43Z`
- Result: `pass`
- Summary: `{"pass": 12}`
- Secret values printed: `false`

| Step | Status | Route | HTTP | Latency ms | Shape | Reason |
|---|---|---|---:|---:|---|---|
| `backend_health` | `pass` | `/health` | 200 | 1797 | True | Hosted backend health answered before pilot smoke. |
| `public_room_exists` | `pass` | `/api/presence/public/ggm-christina-goddard` | 200 | 1485 | True | GGM Presence Room is public. |
| `frontend_public_room_route` | `pass` | `/presence/ggm-christina-goddard` | 200 | 3760 | True | Frontend public Room route returned HTML. |
| `owner_analytics_baseline` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1467 | True | Owner analytics baseline captured. |
| `roomkey_entry` | `pass` | `/api/presence/keys/<roomkey-token>/resolve` | 200 | 1190 | True | RoomKey entry resolves to GGM and captures entry. |
| `invalid_roomkey` | `pass` | `/api/presence/keys/<invalid-roomkey-token>/resolve` | 404 | 1451 | True | Invalid RoomKey fails safely. |
| `frontend_roomkey_route_exists` | `pass` | `/r/<roomkey-token>` | 200 | 1827 | True | Frontend RoomKey route is deployed; backend valid-token proof is recorded above. |
| `enquiry_route` | `pass` | `/api/presence/public/ggm-christina-goddard/enquiries` | 201 | 1566 | True | Enquiry route matched the pilot routing posture. |
| `owner_analytics_updated` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1171 | True | Owner analytics reflects post-onboarding RoomKey entry. |
| `world_forming_frontend` | `pass` | `/world` | 200 | 2322 | True | World remains a forming frontend surface. |
| `rollback_checklist_exists` | `pass` | `docs\program\PRESENCE_FIRST_PILOT_GGM_ROLLBACK_DISABLE_CHECKLIST_2026-05-22.md` |  |  | True | GGM rollback/disable checklist exists. |
| `deferred_surfaces_posture` | `pass` | `GGM room plan` |  |  | True | GGM Hall, Path, and Observer save verification remain deferred unless the pilot plan enables them. |

## Notes

- The smoke performs safe tagged pilot interactions only; it does not alter the external GGM static site.
- V2 and realtime claims are checked as launch posture, not as product promises.
