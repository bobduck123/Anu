# Route/status comparison

## Hosted pre-change facts from blocked proof

| Route/check | Result |
|---|---|
| Owner auth | passed |
| `GET /api/presence/owner/nodes` | 200 |
| `GET /api/presence/owner/nodes/29` | 200 |
| `GET /api/presence/owner/rooms/29/editor` | 200 |
| `GET /api/presence/owner/rooms/29/editor/draft` | 200 |
| `/studio/29/editor` authenticated | 200 |
| `/studio/29/editor` V2 root | absent |
| `/p/bbbvision` anonymous | 200 |
| `/presence/bbbvision` anonymous | 200 |

## Local focused regression after Path A implementation

| Check | Result |
|---|---|
| `/studio/29/editor` | renders `presence-studio-v2-root` |
| BBB editor title | `bbb.vision` |
| Layout-composition controls | present |
| Save button on initial load | disabled |
| `/studio/29/editor/preview` | private preview available |
| Private preview projection | V2 public-room shell rendered |
| `/p/bbbvision` | 200 |
| `/presence/bbbvision` | 200 |
| `/studio/101/editor` | no V2 root; legacy editor remains available |
| Draft write request | none |
| Publish request | none |

## Limits

- This is not hosted deployment proof.
- This does not perform a hosted BBB draft write/revert.
- This does not publish BBB.
- This does not prove public launch readiness.
- This does not mutate backend data.
