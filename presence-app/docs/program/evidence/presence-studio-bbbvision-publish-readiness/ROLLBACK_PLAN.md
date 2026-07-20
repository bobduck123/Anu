# Rollback plan for eventual BBB publish/migration action

## If publish is later approved, expected change

The separate publish/migration action may update BBB public publication state and/or migrate the approved persisted draft into the public rendering path, depending on the final scoped publish work order.

Expected target remains:

- room: `29`;
- slug: `bbbvision`;
- title: `bbb.vision`;
- public routes: `/p/bbbvision` and `/presence/bbbvision`.

## What must not change

The publish task must not change unless separately scoped and approved:

- owner binding;
- tenant/control-plane logic;
- authentication logic;
- payment logic;
- deployment configuration;
- domain binding;
- slug;
- title;
- unrelated Presence records;
- unrelated BBB media/content.

## Rollback method

Before the publish/migration action:

1. Capture current owner/editor/public state for room `29`.
2. Capture current public route statuses and screenshots.
3. Capture the exact fields that the publish task will mutate.

If rollback is required:

1. Restore only the captured prior values for the fields changed by the publish task.
2. Do not alter content, owner, tenant, slug, title, domain, analytics, enquiries, or media unless those were explicitly changed by the publish task and captured before mutation.
3. Verify the restored backend state through the same owner/control mechanism used by the publish task.
4. Recheck public routes with no-cache browser requests.

## Rollback verification routes

- `/p/bbbvision`
- `/presence/bbbvision`
- `/studio/29/editor`
- `/studio/29/editor/preview`

## Rollback evidence required

- route/status matrix before publish;
- route/status matrix after publish;
- route/status matrix after rollback if rollback is used;
- screenshots of canonical and legacy public routes after rollback;
- confirmation that no unrelated Presence node changed.
