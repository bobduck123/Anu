# Presence Studio Editor & Renderer Polish

Date: 2026-05-30

## Scope

Elevates the Studio Room owner editor at `/studio/[id]/studio-room` from a safe
functional draft editor into a more capable, more usable, more visually
distinctive no-code Presence editor — without expanding the draft contract,
the public surface, or the runtime stack.

Two axes covered in this pass:

A) **Advanced inspector controls** — breadcrumbs, role descriptions for non-
   technical owners, semantic field groups, inline length warnings, per-object
   revert, duplicate, mobile hide/show, and reorder within a chamber.

B) **Renderer / mobile polish** — kit-distinct visual treatments for each
   primary TemplateKit, richer object surfaces (service chips, credential
   issuer/detail, attributed proof quotes), a mobile sticky CTA, accessible
   focus rings, and lazy image loading. Reduced-motion and unknown-role
   fallbacks remain intact.

## Constraints honoured

- No changes to public routes.
- No public Studio Room rendering wired up.
- No public publishing path added.
- No runtime AI/LLM, model calls, API keys, or chatbot/product AI features.
- `underground-dj-portal` remains a candidate; not exposed in owner creation
  flow or selection list.
- TemplateKit, DNA, lifecycle, browser, and public-route isolation tests not
  weakened.
- No broad/private contact fields mapped.
- No unsafe media embed/audio support added.
- All edits remain draft/private only.
- Draft persistence boundary unchanged
  (`presence-editable-config-compat-v1` at
  `PresenceEditableConfig.content_config.studio_room_draft`).

## Files changed

- `lib/presence/studio-room/editing.ts` — added duplicate / move / hide
  helpers, human role labels and descriptions, length-limit helper, expanded
  safe-edit guard map. Existing `isSafeStudioRoomEditUrl`,
  `editableContentKeysForObjectType`, and `isObjectActionEditable` unchanged.
- `lib/presence/studio-room/renderer.ts` — `StudioRoomRenderTree` now exposes
  `templateKitId`; rendered objects now carry `priceLabel`, `durationLabel`,
  `attribution`, `source`, `issuer`, and `detail` for richer per-role
  treatments.
- `components/presence-studio/StudioRoomRenderer.ts` — added
  `data-template-kit-id` attribute, kit-distinct CSS rules for each of the
  five primary kits, sticky mobile CTA (mobile viewport only), focus-visible
  outlines on links and buttons, lazy image loading, and a richer treatment
  for service chips, credential issuer/detail, and attributed proof quotes.
- `components/presence-studio/StudioRoomOwnerEditorShell.tsx` — full inspector
  upgrade (see below). Preserves all existing `data-testid`s, the
  `Chamber summary` label, and the "No publish action exists" copy.
- `lib/presence/studio-room/studioRoomEditingPolish.test.ts` — new test suite
  (23 cases) covering inspector helpers, kit-distinct rendering, mobile
  sticky CTA, reduced-motion path, restricted-field guard, AI/LLM scan, and
  public route isolation.

## Inspector controls added (Part A)

| Capability                                | Where it lives                                  |
| ----------------------------------------- | ----------------------------------------------- |
| Chamber breadcrumb                        | `studio-room-inspector-breadcrumb` testid       |
| Chamber role label + description          | Inspector chamber section header                |
| Object role label + description           | Inspector object section header                 |
| Semantic field groups                     | "Identity", "Content", "Offer details",         |
|                                           | "Trust / proof", "Credential", "Public link",   |
|                                           | "Primary call to action" / "Action"             |
| Inline length warnings                    | Title / summary / label / body / quote /        |
|                                           | attribution / source / issuer / detail /        |
|                                           | priceLabel / durationLabel / linkType /         |
|                                           | actionLabel — all use shared `FIELD_LENGTH_LIMITS` |
| Unsafe URL warning                        | Preserved; surfaced on both `url` and `action.href` |
| Duplicate object within chamber           | `studio-room-object-duplicate` testid           |
| Move object up / down within chamber      | `studio-room-object-move-up` /                  |
|                                           | `studio-room-object-move-down` testids          |
| Hide / show object on mobile              | `studio-room-object-toggle-hidden` testid       |
| Revert single object to last saved state  | `studio-room-object-revert` testid              |
| Revert all unsaved local changes          | `studio-room-revert-all` testid                 |
| Save state indicator (`saved` vs `unsaved`) | Header `Info` panel                            |
| Empty chamber / empty object guidance     | Chamber panel + inspector empty state           |
| Mobile-hidden indicator on chamber list   | `studio-room-object-{id}-mobile-hidden` testid  |
| Preview / Inspector mobile tabs           | `studio-room-editor-mobile-tabs` testid         |

