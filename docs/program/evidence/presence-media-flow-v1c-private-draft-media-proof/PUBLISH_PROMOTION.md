# Publish Promotion

## Implemented Flow

1. The owner selects a protected uploaded image in the Canvas.
2. Draft writes carry its `media_id`; the backend removes temporary signed URLs
   from persisted draft data.
3. The private image is visible only through owner/preview hydration.
4. On explicit publish, the backend finds selected protected media references.
5. It copies each selected original into the public published path.
6. It replaces that selected render reference with the public URL before the
   editable config changes to published.
7. Unselected protected uploads remain out of the public serialized config and
   become cleanup candidates.

## Safety Properties

- The prior live room remains unchanged until publish.
- The public config is never intentionally issued with a private draft read
  URL or private storage key.
- `attached_assets` remains editor inventory and is removed from preview/public
  render payloads.
- Public field-name hygiene also strips storage control names.

## Retained Limitation

Promotion is a public copy of the validated original, not an optimized display
derivative. A storage copy can exist without becoming linked if a later
database commit fails; the path is unlisted and the publish was explicitly
requested, but a fully transactional derivative lifecycle remains future work.
