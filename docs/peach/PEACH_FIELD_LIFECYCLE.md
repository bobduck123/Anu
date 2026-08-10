# PEACH Field Lifecycle

## Purpose

This document defines the operating lifecycle for a PEACH Field in Phase 1. A Field is not a post, book page, event, or store collection. It is a cultivated area of communal attention that moves from Seed to Return.

Phase 1 should support one excellent Field through this lifecycle, even if some operations remain manual.

## Lifecycle Diagram

```text
Draft
  -> Upcoming
  -> Open
  -> Tending
  -> Making
  -> Yielding
  -> Returned
  -> Archived/Dormant

Allowed rollback paths:
Upcoming -> Draft
Open -> Upcoming or Draft
Tending -> Open or Making
Making -> Tending
Yielding -> Making
Returned -> Archived/Dormant
Archived/Dormant -> Draft, only when revived as a new season or descendant Field
```

## Status Definitions

| Status | Meaning | Public visibility | Admin/steward permissions | Participant actions | Contribution state | Payment/support state | Commons state | Entry criteria | Exit criteria | Failure/rollback cases |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Draft | Steward is developing the Field. Seed, Soil, Vessels, Gatherings, prompts, consent, support, and Return plan are not yet public-ready. | Hidden by default. Preview allowed for internal reviewers. | Full edit, delete if no participant/support records, duplicate, preview, assign steward, set launch checklist. | None, unless private reviewer preview is enabled. | No public intake. Test entries only, clearly marked. | No public support. Internal budget notes allowed. | No Commons entry. Draft Return plan may exist. | Field record exists with title, draft Seed, steward, and status. | Required launch checklist passes for Upcoming. | Roll back from Upcoming if Seed weakens, consent copy missing, support copy misaligned, or steward ownership unclear. |
| Upcoming | Field is announced but not yet accepting full Tending. It invites attention, registration, support, or calendar holds. | Public page visible. Must show "Upcoming" and not imply active contribution if intake is closed. | Edit all Field content, schedule Gatherings, open/close interest forms, configure support, publish updates. | Read Seed/Soil/Vessels, register interest, save Gathering dates, support access/production if enabled. | Intake usually closed. Optional interest questions may be collected separately from Contributions. | Membership, one-off support, sponsor access, Field/Yield sponsorship, or institutional inquiry may be visible. | Return plan visible as future commitment. No Commons entry yet. | Draft checklist complete: Seed approved, Soil summary, at least 3 Vessels or placeholders, consent copy, steward, support path, Return plan. | Opening criteria met: Gathering schedule or Tending date confirmed, prompts ready, contribution intake tested. | Return to Draft if public framing is wrong, Field reads like event/book page, legal/consent risk appears, or launch date slips materially. |
| Open | Field is publicly open for entry, registration, orientation, early support, and initial participation. Tending prompts may be visible but not all active. | Public page visible and active. | Edit content, publish updates, enable prompts, manage registrations, revise non-material details, pause entry. | Register, read Vessels, attend available Gatherings, ask questions, support, prepare Contributions. | Intake may be partially open. Submitted Contributions enter pending review. | Support active. Access sponsorship must be available if advertised. | Return plan visible. No Commons entry. | Upcoming Field has confirmed entry path, support path, and at least one live or asynchronous Gathering. | Move to Tending when prompts and review workflow are active. | Roll back to Upcoming if prompts are not ready, steward unavailable, or contribution workflow fails. Pause support if copy becomes inaccurate. |
| Tending | Field is actively gathering interpretation, Contributions, and communal attention. | Public page visible. Prompts and contribution entry active. | Review Contributions, moderate, mark consent states, update prompts, publish updates, adjust Gathering details, pause/close prompts. | Submit Contributions, attend Gatherings, respond to prompts, ask consent questions, support access/production. | Pending, held, accepted, rejected, private, withdrawn, or selected-for-making. No unreviewed public display. | Support active. Funding progress may be shown if transparent and accurate. | Return plan visible; potential Yield direction may emerge. | At least one prompt open, consent flow live, steward review capacity confirmed. | Move to Making when sufficient material exists or Tending window closes. | Roll back to Open if contribution flow breaks. Extend Tending if material is insufficient. Move early to Making if safety or volume requires closure. |
| Making | Steward and makers are shaping selected material into the Yield. Contribution intake may be closed or limited. | Public page visible. Must state what is being made and whether contributions are closed. | Select material, confirm consent, edit Yield, manage credits, request follow-up, publish progress updates. | Read updates, support production, respond to follow-up, request withdrawal where process allows. New Contributions only if steward permits. | Selected, held, private, rejected, withdrawn, or needs-follow-up. Consent checks required before use. | Support may continue for production, contributor honoraria, archive, or access. No misleading "join active discussion" copy. | Draft Commons entry may be prepared internally. | Tending period closed or sufficient material selected; Yield definition approved. | Move to Yielding when Yield is release-ready and consent/credit checklist passes. | Roll back to Tending if Yield lacks enough material, consent fails, or new interpretation is needed. Hold if contributor dispute or rights risk appears. |
| Yielding | Yield is being released, exhibited, taught, performed, or published. | Public page features Yield release and acknowledgements. | Publish Yield, update release notes, finalize credits, manage corrections, prepare Commons Return. | Read/view/listen, share within permissions, attend release Gathering, support Return or future Fields. | Contributions used in Yield are locked to their consent records. Unused private material remains private. | Support may shift to preservation, Commons access, or future Fields. | Commons entry is in preparation or partially visible. | Yield complete enough for public release, consent/credit checks complete, steward approves. | Move to Returned when Commons requirements are met. | Roll back to Making for material errors, consent gaps, rights issues, or accessibility failures. |
| Returned | Yield and Field have entered the Commons with consent, attribution, source trail, and future-use notes. | Public Commons entry visible. Field page may redirect, mirror, or link to Commons entry. | Edit corrections, add teaching/resource links, mark descendant Fields, handle takedown requests, archive when inactive. | Access returned materials, use according to stated permissions, suggest future questions, request correction/takedown if contributor. | Public selected Contributions remain public within consent. Private/held/rejected material remains private. | Support may fund archive, teaching resources, or descendant Fields. No claim that funding changes the returned record. | Commons entry complete. | Yield released, Return checklist complete, consent honored, credits published, preservation path defined. | Move to Archived/Dormant when active attention ends. | Temporarily unpublish specific material if consent, safety, rights, or factual correction requires it. Do not erase audit trail. |
| Archived/Dormant | Field is no longer active but remains preserved, or is intentionally dormant until revived. | Visible if rights and consent allow. May be hidden if safety requires. | Maintain record, correct errors, handle takedown, create descendant Field, revive as new season only with clear status. | Read preserved public material, follow descendant links, submit correction or continuation interest if enabled. | No new Contributions unless revived. Historical private material remains restricted. | Support only for archive, preservation, or descendant work. | Commons entry preserved. | Returned Field no longer active, or Field is stopped without complete Return and archived with explanation. | Remains archived, or inspires a new Draft descendant Field. | If archived before Return, public page must explain why Yield/Return did not complete and what remains private. |

## Cross-Status Rules

- A Field must never display unreviewed Contributions publicly.
- A Field must never imply a Commons Return has happened before the Return checklist is complete.
- Support copy must match the current status and actual use of funds.
- Rollbacks must preserve audit history.
- Participant-facing status language must be plain: "Opening soon", "Taking contributions", "Making the Yield", "Returned to the Commons" is acceptable.
- Archived/Dormant is not failure by itself; it is failure only if the Field promised Return and then hid the result without explanation.

