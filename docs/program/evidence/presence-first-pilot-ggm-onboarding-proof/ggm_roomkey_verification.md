# GGM RoomKey Verification

- Generated: `2026-05-22T06:52:25Z`
- Result: `pass`
- Summary: `{"pass": 7}`
- Secret values printed: `false`

| Step | Status | Route | HTTP | Latency ms | Shape | Reason |
|---|---|---|---:|---:|---|---|
| `public_room_guest_read` | `pass` | `/api/presence/public/ggm-christina-goddard` | 200 | 1565 | True | Guest can open the public GGM Room. |
| `roomkey_analytics_baseline` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1217 | True | Owner analytics baseline captured before RoomKey resolve. |
| `active_roomkey_resolve` | `pass` | `/api/presence/keys/<roomkey-token>/resolve` | 200 | 1460 | True | Active QR RoomKey resolves to GGM and captures an aggregate encounter. |
| `invalid_roomkey_safe_failure` | `pass` | `/api/presence/keys/<invalid-roomkey-token>/resolve` | 404 | 1144 | True | Invalid RoomKey fails with safe JSON not-found response. |
| `revoked_roomkey_safe_failure` | `pass` | `/api/presence/keys/<revoked-roomkey-token>/resolve` | 410 | 1117 | True | Revoked proof RoomKey fails safely. |
| `roomkey_owner_analytics_increment` | `pass` | `/api/presence/owner/rooms/11/analytics` | 200 | 1485 | True | Owner Room analytics reflects the RoomKey entry. |
| `qr_payload_format` | `pass` | `https://your-presence.vercel.app/r/<roomkey-token>` |  |  | True | QR payload format points at the frontend RoomKey entry route and keeps the token out of evidence. |

## Notes

- The active RoomKey token is read from an ignored local env file or process env and is never written to evidence.
- The RoomKey entry payload includes the Observer upgrade prompt; it does not require guest auth before the public Room is shown.
