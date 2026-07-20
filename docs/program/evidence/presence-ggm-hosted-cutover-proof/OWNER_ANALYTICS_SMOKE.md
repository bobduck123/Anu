# GGM Owner Analytics Verification

- Generated: `2026-05-22T21:41:07Z`
- Result: `pass`
- Summary: `{"pass": 8}`
- Secret values printed: `false`

| Step | Status | Route | HTTP | Latency ms | Shape | Reason |
|---|---|---|---:|---:|---|---|
| `graph_analytics_baseline` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1217 | True | Graph analytics baseline returned aggregate RoomKey metrics. |
| `node_analytics_baseline` | `pass` | `/api/presence/owner/nodes/11/analytics` | 200 | 1213 | True | Node analytics baseline returned Room view/enquiry counts. |
| `pilot_roomkey_interaction` | `pass` | `/api/presence/keys/<roomkey-token>/resolve` | 200 | 1165 | True | RoomKey interaction executed for analytics proof. |
| `pilot_public_room_open` | `pass` | `/api/presence/public/ggm-christina-goddard` | 200 | 1500 | True | Public Room open interaction executed for analytics proof. |
| `pilot_enquiry_interaction` | `pass` | `/api/presence/public/ggm-christina-goddard/enquiries` |  |  | True | Enquiry analytics interaction intentionally skipped; per-Room enquiry smoke owns that mutation. |
| `graph_analytics_after_interactions` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1497 | True | Owner graph analytics increments without private Observer identity keys. |
| `node_analytics_after_interactions` | `pass` | `/api/presence/owner/nodes/11/analytics` | 200 | 1496 | True | Owner node analytics reflects public activity with aggregate-safe shape. |
| `owner_analytics_isolation` | `pass` | `/api/presence/owner/rooms/<foreign-room-id>/analytics` |  |  | True | Skipped here because this owner token is platform_admin; non-owner denial is verified by the admin-account smoke. |

## Notes

- Save/follow, Hall, portal, stall, and Path events are not required by the GGM first-pilot plan unless those surfaces are enabled.
- Both analytics APIs are checked: graph RoomKey encounter metrics and Presence Node view/enquiry metrics.
