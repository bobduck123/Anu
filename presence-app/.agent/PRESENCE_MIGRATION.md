# PRESENCE_MIGRATION.md — Existing Presence to System-Native Build

## Purpose

Convert existing artist/cultural presences into the Presence system without losing their strongest qualities.

## Migration principles

1. Preserve the soul.
2. Do not redesign from zero.
3. Do not add architecture unless required.
4. Every migration should create a reusable archetype.
5. Every migration should produce screenshots and a case study.
6. Migration is proof and product development at the same time.

## System-native proof gate

A visual mock, copied frontend, or frontend fallback is a source reference, not a completed migration.

A migration can be called system-native only when:

```text
[ ] Content is represented by the actual Presence content model.
[ ] The intended Presence renderer/route renders that content.
[ ] Client/owner access uses the approved Studio boundary when access is in scope.
[ ] Save/reload persistence is demonstrated when persistence is in scope.
[ ] Mobile behaviour is verified.
[ ] Evidence distinguishes real data from any documented placeholder.
[ ] Public proof distinguishes persisted backend rooms from demo or fallback content.
```

This documentation task neither verifies nor changes runtime fallback behaviour. Production demo-fallback removal or disablement is deferred until a truthful persisted replacement exists and a separate task scopes and reviews it. Do not change fallback behaviour inside a migration task unless that separate work order explicitly approves it.

A local owner-shaped fixture can prove editor UX, payload handling, and renderer hygiene. It cannot satisfy the owner-access or real-record parts of this gate; those require a separately authenticated, read-safe hosted proof against the intended backend room.

## Studio working-state evidence rule

Private local Studio evidence may be captured for interaction, mobile, renderer-projection, and persistence regressions. Label it as local fixture evidence and keep it private. It does not establish a client owner session, a real node mapping, durable media migration, or a public launch claim.

An environmental/3D-style treatment can prove visual focus, motion policy, and editor/preview projection only when its camera/focus state is derived from existing room data and its semantic content stays usable without WebGL. It does not establish migration or replace the owner-bound proof gate.

Do not present a Style DNA control as complete unless the existing content model saves it and both the editor canvas and renderer projection visibly honour it. Remove or truthfully defer unsupported controls.

## Migration intake

```text
Project name:
Current URL/location:
Artist/org:
Permission status:
Assets available:
Current strengths:
Current weaknesses:
Public sensitivity:
Target archetype:
Migration priority:
```

## Component mapping

```text
Current element → Presence component

Hero:
Bio/story:
Media:
Links:
Events/projects:
Archive/timeline:
CTA:
Footer:
Other:
```

## Migration work order

```text
Title:
Goal:
Existing reference:
Target route:
In scope:
Out of scope:
Files likely involved:
Acceptance criteria:
Tests:
Manual QA:
Screenshots:
Case study update:
Review level:
```

## Acceptance criteria

```text
[ ] Route loads locally.
[ ] Mobile layout works.
[ ] Key content preserved.
[ ] Visual identity preserved or improved.
[ ] No unrelated routes broken.
[ ] No auth/tenant/payment changes.
[ ] Screenshot evidence captured.
[ ] Reusable archetype noted.
[ ] Proof library updated.
[ ] System-native proof gate satisfied; no frontend fallback is presented as migration evidence.
```

## Archetype extraction

After migration, identify:

```text
Archetype name:
Best for:
Required content:
Reusable components:
Visual rules:
Commercial offer fit:
```

Examples:
- Artist Signal Page;
- Release / Event Presence;
- Cultural Program Presence;
- Archive / Memory Presence;
- Campaign Presence.
