# SECURITY_AND_PRIVACY.md — Sensitive Work Rules

## Purpose

Agents increase speed, but they also increase risk. This file defines hard boundaries for private data, donor/member information, legal/admin material, client work, and production systems.

## Sensitive classes

### Class A — Public safe

- public website copy;
- public screenshots;
- approved case studies;
- generic templates;
- public outreach.

### Class B — Client/private

- unpublished designs;
- client notes;
- private feedback;
- draft proposals;
- non-public URLs.
- GGM working proof and its proof pack;
- BBB assets and migration evidence until the approved publication task is completed.

### Class C — Sensitive operational

- donor/member data;
- CRM exports;
- supporter details;
- payment/tax logic;
- internal board/governance material;
- production credentials/config.

### Class D — Legal/admin sensitive

- police/court/legal documents;
- injury/medical material;
- private relationship/property details;
- solicitor correspondence;
- identity documents.

## Rules by class

### Class A

Agents may work normally.

### Class B

Agents may draft and analyse. Humans approve before publishing/sending.

### Class C

Agents may only work with anonymised or permissioned material. No live changes. No public claims. Human review required.

### Class D

Agents may organise and neutralise. No legal advice. No contact. No filing. Human/external professional review required where appropriate.

## Secrets and credentials

Never place secrets in prompts, markdown, issues, screenshots, or logs.

If secrets appear:
1. stop;
2. notify human;
3. remove from output;
4. recommend rotation if exposure may be real.

## Donor/member data

Do not expose names, emails, amounts, payment details, or personal histories in public artefacts.

When creating consulting proof:
- anonymise;
- aggregate;
- remove identifiable references;
- separate private operator notes from public summaries.

## Legal/admin language

Every legal/admin output must separate:

```text
Facts:
Evidence:
Disputed facts:
Inference:
Questions for lawyer/adviser:
Suggested neutral wording:
```

## Production systems

Agents may not deploy or change production configuration unless explicitly instructed.

High-risk areas:
- auth;
- tenancy;
- payments;
- routing;
- storage;
- environment variables;
- CRM integrations;
- email sending.

## Case study permission

Before publishing a case study, confirm:

```text
[ ] permission status known
[ ] identifying details approved
[ ] screenshots approved
[ ] no sensitive/private info visible
[ ] claims are accurate
```

GGM is explicitly excluded from publication. BBB has client approval to publish, but its unpublished assets remain Class B until a separately approved publication task passes review.
