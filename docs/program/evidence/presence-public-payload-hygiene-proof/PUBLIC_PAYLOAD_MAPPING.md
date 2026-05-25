# Public Payload Mapping

## Before

The anonymous room Server Component fetched the published room and rendered:

```tsx
<PortfolioRenderer node={node} />
```

`PortfolioRenderer` is a client component. Next.js therefore serialised the entire published `PresenceNode` into its public hydration stream. Published values were safe for display, but the nested editor contract names were visible in page source.

## After

The anonymous route now constructs:

```ts
const publicPayload = createPublicRenderPayload(node);
```

The mapper:

1. Calls `resolveRenderModel(node, "published")` before data crosses into client rendering.
2. Creates an allow-listed `PresenceNode` containing only public display fields needed by existing renderers.
3. Recursively removes restricted internal/control field keys from permitted nested public values such as metadata.
4. Passes the display node and the already-resolved published model to client rendering.

Applied boundaries:

- `/p/[slug]`
- `/presence/[slug]`, which re-exports the same public page
- GGM `/p/[slug]/works/[workId]` client rendering path
- RoomKey client rendering after its published response is resolved

## Rendering Preservation

- GGM published editor values are materialised into `PresenceRenderModel` before stripping.
- Image URLs and alt text are retained in `renderModel.hero` and `renderModel.works`.
- Palette, typography and effective motion are retained in the published render model.
- Non-GGM public DNA continues to receive allow-listed node fields and existing public metadata needed for its public display.

## Deliberate Boundary

This pass cleans anonymous Next.js page HTML/hydration. It does not rename the backend published JSON response contract. RoomKey still resolves its existing published-only endpoint before creating a clean render node in the browser. A backend public DTO migration is a separate compatibility-sensitive pass if network-response field-name hygiene becomes a release requirement.
