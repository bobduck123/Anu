# Validation record

Date: 2026-07-21

Branch: `feat/presence-studio-owner-experience-overhaul`

Implementation baseline: `3b7e113609b6726c3030467d259afb5e0c40ac35`

## Automated validation

| Check | Result | Notes |
| --- | --- | --- |
| `npm.cmd run typecheck` | PASS | `tsc --noEmit` completed without errors. |
| `npm.cmd run build` | PASS | Next.js 16.2.7 compiled, typechecked, and generated 29 static pages. The pre-existing multiple-lockfile workspace-root warning remains. |
| `presence-studio-owner-experience.spec.ts` | PASS, 1/1 | Full BBB Home-to-Publish-Review journey, dirty-preview safety gate, save, mobile placement controls, clean preview, public containment, preserved Unpublish access, and zero publish requests. Final post-review run passed in 15.7s. |
| Relevant Studio V2 regression bundle | PASS, 17/17 | Post-review run: BBB eligibility, environmental engine (3), GGM private proof, layout composition (5), public render (3), and inspector usability (4) all passed in 55.8s. |
| `presence-studio-v2-draft-preview.spec.ts` | PASS, 2/2 | Includes 390 x 640 preview-chrome non-overlap and scroll-reachable confirmation action. The sandbox run encountered external-fixture network restrictions; the policy-approved outside-sandbox rerun passed both V2 and legacy cases in 6.1s. |
| `git diff --check` | PASS | No whitespace errors; Git reports only the existing LF-to-CRLF working-copy warning for scoped CSS. |

The first combined regression run reported 15 passes and four failures. Two failures identified copy compatibility expectations and were fixed while retaining owner-language improvements; the inspector suite then passed 4/4. The other two were the sandbox network denials described above and passed unchanged outside the sandbox.

When short-mobile preview coverage was added, its first run placed the narrow viewport before assertions for intentionally desktop-only content. The test was corrected so existing desktop containment is checked first and the narrow-screen phase follows. The corrected suite then passed 2/2 outside the sandbox.

## Manual and visual QA

- Reviewed the new Home at desktop width for five-second comprehension.
- Reviewed all six guided steps and active-state/navigation behavior.
- Reviewed Rooms selection and Arrange room/piece/area context.
- Reviewed selected-piece placement controls and save affordance at desktop and 390 x 844 mobile width.
- Reviewed all six Look & Feel groups with the live room preview.
- Reviewed clean Visitor Preview: not-live boundary present, public room visible, inspector and owner journey absent.
- Reviewed 390 x 640 Visitor Preview boundary/control separation and scroll-safe Publish Review confirmation.
- Reviewed Publish Review checklist and confirmed the focused flow makes no publish request.
- Reviewed BBB public output at 1440 x 1000 with owner/editor instrumentation absent.

## Screenshot manifest

1. `00-before-owner-studio.png` - prior approved owner Studio evidence copied from the BBB publish-execution pack.
2. `01-new-studio-home.png` - new owner Home.
3. `02-guided-owner-shell.png` - six-step shell.
4. `03-rooms-step.png` - room overview.
5. `04-arrange-step.png` - central arrangement workspace.
6. `05-selected-piece-controls.png` - contextual placement controls.
7. `06-look-and-feel.png` - grouped visual controls and preview.
8. `07-visitor-preview-step.png` - preview explanation.
9. `08-visitor-preview-clean.png` - clean owner-only visitor render.
10. `09-publish-review.png` - checklist and safe handoff.
11. `10-mobile-owner-studio.png` - narrow-screen owner controls.
12. `11-bbb-public-unchanged.png` - desktop BBB public containment regression.

## Safety verification

- Focused Playwright interception recorded no request whose URL contained `/editor/publish`.
- The mock API request log likewise contained no publish request.
- No hosted or production command was run.
- No deployment, merge, email, public claim, or publication action was taken.
