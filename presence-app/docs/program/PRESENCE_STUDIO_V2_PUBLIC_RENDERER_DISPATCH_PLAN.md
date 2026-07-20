# Presence Studio V2 — Public Renderer Dispatch Plan

**Status:** Design document (Phase B). Implementation deferred to Phase D (after editor save/reload verified).  
**Last updated:** 2026-05-31  
**Author:** Kimi agent via public renderer seam audit  

---

## 1. Problem Statement

`studioV2Room` is computed inside `createPublicRenderPayload()` and included in the `PublicRenderPayload` type, but **no renderer in the production tree consumes it**. The data flows into a dead branch.

### Current data flow (V2 data silently dropped)

```
app/(public)/p/[slug]/page.tsx
  └─ createPublicRenderPayload(node)
       └─ shouldUsePresenceStudioV2({ roomId, slug, rendererKey, config, node })
       └─ studioV2FromPresenceConfig(node.editable_config, node)
       └─ publicRoomFromStudioV2State(studioState)
       └─ returns { node, renderModel, studioV2Room }
  └─ <PortfolioRenderer node={publicPayload.node} renderModel={publicPayload.renderModel} />
       └─ <PresenceDnaRenderer node={node} renderModel={renderModel} />
            └─ customKey check (GGM only)
            └─ Pass 3 world dispatch → gallery_room, sound_room, material_studio
            └─ Pass 1/2 blueprint chain → editorial_identity, nocturnal_sonic, ...
            └─ ❌ studioV2Room never received as a prop
```

### What is lost

The public payload contains:
- `schemaVersion`, `rendererKey`, `roomId`
- `skin` (CSS variable overrides)
- `cta` (title, subtitle, primary/secondary actions)
- `chambers[]` (public-visible objects with transforms)
- `moodboardRefs[]` (public-safe image references)
- `traces` (demo-safe disclosure)
- `mobileRecovery` (transform suspension state)

All of this is computed, sanitized, and then discarded at the renderer boundary.

---

## 2. Where the Dispatch Branch Must Live

There are **two candidate seams**. Only one is correct.

### Option A: Branch inside `PortfolioRenderer` (recommended)

Change `PortfolioRenderer` to accept an optional `studioV2Room` prop and dispatch before the `legacyMode` check.

**Why this is correct:**
- `PortfolioRenderer` is the established public rendering authority.
- It already decides between DNA and legacy routes.
- The public page (`p/[slug]/page.tsx`) is a server component that calls `createPublicRenderPayload`; it has `studioV2Room` available.
- Minimal disruption to `PresenceDnaRenderer`, which is already complex.

### Option B: Branch inside `PresenceDnaRenderer`

Add a V2 short-circuit before or after the GGM custom-renderer check.

**Why this is less correct:**
- `PresenceDnaRenderer` is the *DNA* authority. V2 is not DNA; it is a parallel, independently authored renderer.
- Mixing V2 dispatch into DNA's inference chain creates conceptual confusion.
- `PortfolioRenderer` is the better abstraction layer for renderer selection.

---

## 3. Exact Prop Changes

### 3.1 `app/(public)/p/[slug]/page.tsx`

```tsx
// CURRENT (studioV2Room discarded)
const publicPayload = createPublicRenderPayload(node);
return (
  <PortfolioRenderer
    node={publicPayload.node}
    renderModel={publicPayload.renderModel}
  />
);

// TARGET (studioV2Room passed through)
const publicPayload = createPublicRenderPayload(node);
return (
  <PortfolioRenderer
    node={publicPayload.node}
    renderModel={publicPayload.renderModel}
    studioV2Room={publicPayload.studioV2Room}
  />
);
```

### 3.2 `PortfolioRenderer` props

```tsx
interface PortfolioRendererProps {
  node: PresenceNode;
  legacyMode?: boolean;
  renderMode?: RenderMode;
  renderModel?: PresenceRenderModel;
  // NEW — optional V2 public room data
  studioV2Room?: StudioV2PublicRoom;
}
```

### 3.3 `PortfolioRenderer` dispatch block

```tsx
export default function PortfolioRenderer({
  node,
  legacyMode = false,
  renderMode = "published",
  renderModel,
  studioV2Room,
}: PortfolioRendererProps) {
  // NEW: V2 short-circuit before DNA and legacy branches
  if (studioV2Room) {
    return <PresenceStudioV2Room node={node} room={studioV2Room} />;
  }

  if (!legacyMode) {
    return <PresenceDnaRenderer
      node={node}
      renderModel={renderModel ?? resolveRenderModel(node, renderMode)}
    />;
  }

  // ... legacy branches unchanged ...
}
```

### 3.4 `PresenceStudioV2Room` component (skeleton)

```tsx
"use client";

import type { PresenceNode } from "@/lib/api/types";
import type { StudioV2PublicRoom } from "@/lib/presence/studio-v2/model";

interface PresenceStudioV2RoomProps {
  node: PresenceNode;
  room: StudioV2PublicRoom;
}

export default function PresenceStudioV2Room({ node, room }: PresenceStudioV2RoomProps) {
  // Phase D: render from room.chambers, room.skin, room.cta, room.moodboardRefs
  return (
    <main
      className="min-h-dvh"
      style={{
        background: room.skin?.pageBackground ?? "var(--p-bg)",
        color: room.skin?.textColor ?? "var(--p-text)",
      }}
    >
      {/* Chamber renderer placeholder */}
      {room.chambers.map((chamber) => (
        <section key={chamber.id} aria-label={chamber.label}>
          {chamber.objects.map((obj) => (
            <div key={obj.id}>
              {/* Object renderer by type: text, image, link, embed, badge, divider, spacer */}
              {obj.type === "text" && <p>{obj.detail}</p>}
              {obj.type === "image" && obj.image && (
                <img src={obj.image} alt={obj.title || ""} />
              )}
              {/* ... */}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
```

