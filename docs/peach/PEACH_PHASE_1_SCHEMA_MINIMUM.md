# PEACH Phase 1 Schema Minimum

## Purpose

This document defines the absolute minimum schema needed to launch one excellent PEACH Field. It separates what must be implemented, what can remain manual, what can be static content, what must not be manual, and what belongs in the future.

## Required For Launch

These records or structured equivalents must exist in the application foundation.

| Area | Minimum schema | Why required |
| --- | --- | --- |
| Field | `id`, `slug`, `title`, `status`, `visibility`, `short_description`, `primary_steward_id`, `season_label`, `support_copy`, `return_plan`, timestamps. | The Field is the central product object. |
| Seed | Field-associated `text`, `reason_for_now`, `tension_note`, approval/revision metadata. | Field cannot launch without a specific Seed. |
| Soil | Field-associated `summary`, `body`, visibility, source/safety notes. | Participants need context before contributing. |
| Vessels | Field-associated flexible `type`, `title`, `access_path`, `why_it_belongs`, `rights_note`, sort order. | Vessels are the entry points, not products. |
| Gatherings | Field-associated `title`, `format`, time/window, purpose, access details, status. | Phase 1 needs interpretive moments. |
| TendingPrompts | Field-associated prompt text, accepted contribution types, consent note, review note, status. | Contributions need structure. |
| Contributions | Field/contributor association, type, body/file/link, review status, visibility preference, credit preference, consent level, Yield permission, sensitive flag. | PEACH cannot safely gather culture without structured records. |
| Contributors | Chosen credit and contact method where required. | Follow-up, credit, withdrawal, and rights need a contact/credit path. |
| ConsentRecords | Contribution association, consent level, visibility, credit, Yield permission, consent text version, status, timestamp. | Consent must be tied to each Contribution. |
| Stewards | Steward identity, role, status, public contact path. | Every public Field requires accountable stewardship. |
| Yield | Field association, title, format, description, status, maker/steward, release target/artifact. | Phase 1 must produce a cultural work. |
| CommonsEntry | Field/Yield association, summary, Seed, context, credits, consent summary, artifact/source trail, Return date/status. | Return completes the PEACH loop. |
| Audit events | Actor, action, object type/id, before/after or summary, timestamp. | Status, consent, review, and Return need accountability. |

## Can Be Manual At Launch

These can be handled outside native product code if there is still a reliable record.

| Area | Manual allowance | Required record |
| --- | --- | --- |
| Payment settlement | External links, invoice, or manual transfer. | SupportTransaction metadata must still be recorded. |
| Revenue split/allocation | Spreadsheet/manual accounting. | Amount, support path, Field/Yield association, use category, receipt/reference. |
| Sponsor onboarding | Email/manual agreement. | Sponsor name, contact, support path, editorial-independence acceptance, acknowledgement preference. |
| Access sponsorship allocation | Manual steward allocation. | Funded count/amount, used count, non-identifying beneficiary notes. |
| Yield production | Manual editing/design/publishing. | Yield status, artifact link, consent/credit checklist. |
| Commons formatting | Static page or manually assembled entry. | CommonsEntry structure must be complete. |
| Email sends | Manual email or external tool. | FieldUpdate/support/contribution confirmation should be recorded or reproducible. |
| Rights checks for Vessels | Steward review outside system. | Rights/access note must be stored on Vessel. |

## Can Be Static Content At Launch

| Area | Static acceptable form | Boundary |
| --- | --- | --- |
| Home | Static page pointing to active Field and PEACH canon. | Must not become generic marketing or ecommerce homepage. |
| About/canon | Static page generated from canon docs. | Must preserve Field primitive. |
| Membership/support explanation | Static copy plus external/manual support links. | Must state what support funds. |
| Initial Vessels | Static seeded data or content file. | Must still use Vessel shape, not product cards. |
| Initial Field copy | Static or seeded content. | Steward needs a path to edit before launch. |
| Commons page before Return | Static "planned Commons" or empty state. | Must not claim Return is complete. |

## Must Not Be Manual

These cannot rely only on informal memory, private chat, or scattered documents.

| Area | Reason |
| --- | --- |
| Contribution consent | Each Contribution must have structured consent level, credit preference, visibility preference, Yield permission, and consent text version. |
| Contribution review status | Public/Yield use depends on reviewed state. |
| Contributor credit preference | Wrong credit can create harm and break trust. |
| Withdrawal/takedown request state | PEACH needs a reliable process for stopping future use. |
| Public/private visibility on Contributions | Accepted does not mean public. |
| Field status | Public pages and actions depend on lifecycle state. |
| Yield release checklist | Consent/credit/accessibility checks gate release. |
| Commons Return checklist | Return must not include private or unconsented material. |
| Steward accountability | Review and publication actions need an actor. |

## Future Only

| Area | Why future-only |
| --- | --- |
| Multiple Orchards | Phase 1 proves one PEACH Orchard. |
| Many simultaneous Fields | Phase 1 proves one excellent Field. |
| Full public user profiles | Not needed and increases privacy risk. |
| Social feed, comments, likes, follows | Conflicts with reviewed contribution model. |
| Ecommerce product catalogue/cart | Misaligns PEACH with bookstore/storefront anti-patterns. |
| Affiliate bookstore integration | Not Phase 1 revenue model. |
| Automated moderation as primary safety | Steward review is required. |
| Sponsor portal with private data | Sponsors must not access private Contributions. |
| Complex rights/licensing marketplace | Not needed for first Yield. |
| Native payment/subscription engine | External/manual support can work first if metadata is captured. |

## Explicit Launch Minimum

Phase 1 launch is viable when:

- one Field can be publicly read;
- a steward can edit Field, Seed, Soil, Vessels, Gatherings, prompts, Yield, and Return plan;
- a contributor can submit a Contribution with structured consent;
- a steward can review the Contribution before any public/Yield use;
- support can be recorded with values-aligned metadata;
- a Yield can be released;
- a CommonsEntry can be published with consented material and credits.

Books must be represented as Vessels, not products.

