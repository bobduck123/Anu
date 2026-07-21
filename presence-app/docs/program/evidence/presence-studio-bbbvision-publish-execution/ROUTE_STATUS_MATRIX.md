# Route status matrix

| Phase | Surface | Method | Path | Status | Result | Notes |
|---|---|---:|---|---:|---|---|
| pre-change | owner room detail | GET | `/api/presence/owner/nodes/29` | 200 | ok | Owner-scoped read; payload body not recorded. |
| pre-change | editor overview | GET | `/api/presence/owner/rooms/29/editor` | 200 | ok | Owner-scoped read; payload body not recorded. |
| pre-change | editor draft | GET | `/api/presence/owner/rooms/29/editor/draft` | 200 | ok | Owner-scoped read; payload body not recorded. |
| pre-change | public /p/bbbvision | BROWSER | `/p/bbbvision` | 200 | ok | Anonymous public render. |
| pre-change | public /presence/bbbvision | BROWSER | `/presence/bbbvision` | 200 | ok | Anonymous public render. |
| pre-change | owner private preview | BROWSER | `/studio/29/editor/preview` | 200 | ok | Owner-authenticated private preview. |
| action | editor publish | POST | `/api/presence/owner/rooms/29/editor/publish` | 200 | ok | Existing intended owner editor publish endpoint. |
| post-change | owner room detail after action | GET | `/api/presence/owner/nodes/29` | 200 | ok | Owner-scoped read; payload body not recorded. |
| post-change | editor overview after action | GET | `/api/presence/owner/rooms/29/editor` | 200 | ok | Owner-scoped read; payload body not recorded. |
| post-change | editor draft after action | GET | `/api/presence/owner/rooms/29/editor/draft` | 200 | ok | Owner-scoped read; payload body not recorded. |
| post-change | public /p/bbbvision | BROWSER | `/p/bbbvision` | 200 | ok | Anonymous public no-cache render. |
| post-change | public /presence/bbbvision | BROWSER | `/presence/bbbvision` | 200 | ok | Anonymous public no-cache render. |
| post-change | public /p/bbbvision | BROWSER | `/p/bbbvision` | 200 | ok | Anonymous public no-cache render. |
| post-change | public /presence/bbbvision | BROWSER | `/presence/bbbvision` | 200 | ok | Anonymous public no-cache render. |
| post-change | CTA/Enter path | BROWSER | `/p/bbbvision` | 200 | ok | No-cache CTA/Enter interaction proof. |
| post-change | owner Studio editor | BROWSER | `/studio/29/editor` | 200 | ok | Owner-authenticated Studio route. |
| post-change | owner private preview | BROWSER | `/studio/29/editor/preview` | 200 | ok | Owner-authenticated private preview. |
