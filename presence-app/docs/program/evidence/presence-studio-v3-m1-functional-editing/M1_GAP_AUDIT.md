# Studio V3 M1 gap audit

Status: complete and reconciled to implementation
Audit date: 2026-07-22
Scope: gated BBB owner editor using sanitized local/mock evidence

| Human testing note | Pre-M1 behavior | M1 owner behavior | Work type | Disposition | Evidence |
|---|---|---|---|---|---|
| Copy/images/placements/colours not editable | Informational Piece sheet and partial Look staging | Live bounded copy/caption/CTA, reference-only media, placement, Look and facet editing | Frontend + strict private metadata | Implemented | Compiler/API tests; E2E copy/media/visual scenarios; shots 1-4, 8 |
| No click/drag manipulation | Selection only | Click/tap selection; the selected Piece can be dragged with a custom Studio MIME payload onto an explicit registered zone card; zone/reorder/feature/visibility keyboard and tap alternatives; exact cancel | Frontend | Bounded subset implemented; this is not freeform canvas dragging or nearest-safe-zone snap/clamp, and arbitrary coordinates are excluded | Direct-manipulation E2E; shot 5 |
| Rooms feel templated | Text-led controls and weak structural preview | Visual Look cards, composition miniatures, and visibly distinct Threshold/Gallery/Film Strip preview | Frontend | Implemented for registered choices | Visual/reduced-motion E2E; shots 6-8 |
| Bottom bar not functional | Partial actions | Contextual Edit, Arrange, Pieces and Look sheets with selected/disabled state and reasons | Frontend | Implemented | Desktop/mobile E2E; shots 1, 3, 5-8, 14-15 |
| Room Style does not visibly change direction | Structural choices insufficiently legible | Look changes atmosphere; Room Style changes bounded structure; Before/After, Apply and exact Cancel are explicit | Frontend | Implemented | Structural compiler/E2E coverage; shot 7 |
| BBB Pieces/Collections absent | Mixed loaded sources and synthetic grouping risk | All Room-native Pieces plus authorized Works and real canonical Collections, clearly labelled; no synthetic Collection | Frontend + owner reads | Implemented | Library E2E; shots 9-10 |
| No upload | Existing path attached media to draft/canonical workflows | Protected `inventory_only=1` private media record, stable ID only; capability-gated; canonical Create Work disabled | Backend + media/upload | Narrow upload implemented; Create Work deferred | Backend owner/public exclusion tests; upload E2E; shot 11 |
| No save result | Generic action text | Dedicated saving/saved/failed/conflict/memory-only/disabled states with retry and guarded reload | Frontend + existing V3 private state | Implemented | Save-state E2E; shots 12-13 |
| Presence Look lacks preview | Labels dominate | Visual swatches/miniatures with programmatic selected/preview state | Frontend | Implemented | Visual E2E; shot 6 |
| Motion/background not editable | Values mostly implicit | Registered surface, treatment, typography/CTA and motion cards apply immediately and respect locks/reduced motion | Frontend + private metadata | Implemented for supported tokens | Compiler/reduced-motion E2E; shot 8 |

## Data and migration conclusion

Canonical Works and Collections remain authoritative. Renderer-native Pieces are labelled as Room-native and are never written back as Works. The compiler persists only stable source/media references and bounded registered tokens. Missing, hidden, incompatible, duplicate, or unavailable sources remain private Shelf/accounting state and are excluded from public-shaped output.

No database migration is required for M1. The existing media-record migration and private storage capability are prerequisites for enabling inventory upload; environments without them receive an honest disabled state. The V3 private metadata envelope is extended backward-compatibly with optional `object_edits` and `layer_values` categories.

## Deferred boundary

- canonical Work creation and canonical Work-field mutation;
- canonical Collection membership/reorder and permanent Work deletion;
- crop/focal media transforms and Advanced Creative depth/layer transforms (both are visibly unavailable rather than fake controls);
- arbitrary coordinates or freeform HTML/CSS/script/URL input;
- automatic publish, draft replacement, rebase, or all-room enablement;
- a public renderer-family redesign.

The prescribed moderated-comprehension, screen-reader, independent contrast, and full viewport/zoom manual matrix also remains a follow-up evidence gate; see `ACCEPTANCE_TRACEABILITY.md` and `MANUAL_QA.md`.