### Fields the inspector still refuses to expose

`schemaVersion`, `room.id`, `room.slug`, `room.state`, `room.templateKitId`,
`supportState`, `theme`, `rendererConfig`, `style_dna`, `motion_config`,
`editable_config`, `editorOnly`, `internal`, owner/auth/user fields, broad
email/phone/contactEmail/contactPhone fields, media embeds, audio players,
and any published state. The shell continues to delegate to the controlled
helpers `editableContentKeysForObjectType`, `isObjectActionEditable`, and
`isSafeStudioRoomEditUrl`.

### Reorder / duplicate / hide semantics

- `cta` objects are not duplicatable, not movable, and not hideable — the
  primary CTA stays anchored to the entrance chamber.
- `contact` objects are not hideable on mobile (visitors should always see
  the contact card).
- `metadata` objects are not duplicatable.
- All other safe object types can be duplicated, reordered within their
  chamber, and toggled visible / hidden on mobile.
- Reorder is deterministic: it swaps adjacent positions in the
  `chamber.objects` array and re-sequences `mobile.order` to match.
- Duplicate inserts the copy directly after the source, generates a unique
  id (`{baseId}-copy`, `{baseId}-copy-2`, …), appends ` (copy)` to the label,
  clears `required`, and re-sequences `mobile.order`.

## Renderer / mobile improvements (Part B)

- `data-template-kit-id` is now emitted on the rendered `<article>` so kit-
  distinct CSS rules and downstream tooling can target each kit.
- Mobile sticky CTA (`studio-room-mobile-sticky-cta`) renders only when the
  viewport is `mobile`; the header CTA (`studio-room-mobile-primary-cta`)
  still renders at the top of the room. Desktop viewport emits neither
  sticky variant — only the header CTA.
- Service cards now surface `priceLabel` and `durationLabel` chips.
- Proof cards now surface `attribution` and `source` lines under the quote.
- Credential objects now surface `issuer` and `detail` next to the badge.
- Focus-visible outlines added for all rendered links and buttons.
- Lazy `loading="lazy"` added to inline `<img>` tags.
- Overflow guards, max-width guards, and `data-reduced-motion="true"`
  cascade rules retained.

### Per-kit visual differentiation summary

| Kit                              | Treatment focus                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `gallery-artist`                 | Editorial: larger heading display, generous gallery padding, work / image cards strip their frame so the media leads, quieter outline-style CTA. |
| `cultural-community-artist`      | Archive pacing: each chamber gets a left accent rail, chamber titles carry an "Archive ·" eyebrow, proof cards inherit the accent rail, partnership CTA uses accent-on-surface inversion. |
| `material-tradie-proof-card`     | Practical proof: tighter card radius, service cards bordered with accent, price/duration chips use accent fill, primary CTA and sticky CTA become bold accent buttons with 52px tap targets. |
| `healing-practitioner`           | Calm trust: softer borders, larger card radii (28px / 22px), gentler heading weight, accent-tinted badges, accent-on-surface buttons with subtle shadow. |
| `consultant-contractor`          | Crisp advisory: sharp 4–6px radii, no shadow on chambers, monoline buttons, smaller more disciplined hero title, ink-on-surface chips. |

All differentiation is delivered through deterministic CSS keyed off
`data-template-kit-id` — no runtime branching, no per-kit React components,
no extra dependencies.

## Accessibility / reduced-motion notes

- `:focus-visible` outlines on all rendered links and buttons.
- All clickable CTAs and inspector action buttons have a minimum 48px
  (52px for kit-tradie / kit-healing primary CTAs) touch target.
- `data-reduced-motion="true"` cascade rule strips animations, transitions,
  and smooth scroll for any room whose theme motion is `still` or whose
  renderer config opts in. Verified live for `consultant-contractor`
  (theme motion `still`).
- Inspector `aria-pressed` set on viewport-toggle and object-list selection,
  `aria-expanded` on chamber rows, `aria-label` on viewport buttons,
  `aria-label="Inspector breadcrumb"` on the breadcrumb nav, and `<legend>`
  used for each field group.
- Inline `<img loading="lazy">` keeps the rendered room from blocking the
  initial paint on mobile.
