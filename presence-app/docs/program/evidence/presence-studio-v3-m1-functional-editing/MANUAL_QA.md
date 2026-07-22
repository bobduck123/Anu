# Studio V3 M1 manual QA

Status: final rendered inspection complete; prescribed human/manual matrix remains partial
Date: 2026-07-22
Environment: local Next.js + local mock API; no hosted/database write

## Rendered inspection

- The in-app browser opened `/studio/29/editor`, confirmed the expected BBB owner/editor identity and a meaningful rendered DOM. Its read-only safety boundary cannot seed the local V3 pilot flag, so it correctly remained on the V2 fallback and was not used to claim V3 interaction coverage.
- The repository Playwright harness then supplied the supported sanitized auth/pilot setup and exercised the implemented V3 flow. This fallback reason is explicit: V3 selection requires local storage setup that the in-app browser intentionally does not mutate.
- The canonical 23/23 Chromium run and focused publish-free recaptures produced the final 18-scenario evidence set. All PNGs decode and produce 17 unique full SHA-256 values; the two public alias captures are intentionally byte-identical. Visual review confirmed the changed copy in screenshot 02, the settled Upload/Create state without a rendering transient in screenshot 11, the bottom-anchored 390x844 action bar in screenshot 14, and the bridge-free edited visitor state in screenshot 16.

## Verified final interaction set

- copy change, immediate canvas result, exact cancel, private save, and reload;
- existing media selection and owner-private inventory upload using stable references only;
- real registered-zone movement, wrong-payload no-op, reorder, feature, visibility, unplace, exact cancel, and focus return;
- visual Look, Room Style, treatment, background, typography/CTA and motion choices;
- truthful Works, Collections, Room-native Pieces, Upload and disabled Create Work states;
- saving, success, failure/retry, stale conflict/reload, durable-disabled and memory-only messages;
- mobile bottom bar/edit/arrange, keyboard tab behavior, Escape, touch sizing and reduced motion;
- Test as visitor and both BBB public routes unchanged.

## Limitation

No hosted human-test URL, hosted database, production storage, hosted/production publish action, or real owner upload was exercised because this work order forbids deployment and hosted/public mutation. Evidence is deterministic local/mock proof for human review before any later hosted gate. An excluded earlier command reached only a local mock publish handler, caused no hosted/production mutation, and receives no evidence credit; see `VALIDATION_RECORD.md`.

No moderated first-time-owner five-second comprehension observation, screen-reader session, independent computed-contrast audit, or full 320/375/430/tablet/1440/200%-zoom matrix was performed. The automated 390x844 Chromium keyboard/touch/reduced-motion checks are not represented as substitutes for those human/manual acceptance rows.

Canonical acceptance is Chromium-only. The final 390x844 Chromium scenarios pass their target-size, keyboard/touch, reduced-motion, and overflow assertions. An exploratory WebKit dev/HMR run observed a 25px Edit-button height despite the scoped CSS declaring 44px; WebKit remains unverified and is recorded as follow-up rather than claimed evidence.