---

## 4. Integration with Feature Flag

The V2 dispatch **must** gate on the same feature-flag logic used in the editor and public payload builder.

```ts
// Inside createPublicRenderPayload (already exists)
const studioV2Room = shouldUsePresenceStudioV2({
  roomId: node.id,
  slug: node.slug,
  rendererKey: node.renderer_key,
  config: node.editable_config,
  node,
})
  ? publicRoomFromStudioV2State(studioV2FromPresenceConfig(node.editable_config, node))
  : undefined;
```

Because `createPublicRenderPayload` already uses `shouldUsePresenceStudioV2`, the `studioV2Room` field is only present when the flag permits it. `PortfolioRenderer` simply checks `if (studioV2Room)` — no additional feature logic needed in the renderer.

---

## 5. What Must Happen Before This Is Implemented

| Prerequisite | Status | Blocker severity |
|---|---|---|
| V2 editor mounts and saves to `PATCH /owner/rooms/{roomId}/editor/draft` | ⏳ Phase B | **Hard** — without save, no V2 config exists to render |
| Editor reloads V2 state from saved config | ⏳ Phase B | **Hard** — without load, owner cannot author public content |
| At least one pilot room authored via V2 editor | ⏳ Phase B | **Hard** — need real data to test render path |
| Public payload sanitizers verified against real data | ✅ Done | None — `sanitize.ts` + `publicPayload.ts` tested |
| Feature flag `shouldUsePresenceStudioV2` tested in production guard mode | ✅ Done | None — empty-pilot + `NODE_ENV=production` returns false |

**Decision:** Do NOT implement the public renderer dispatch (this document) until the editor can successfully save and reload a V2 room configuration. Implementing the dispatch before the editor works creates a broken public path with no way to produce valid `StudioV2PublicRoom` data.

---

## 6. Risk Analysis

### Risk 1: Accidental V2 takeover of existing rooms

**Mitigation:** `shouldUsePresenceStudioV2` requires:
1. Global feature flag enabled (`NEXT_PUBLIC_PRESENCE_STUDIO_V2` or `PRESENCE_STUDIO_V2_ENABLED`)
2. Renderer key matches `presence-studio-v2-room` OR pilot list includes room
3. Production guard: empty pilot list + `NODE_ENV=production` = false

Existing rooms with renderer_key `ggm-faithful-room-v1` or generic fallback cannot trigger V2.

### Risk 2: Public payload leaks editor-only fields

**Mitigation:** Three layers:
1. `stripEditorStateFromStudioV2()` filters objects by `visibility.public`
2. `sanitizeStudioV2PublicPayload()` scans for `STUDIO_V2_PUBLIC_RESTRICTED_KEYS`
3. `removeRestrictedKeys()` in `publicPayload.ts` strips `locked`, `pinned`, `hiddenPublic`, `hiddenMobile`

### Risk 3: Unstyled V2 room renders on production

**Mitigation:** The skeleton component (`PresenceStudioV2Room`) must not be deployed until it has at least:
- World-specific CSS skin application
- Chamber layout (not just a vertical stack)
- Mobile transform recovery (`mobileRecovery.transformsSuspendedOnMobile`)
- Per-object type renderer mapping (text, image, link, embed, badge, divider, spacer)

---

## 7. Files to Touch When Implementation Begins (Phase D checklist)

| File | Change |
|---|---|
| `app/(public)/p/[slug]/page.tsx` | Pass `studioV2Room` to `PortfolioRenderer` |
| `components/portfolio/PortfolioRenderer.tsx` | Accept `studioV2Room` prop; add V2 short-circuit dispatch |
| `components/presence/PresenceStudioV2Room.tsx` | **NEW** — public V2 room renderer (skeleton → full implementation) |
| `lib/presence/render/publicPayload.ts` | No change — already produces `studioV2Room` |
| `lib/presence/studio-v2/feature.ts` | No change — flag logic already correct |
| `lib/presence/studio-v2/sanitize.ts` | No change — sanitizers already tested |

---

## 8. Testing Strategy for Phase D

1. **Unit:** `PortfolioRenderer` dispatches to V2 when `studioV2Room` prop is provided, to DNA when absent.
2. **Unit:** `PresenceStudioV2Room` renders all 8 world types without crashing.
3. **Integration:** Full round-trip: editor save → `createPublicRenderPayload` → `PortfolioRenderer` → `PresenceStudioV2Room` renders visible chambers only.
4. **e2e (Playwright):** Pilot room renders V2 layout; non-pilot room renders DNA layout unchanged.
5. **Security:** Confirm restricted keys never appear in page source (view-source check).

---

## 9. Summary

The public renderer dispatch seam is identified and documented. The correct insertion point is `PortfolioRenderer`, not `PresenceDnaRenderer`. The data flow requires only three prop-passing changes (page → PortfolioRenderer → new V2 component). All sanitization and feature-gating logic is already in place and tested.

**Do not implement until:** V2 editor saves and reloads successfully, and at least one pilot room contains authored V2 content.
