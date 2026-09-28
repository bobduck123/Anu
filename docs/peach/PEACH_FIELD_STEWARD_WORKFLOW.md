# PEACH Field Steward Workflow

## Purpose

This document defines how a steward operates one Phase 1 Field. The workflow may be implemented with a simple admin interface, a trusted internal tool, or a semi-manual process, but the required decisions and records must exist.

## Steward Role

The steward is responsible for framing, care, moderation, consent, editorial decisions, support transparency, Yield completion, and Commons Return. The steward is not merely an event host or community manager.

## Workflows

| Workflow | Step-by-step steward action | Required fields | Validation rules | Expected user-facing result | Failure states | Audit/logging needs |
| --- | --- | --- | --- | --- | --- | --- |
| Create/edit Field | Create Field; add title; assign steward; set status Draft; add short description; save preview. | Field title; steward; status; short description. | Title not empty; steward assigned; status valid. | No public result until Upcoming. Preview available internally. | Field created without steward; duplicate active Field with same Seed; accidental public visibility. | Created by, created at, updated by, updated at, status changes. |
| Define/edit Seed | Write Seed; add reason-for-now; note tension/specificity; approve for launch. | Seed text; reason-for-now; tension note. | Seed cannot be vague topic label; must be under public display length; must point toward possible Yield. | Seed appears as primary Field framing. | Seed reads like book club theme, marketing slogan, or generic community prompt. | Seed revisions, approver, timestamp, material-change flag. |
| Add/edit Soil context | Add summary; add context sections; add safety/context notes; link sources where relevant. | Soil summary; context body; source notes if claims rely on sources. | Summary required before Upcoming; source/rights notes for quoted material. | Public context helps participants understand Field conditions. | Soil becomes manifesto, academic filler, or unsupported claims. | Content revisions; source note changes; public update if changed after Open. |
| Add/edit Vessels | Add Vessel; choose type; add title/source/access path; explain why it belongs; add rights note; reorder. | Title/label; type; access path or location; Field relevance; rights/access note. | At least 3 public Vessels before Open; books cannot be the only hard-coded Vessel type; rights note required. | Participants can enter the Field through curated sources. | Vessels become retail inventory; unavailable source; missing permission for displayed material. | Add/edit/remove history; rights note changes; order changes. |
| Schedule Gatherings | Add Gathering; set format/time/window; assign facilitator; connect to Seed, Vessels, prompts, or Yield. | Title; format; date/window; facilitator; purpose; access details. | At least two Gatherings or equivalent interpretive moments for Phase 1; cancellation requires update. | Public Field page shows interpretive moments. | Event detached from Field; unavailable facilitator; missing access details. | Created/updated/cancelled at; attendance/export if collected; cancellation reason. |
| Publish Field updates | Draft update; select visibility; connect to status/progress; publish. | Update title or label; body; Field ID; visibility; author. | Public updates cannot expose private Contributions; material corrections must be marked. | Visitors see steward progress, changes, or decisions. | Update leaks private material; update misstates support/Yield status. | Author, timestamp, prior version, visibility, correction flag. |
| Create Tending prompts | Write prompt; set accepted contribution types; add consent/safety note; set open/close state. | Prompt text; accepted types; consent note; review note; status. | Prompt must connect to Seed/Yield; sensitive prompts need private option; no trauma pressure. | Participants can submit structured Contributions. | Prompt too vague; coercive disclosure; unclear use of responses. | Prompt revisions; open/close times; material-change flag. |
| Review Contributions | Open review queue; inspect content; check consent; mark status; add steward note; request follow-up if needed. | Contribution ID; review status; reviewer; decision note; consent record. | No public use without consent; sensitive flag reviewed; files/links accessible; credit preference recorded. | Accepted material may inform Making; rejected/private remains hidden. | Unreviewed material published; consent mismatch; harmful material mishandled. | Reviewer, timestamp, decision, prior status, follow-up requests. |
| Mark accepted/held/rejected/private | Choose state; add reason; optionally notify contributor; apply visibility. | Review status; reason; visibility; notification status. | Accepted does not equal public; private cannot be used publicly; rejected remains retained only as policy allows. | Public page changes only if selected/public material is displayed. | Contributor expects publication from "accepted"; held material forgotten. | Status transition history; reason; notification log. |
| Manage consent and credit | Confirm consent level; set credit preference; record follow-up; update if contributor changes permission. | Consent level; credit display; contributor contact; withdrawal process. | Yield/public use requires matching consent; follow-up-required cannot publish until cleared. | Credits display correctly when material is public. | Wrong attribution; use exceeds consent; no contact path for required follow-up. | Consent version, steward, timestamp, contributor request, evidence/link to permission. |
| Define Yield | Name intended Yield; choose format; assign maker; define selection criteria; set target release. | Yield title; format; description; maker/steward; selection criteria; expected release. | Yield must be realistic for Phase 1 and tied to Field; cannot be just recap unless shaped as cultural work. | Field page shows what attention is becoming. | Yield too broad; no maker; no consent route for selected material. | Created/updated history; maker changes; scope changes. |
| Update Yield progress | Add progress note; update status; attach drafts/previews if allowed; flag blockers. | Progress status; note; updated by; public/private visibility. | Public previews must honor consent and rights; no false release claims. | Participants can see Making progress. | Private material in preview; missed timeline with no update. | Progress history; preview publication log; blocker notes. |
| Mark Yield as released | Final check; confirm consent/credit; publish Yield link/file/page; set Field status Yielding. | Yield artifact; release date; credit list; consent checklist; accessibility note. | No release if selected material lacks permission; required credits complete; artifact accessible. | Public page features Yield. | Rights dispute; inaccessible file; missing attribution. | Release approver; release timestamp; checklist result; artifact version. |
| Return Yield/Field to Commons | Complete Return checklist; create Commons entry; link Field/Yield; publish Return notes; set status Returned. | Commons entry; Return date; Field summary; Yield link; consent summary; credits; future questions. | Return cannot include private/held material; source trail and support note checked. | Field enters Commons and becomes reusable inheritance. | Return is only a link; consent gap; no preservation path. | Return approver; checklist; Commons entry version; post-return corrections. |
| Export/view records | Filter participant, support, contribution, consent, and Field records; export allowed data only. | Export type; date range; requester; purpose. | Exports exclude private data unless authorized; sensitive data flagged; retention policy followed. | No direct public result. Supports operations and reporting. | Overbroad export; private contribution leaked; support report misused. | Export requester, time, fields included, purpose, file retention/deletion status. |

## Review States

- Pending: submitted but not reviewed.
- Held: steward needs time, context, or follow-up.
- Accepted: may inform the Field within consent limits.
- Selected: intended for Yield, pending final consent/credit check.
- Rejected: not used.
- Private: steward-visible only.
- Withdrawn: removed from use according to withdrawal process.
- Published: visible in public Field, Yield, or Commons within consent.

## Minimum Phase 1 Admin Surface

Phase 1 can be simple, but it must let stewards edit Field content, manage status, view Contributions, record consent/credit, publish updates, define/release Yield, and complete Return. Anything not implemented must have a documented manual owner and record location.

