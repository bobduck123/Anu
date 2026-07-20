# Presence Studio V2 — Editor Mount Plan

**Purpose:** Step-by-step instruction for mounting the V2 editor shell into the real `presence-app` editor route.  
**Prerequisite:** `PRESENCE_STUDIO_V2_KIMI_READINESS_PACKET.md` Phase A (adapter hardening) must be complete.  
**Outcome:** A pilot-eligible room can open the V2 editor, load its draft, make a trivial edit, save, and reload with persistence.

---

## Step 0: Verify Prerequisites

Run these commands. All must pass before proceeding:

```bash
cd /c/Dev/Flora_fauna/presence-app
npx tsx --test lib/presence/studio-v2/studioV2Adapters.test.ts
npx tsx --test lib/presence/render/publicPayload.test.ts
npm run typecheck
npm run build
```

If any fail, stop. Fix Phase A first.

---

## Step 1: Add V2 Branch to Editor Route

**File:** `app/(studio)/studio/[id]/editor/page.tsx`

Add the import:

```tsx
import { shouldUsePresenceStudioV2 } from "@/lib/presence/studio-v2/feature";
```

After `useOwnerNode` resolves, compute eligibility:

```tsx
const isV2Enabled = shouldUsePresenceStudioV2({
  roomId: nodeId,
  slug: node?.slug,
  rendererKey: node?.renderer_key,
  config: node?.editable_config,
  node,
});
```

In the return, branch:

```tsx
return (
  <StudioShell node={node}>
    {isV2Enabled ? (
      <PresenceStudioV2Editor
        node={node}
        nodeId={nodeId}
        token={token}
        onNodeReload={reload}
      />
    ) : (
      <PresenceStudioEditorApp
        node={node}
        nodeId={nodeId}
        token={token}
        onNodeReload={reload}
      />
    )}
  </StudioShell>
);
```

**Do not modify `PresenceStudioEditorApp.tsx`.** Non-V2 rooms must use the exact same code path as before.

---

## Step 2: Create Minimal V2 Editor Shell

**File:** `components/presence-studio-v2/PresenceStudioV2Editor.tsx`

This first version only needs to:
1. Load the V2 state from the existing draft.
2. Display the room title (editable).
3. Save the changed title back to the draft.
4. Show loading, error, dirty, and saving states.

### Props interface

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PresenceNode } from "@/lib/api/types";
import { getPresenceEditor, patchPresenceEditorDraft, createPresenceEditorDraft } from "@/lib/api/editor";
import { studioV2FromPresenceConfig, presenceConfigFromStudioV2State } from "@/lib/presence/studio-v2";
import type { StudioV2State } from "@/lib/presence/studio-v2";

interface PresenceStudioV2EditorProps {
  node: PresenceNode;
  nodeId: number;
  token: string;
  onNodeReload?: () => Promise<void> | void;
}
```

### State shape

```tsx
export default function PresenceStudioV2Editor({ node, nodeId, token, onNodeReload }: PresenceStudioV2EditorProps) {
  const [v2State, setV2State] = useState<StudioV2State | null>(null);
  const [baseSnapshot, setBaseSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const dirty = useMemo(() => Boolean(v2State && snapshot(v2State) !== baseSnapshot), [v2State, baseSnapshot]);
```

### Load effect

```tsx
  const loadEditor = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const overview = await getPresenceEditor(nodeId, token);
      const config = overview.draft ?? overview.published ?? overview.suggested_config;
      const state = studioV2FromPresenceConfig(config, node);
      setV2State(state);
      setBaseSnapshot(snapshot(state));
      setHasDraft(Boolean(overview.draft));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load draft");
    } finally {
      setLoading(false);
    }
  }, [node, nodeId, token]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);
