# Screenshots

All images in this folder were captured from the deterministic local Playwright fixture on 2026-05-25. They are product-flow proof, not hosted-environment proof.

| Screenshot | Proof |
| --- | --- |
| `screenshots/owner-editor-draft-saved.png` | Owner Canvas with a saved local test marker before opening to visitors. |
| `screenshots/public-before-publish.png` | Anonymous public room before publish; the draft marker is absent. |
| `screenshots/owner-preview-renders-draft.png` | Authenticated full preview rendering the draft marker after optional node hydration is forced to fail. |
| `screenshots/anonymous-preview-denial.png` | Anonymous full preview access remains gated. |
| `screenshots/publish-confirmation-dialog.png` | Explicit Open-to-visitors confirmation dialog reached by clicking the visible primary action. |
| `screenshots/public-after-publish.png` | Public room reflecting the test marker only after confirmed publish. |
| `screenshots/roomkey-after-publish.png` | RoomKey rendering the now-published state after confirmation. |

No hosted screenshots were captured because hosted owner verification was not run from this workspace.

