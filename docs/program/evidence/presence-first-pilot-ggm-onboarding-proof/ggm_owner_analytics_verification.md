# GGM Owner Analytics Verification

- Generated: `2026-05-22T06:52:54Z`
- Result: `pass`
- Summary: `{"pass": 8}`
- Secret values printed: `false`

| Step | Status | Route | HTTP | Latency ms | Shape | Reason |
|---|---|---|---:|---:|---|---|
| `graph_analytics_baseline` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1490 | True | Graph analytics baseline returned aggregate RoomKey metrics. |
| `node_analytics_baseline` | `pass` | `/api/presence/owner/nodes/11/analytics` | 200 | 1197 | True | Node analytics baseline returned Room view/enquiry counts. |
| `pilot_roomkey_interaction` | `pass` | `/api/presence/keys/<roomkey-token>/resolve` | 200 | 1197 | True | RoomKey interaction executed for analytics proof. |
| `pilot_public_room_open` | `pass` | `/api/presence/public/ggm-christina-goddard` | 200 | 1459 | True | Public Room open interaction executed for analytics proof. |
| `pilot_enquiry_interaction` | `pass` | `/api/presence/public/ggm-christina-goddard/enquiries` | 201 | 1261 | True | Safe enquiry interaction executed for analytics proof. |
| `graph_analytics_after_interactions` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1472 | True | Owner graph analytics increments without private Observer identity keys. |
| `node_analytics_after_interactions` | `pass` | `/api/presence/owner/nodes/11/analytics` | 200 | 1179 | True | Owner node analytics reflects public activity with aggregate-safe shape. |
| `owner_analytics_isolation` | `pass` | `/api/presence/owner/rooms/12/analytics` | 403 | 1754 | True | GGM owner token cannot read another owner's Room analytics. |

## Notes

- Save/follow, Hall, portal, stall, and Path events are not required by the GGM first-pilot plan unless those surfaces are enabled.
- Both analytics APIs are checked: graph RoomKey encounter metrics and Presence Node view/enquiry metrics.