```

### Save function

```tsx
  async function saveDraft(nextState: StudioV2State | null = v2State): Promise<boolean> {
    if (!nextState) return false;
    setSaving(true);
    setActionError(null);
    try {
      const payload = presenceConfigFromStudioV2State(nextState, null);
      const response = hasDraft
        ? await patchPresenceEditorDraft(nodeId, token, payload)
        : await createPresenceEditorDraft(nodeId, token, payload);
      const savedConfig = response.draft;
      const savedState = studioV2FromPresenceConfig(savedConfig, node);
      setV2State(savedState);
      setBaseSnapshot(snapshot(savedState));
      setHasDraft(true);
      setNotice(hasDraft ? "All changes saved to your draft room." : "Draft room created. All changes saved.");
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }
```

### Snapshot helper

```tsx
function snapshot(state: StudioV2State): string {
  return JSON.stringify(state);
}
```

### Minimal UI

```tsx
  if (loading) {
    return <div className="presence-studio-v2 p-8 text-center">Loading V2 editor...</div>;
  }

  if (loadError || !v2State) {
    return (
      <div className="presence-studio-v2 p-8">
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">V2 editor failed to load</p>
          <p className="text-sm">{loadError}</p>
          <button onClick={() => void loadEditor()} className="mt-2 rounded-lg bg-red-100 px-3 py-1 text-sm hover:bg-red-200">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="presence-studio-v2">
      {/* Status bar */}
      <div className="flex items-center gap-3 border-b border-[#dfd4c5] bg-[#f5f0e8] px-4 py-2 text-sm">
        <span className="font-semibold text-[#302921]">Studio V2</span>
        {dirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Unsaved changes</span>}
        {saving && <span className="text-[#6e6256]">Saving...</span>}
        {notice && <span className="text-green-700">{notice}</span>}
        {actionError && <span className="text-red-700">{actionError}</span>}
        <button
          onClick={() => void saveDraft()}
          disabled={saving || !dirty}
          className="ml-auto rounded-lg bg-[#302921] px-4 py-1.5 text-sm text-white disabled:opacity-40"
        >
          Save draft
        </button>
      </div>

      {/* Minimal edit surface — room title only */}
      <div className="p-6">
        <label className="block text-sm font-medium text-[#302921]">Room title</label>
        <input
          type="text"
          value={v2State.title}
          onChange={(e) => {
            setV2State((current) => current ? { ...current, title: e.target.value } : null);
            setNotice(null);
            setActionError(null);
          }}
          className="mt-1 w-full rounded-xl border border-[#dfd4c5] bg-white px-3 py-2 text-[#302921]"
        />
        <p className="mt-4 text-xs text-[#6e6256]">
          This is the minimal V2 editor mount. The full world renderer, panels, and object editing will be added in the next pass.
        </p>
      </div>
    </div>
  );
}
```

**Critical:** This component must NOT contain any `localStorage` reads or writes.

---

## Step 3: Create Scoped CSS Root

**File:** `components/presence-studio-v2/presence-studio-v2.css`

Create the file with a single root class declaration. All future V2 CSS will be scoped under `.presence-studio-v2`.

```css
.presence-studio-v2 {
  /* Root scope for all V2 styles */
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #302921;
  background: #f5f0e8;
}
```

Import it in `PresenceStudioV2Editor.tsx`:

```tsx
import "./presence-studio-v2.css";
```

---

## Step 4: Verify the Branch Works

1. **Non-V2 room (control):**
   - Ensure `NEXT_PUBLIC_PRESENCE_STUDIO_V2=0` or room is not in pilot list.
   - Open `/studio/{non-v2-room-id}/editor`.
   - Confirm existing `PresenceStudioEditorApp` renders exactly as before.

2. **V2 room (test):**
   - Set `NEXT_PUBLIC_PRESENCE_STUDIO_V2=1`.
   - Set `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS={your-test-room-id}`.
   - Set the room's `renderer_key` to `"presence-studio-v2-room"` (or ensure its config has V2 nested keys).
   - Open `/studio/{test-room-id}/editor`.
   - Confirm `PresenceStudioV2Editor` renders with the title field.
   - Edit the title.
   - Click "Save draft".
   - Reload the page.
   - Confirm the edited title persists.

3. **Typecheck and build:**
   ```bash
   npm run typecheck
   npm run build
   ```

---

## Step 5: Add Mount Evidence Test

**File:** `lib/presence/studio-v2/studioV2Adapters.test.ts` (or new `presenceStudioV2EditorMount.test.ts`)

Add a test that proves the integration contract:

```ts
test("V2 editor can load, mutate title, and produce a saveable config payload", async () => {
  const state = studioState(); // from existing test fixture
  const updated = { ...state, title: "Updated Studio Title" };
  const payload = presenceConfigFromStudioV2State(updated, null);

  assert.equal(payload.renderer_key, "presence-studio-v2-room");
  assert.ok(payload.content_config?.studio_v2);
  assert.equal((payload.content_config as Record<string, unknown>).studio_v2?.title, "Updated Studio Title");

  // Round-trip
  const roundTripped = studioV2FromPresenceConfig(payload as PresenceEditableConfig, node());
  assert.equal(roundTripped.title, "Updated Studio Title");
});
```

---

## Rollback Procedure

If anything breaks:

1. Set `NEXT_PUBLIC_PRESENCE_STUDIO_V2=0`.
2. All rooms instantly fall back to `PresenceStudioEditorApp`.
3. V2 drafts remain in `editable_config` nested sections but are ignored by the legacy editor.
4. No data loss — the V2 config is safely stored inside `scene_config`, `style_dna`, etc. under the `studio_v2` key.

---

## Next Pass After This Mount

Once this mount is verified:

1. Port `PresenceStudioV2Room.tsx` — the world renderer from the prototype.
2. Port `PresenceStudioV2Panels.tsx` — Skin Lab, object editor, add object, moodboard.
3. Add auto-save debounce to `PresenceStudioV2Editor`.
4. Wire preview and publish buttons.
5. Add public renderer dispatch.