- Mobile-friendly editor shell: a `studio-room-editor-mobile-tabs` toggle
  switches between Preview and Inspector below the `xl` breakpoint; on
  `xl+` desktop the three-column layout is preserved.

## Validation results

All commands run from `Flora_fauna/presence-app/` on 2026-05-30.

| Command                                                                 | Result      |
| ----------------------------------------------------------------------- | ----------- |
| `npx tsx --test lib/presence/studio-room/studioRoomEditingPolish.test.ts` | 23 / 23 pass |
| `npx tsx --test lib/presence/studio-room/*.test.ts`                     | 82 / 82 pass |
| `npx tsx --test lib/presence/uniqueness.test.ts`                        | 1 / 1 pass   |
| `npx tsx --test lib/presence/render/publicPayload.test.ts ...`          | 13 / 13 pass |
| `npx tsc --noEmit`                                                      | exit 0       |
| `npm run build`                                                         | Compiled successfully; 29 / 29 static pages generated |
| `npx playwright test presence-studio-room-owner-lifecycle --project=chromium` | 1 / 1 pass (5.1s) |
| `npx playwright test presence-studio-room-owner-lifecycle --project=firefox`  | 1 / 1 pass (6.1s) |
| `npx playwright test presence-studio-room-owner-lifecycle --project=webkit`   | 1 / 1 pass (6.4s) |

### No public route mutation

`Grep` of `app/(public)/**` for `StudioRoomOwnerEditorShell`,
`StudioRoomCanvas`, `studioRoomTemplates`, `templateDrafts`, and
`from-template-kit` returned no matches.

### No publish flow added

`Grep` of `components/presence-studio/StudioRoomOwnerEditorShell.tsx` for
`publishPresenceEditorDraft`, `data-testid="studio-room-publish*`, and
`Publish draft` returned no matches. The shell still includes the
"No publish action exists in this shell." reassurance copy.

### No runtime AI / LLM additions

`Grep` of `lib/presence/studio-room/**` and
`components/presence-studio/**` for
`openai|anthropic.com|claude-|llm|chatgpt|gpt-4|gpt-5|cohere|mistral|bedrock|gemini`
returned matches only inside test files asserting absence.

### No broad / private contact mapping

`Grep` of `components/presence-studio/**` for `contactEmail`,
`contactPhone`, `public_email`, `public_phone`, `ownerEmail`, `authEmail`,
`owner_user_id`, `auth_subject` returned no matches. References inside
`lib/presence/studio-room/**` are restricted to:

- `sanitize.ts` blocklist,
- `adapters/fromEditableConfig.ts` (only explicit `public_email` /
  `public_phone` allow-list),
- `assessment.ts` / `realRoomComparison.ts` (internal scoring only),
- and the existing test suite asserting absence in saved drafts.

## Remaining limitations

- Image upload, focal-point control, and media-embed editing remain
  intentionally out of scope for this pass — the renderer surfaces image
  fallback and lazy loading, but the inspector does not yet expose an
  image picker. Existing media flow remains the source.
- The owner inspector cannot yet add wholly new chambers or new object
  types — duplicate/reorder/hide operates on existing TemplateKit-seeded
  objects only. This keeps the deterministic safety guarantees of the
  TemplateKit-staged draft contract intact.
- Sticky mobile CTA layout is rendered in the canvas using `position:
  sticky`; in the canvas's contained viewport it sits at the bottom of the
  rendered article rather than overlaying the device. This is the expected
  behaviour while there is no public Studio Room route.
- Cross-browser smoke is run with the local mock backend; no hosted
  testing was performed in this pass per scope.

## Recommended next passes

- **A) Claude Design elevation** — wire a deterministic, server-only,
  design-token-driven typography and palette pass so the kits feel even
  more crafted without introducing runtime AI.
- **B) Hosted owner lifecycle smoke** — extend the cross-browser smoke to
  a hosted preview environment so the kit-distinct CSS, sticky mobile CTA,
  and mobile tabs are exercised in a real browser at real viewports.
- **C) Deterministic Studio Guide** — author a deterministic, content-only
  "next best step" panel inside the inspector to help non-technical
  owners complete required fields without any runtime model calls.
- **D) Multi-kit browser lifecycle smoke** — replay the lifecycle smoke
  for each of the five primary kits to confirm that the kit-distinct
  treatments hold up across kit selection, edit, save, reload, and public
  isolation.
