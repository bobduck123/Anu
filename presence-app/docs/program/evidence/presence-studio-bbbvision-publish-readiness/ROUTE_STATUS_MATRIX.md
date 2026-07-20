# BBB Publish-Readiness Route Status Matrix

| Surface | Method | Path | Status | Result | Notes |
|---|---:|---|---:|---|---|
| public canonical desktop | BROWSER | `/p/bbbvision` | 200 | ok | Anonymous public route render. |
| public legacy desktop | BROWSER | `/presence/bbbvision` | 200 | ok | Anonymous public route render. |
| public canonical mobile | BROWSER | `/p/bbbvision` | 200 | ok | Anonymous public route render. |
| public legacy mobile | BROWSER | `/presence/bbbvision` | 200 | ok | Anonymous public route render. |
| hosted Studio V2 editor | BROWSER | `/studio/29/editor` | 200 | ok | Owner-authenticated editor route. |
| hosted private preview desktop | BROWSER | `/studio/29/editor/preview` | 200 | ok | Owner-authenticated private preview. |
| CTA/Enter path proof | BROWSER | `/p/bbbvision` | 200 | ok | Anonymous public route with Enter CTA interaction. |
| public canonical desktop after private preview | BROWSER | `/p/bbbvision` | 200 | ok | Anonymous public route render. |
| public legacy desktop after private preview | BROWSER | `/presence/bbbvision` | 200 | ok | Anonymous public route render. |
