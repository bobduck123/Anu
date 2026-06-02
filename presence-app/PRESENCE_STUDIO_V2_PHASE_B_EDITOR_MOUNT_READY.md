# Presence Studio V2 — Phase B Editor Mount Ready

**Date:** 2026-06-03  
**Scope:** Minimal V2 editor shell mount — title edit, save, reload persistence only.  
**Status:** Inspected and ready for Codex implementation.  
**Constraint:** Do not port full prototype UI. Do not implement Wild Mode, Skin Lab, panels, room renderer, or public renderer.

---

## 1. Exact Route Branch Strategy

### File to modify

```
app/(studio)/studio/[id]/editor/page.tsx
```

### Current state (verified)

- Client component (`"use client"`)
- Uses `useOwnerNode(nodeId)` → returns `{ node, token, loading, error, authRequired, accessState, reload }`
- Renders `<PresenceStudioEditorApp node={node} nodeId={nodeId} token={token} onNodeReload={reload} />`
- **No V2 references exist in this file** (confirmed by grep)

### Exact branch to add

Add import at line 8 (after existing imports, before component):

```tsx
import { shouldUsePresenceStudioV2 } from "@/lib/presence/studio-v2/feature";
```

Add eligibility computation after `useOwnerNode` resolves (after line 13):

```tsx
const isV2Enabled = node && token
  ? shouldUsePresenceStudioV2({
      roomId: nodeId,
      slug: node.slug,
      rendererKey: node.renderer_key,
      config: node.editable_config,
      node,
    })
  : false;
```

Replace the return JSX (lines 34-38) with:

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

### Why this branch location is correct

| Concern | Verdict |
|---------|---------|
| Route is client component? | ✅ Yes — `"use client"` at top of file |
| V2 eligibility computable? | ✅ Yes — `node`, `nodeId`, `node.slug`, `node.renderer_key`, `node.editable_config` all available after `useOwnerNode` resolves |
| Token available? | ✅ Yes — `token` from `useOwnerNode` |
| Fallback preserved? | ✅ Yes — non-V2 rooms render exact same `PresenceStudioEditorApp` with identical props |
| Rollback possible? | ✅ Yes — set `NEXT_PUBLIC_PRESENCE_STUDIO_V2=0` or remove room from pilot list → instant fallback |

---

## 2. Exact File Codex Must Create

### New file

```
components/presence-studio-v2/PresenceStudioV2Editor.tsx
```

This is the **only** new component file needed for Phase B.

No CSS file needed yet (use inline Tailwind classes).
No `PresenceStudioV2Room.tsx` yet.
No `PresenceStudioV2Panels.tsx` yet.
No `presence-studio-v2.css` yet.

---

## 3. Exact Props Interface

```tsx
interface PresenceStudioV2EditorProps {
  node: PresenceNode;
  nodeId: number;
  token: string;
  onNodeReload?: () => Promise<void> | void;
}
```

**Source of truth:** Matches `PresenceStudioEditorAppProps` in `components/studio/editor/PresenceStudioEditorApp.tsx` (line 79-84).

---

## 4. Exact API Call Signatures

### Load draft

```tsx
import { getPresenceEditor } from "@/lib/api/editor";

const overview = await getPresenceEditor(nodeId, token);
// overview: PresenceEditorOverview
// overview.draft: PresenceEditableConfig | null
// overview.published: PresenceEditableConfig | null
// overview.suggested_config: Record<string, unknown> | null
```

**Source of truth:** `lib/api/editor.ts` line 32-37.

### Save draft (create vs patch)

```tsx
import { createPresenceEditorDraft, patchPresenceEditorDraft } from "@/lib/api/editor";

// DECISION: use overview.draft presence, NOT a local boolean
const response = overview?.draft
  ? await patchPresenceEditorDraft(nodeId, token, payload)
  : await createPresenceEditorDraft(nodeId, token, payload);

// response: PresenceEditorDraftResponse
// response.draft: PresenceEditableConfig | null
// response.created: boolean | undefined
```

**Source of truth:** `lib/api/editor.ts` line 46-66.  
**Verified:** The existing editor uses the exact same `overview?.draft ? patch : create` pattern (line 240-242 of `PresenceStudioEditorApp.tsx`).

### Save payload shape

```tsx
import { presenceConfigFromStudioV2State } from "@/lib/presence/studio-v2";

const payload = presenceConfigFromStudioV2State(v2State, existingConfig);
// payload: PresenceEditorConfigInput
```

**Source of truth:** `lib/presence/studio-v2/adapters.ts` line 64-172.  
**Key:** Pass `existingConfig` (the full `PresenceEditableConfig` from `overview.draft ?? overview.published`) as the second argument so the adapter preserves existing nested config keys.

---

## 5. Exact Load → State → Save Data Flow

```
1. getPresenceEditor(nodeId, token)
   → overview: PresenceEditorOverview

2. const sourceConfig = overview.draft ?? overview.published ?? overview.suggested_config

3. const v2State = studioV2FromPresenceConfig(sourceConfig, node)
   → StudioV2State

4. User edits title (mutates v2State via React setState)

5. On save:
   a. const payload = presenceConfigFromStudioV2State(v2State, sourceConfig)
   b. const response = overview.draft
        ? patchPresenceEditorDraft(nodeId, token, payload)
        : createPresenceEditorDraft(nodeId, token, payload)
   c. const savedConfig = response.draft
   d. const savedState = studioV2FromPresenceConfig(savedConfig, node)
   e. Update React state with savedState
   f. Update baseSnapshot with JSON.stringify(savedState)
```

---

## 6. Exact Dirty-State Model

Use the same pattern as the existing editor:

```tsx
const [baseSnapshot, setBaseSnapshot] = useState("");

// After loading:
setBaseSnapshot(JSON.stringify(v2State));

// Dirty computation:
const dirty = useMemo(
  () => Boolean(v2State && JSON.stringify(v2State) !== baseSnapshot),
  [v2State, baseSnapshot]
);
```

**Source of truth:** `PresenceStudioEditorApp.tsx` lines 159, 201.

---

## 7. Exact Error States

Mirror the existing editor's error pattern:

```tsx
const [loadError, setLoadError] = useState<string | null>(null);
const [actionError, setActionError] = useState<string | null>(null);
const [notice, setNotice] = useState<string | null>(null);
```

- `loadError`: shown when `getPresenceEditor` throws
- `actionError`: shown when save/preview/publish throws
- `notice`: shown on successful save

**Source of truth:** `PresenceStudioEditorApp.tsx` lines 163-169.

---

## 8. Exact Minimal Shell UI Specification

The Phase B shell is intentionally boring. It only needs:

1. **Loading state** — spinner + "Loading Studio V2..."
2. **Error state** — red card with retry button
3. **Status bar** — "Studio V2" label + dirty indicator + save button
4. **Title input** — single text field bound to `v2State.title`
5. **Notice/actionError banner** — green for success, red for error

No tabs. No panels. No world renderer. No object editing. No Skin Lab. No preview/publish buttons.

---

## 9. Exact Rollback Procedure

If anything breaks after mount:

1. Set `NEXT_PUBLIC_PRESENCE_STUDIO_V2=0` in environment
2. Or remove room ID from `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS`
3. Re-deploy (or restart dev server)
4. All rooms instantly fall back to `PresenceStudioEditorApp`
5. V2 config remains in `editable_config` nested sections but is ignored
6. No data loss — config is safely stored under `scene_config.studio_v2`, `content_config.studio_v2`, etc.

---

## 10. Risk Review — Mismatches Between Docs and Real Code

| Item | Doc Claim | Real Code | Verdict |
|------|-----------|-----------|---------|
| `patchPresenceEditorDraft` signature | `patchPresenceEditorDraft(roomId, draftId, input, token)` (Integration Plan) | `patchPresenceEditorDraft(roomId, token, payload)` (editor.ts line 57-66) | ❌ **Doc mismatch** — real signature does NOT take `draftId`. It takes `roomId, token, payload`. |
| `createPresenceEditorDraft` signature | `createPresenceEditorDraft(roomId, input, token)` (Integration Plan) | `createPresenceEditorDraft(roomId, token, payload?)` (editor.ts line 46-55) | ❌ **Doc mismatch** — parameter order is `roomId, token, payload`, NOT `roomId, input, token`. |
| `getPresenceEditorDraft` | Mentioned in Integration Plan | Exists but unused by existing editor. Existing editor uses `getPresenceEditor` which returns full overview including draft. | ⚠️ **Note** — V2 shell should use `getPresenceEditor`, NOT `getPresenceEditorDraft`. |
| `onNodeReload` | Called after publish in existing editor | `await onNodeReload?.()` at line 320 of `PresenceStudioEditorApp.tsx`. It triggers `useOwnerNode.reload()` which re-fetches node + token. | ✅ Correct — can be called after publish (when we add publish later). |
| Save requires draft ID | Integration Plan implies draft ID needed | No draft ID needed. The endpoint is `PATCH /api/presence/owner/rooms/{roomId}/editor/draft`. The backend identifies draft by room + owner session. | ✅ Confirmed — no draft ID needed. |

**Action:** The Integration Plan contains outdated parameter order for `patchPresenceEditorDraft` and `createPresenceEditorDraft`. Codex must use the real signatures from `lib/api/editor.ts`.

---

## 11. Codex Implementation Prompt Summary

Create exactly one new file and modify exactly one existing file.

### File 1: Create `components/presence-studio-v2/PresenceStudioV2Editor.tsx`

Requirements:
- `"use client"`
- Props: `{ node, nodeId, token, onNodeReload }` matching `PresenceStudioEditorAppProps`
- Load: `getPresenceEditor(nodeId, token)` → `studioV2FromPresenceConfig(sourceConfig, node)`
- State: `StudioV2State | null`, `baseSnapshot`, `loading`, `loadError`, `saving`, `notice`, `actionError`
- Dirty: `JSON.stringify(v2State) !== baseSnapshot`
- Save: `presenceConfigFromStudioV2State(v2State, sourceConfig)` → `overview.draft ? patch : create`
- After save: re-hydrate state from response.draft, reset baseSnapshot
- UI: status bar with "Studio V2" label, dirty badge, save button; title input; error/notice banner
- **NO localStorage**
- **NO TemplateKit endpoints**
- **NO prototype UI port**

### File 2: Modify `app/(studio)/studio/[id]/editor/page.tsx`

Requirements:
- Add import: `import { shouldUsePresenceStudioV2 } from "@/lib/presence/studio-v2/feature";`
- Compute `isV2Enabled` after `useOwnerNode` resolves
- Branch: `isV2Enabled ? <PresenceStudioV2Editor ... /> : <PresenceStudioEditorApp ... />`
- Preserve exact same props to `PresenceStudioEditorApp`
- Do NOT modify `PresenceStudioEditorApp.tsx`

---

## 12. Verification Commands for Codex

After implementation, Codex must run:

```bash
cd /c/Dev/Flora_fauna/presence-app
npm run typecheck
npm run build
npx tsx --test lib/presence/studio-v2/studioV2Adapters.test.ts
npx tsx --test lib/presence/render/publicPayload.test.ts
```

All must pass.

---

## 13. Acceptance Criteria for Phase B

- [ ] `app/(studio)/studio/[id]/editor/page.tsx` branches to V2 only when feature flag + pilot eligibility allow it
- [ ] Non-V2 rooms render `PresenceStudioEditorApp` unchanged
- [ ] `PresenceStudioV2Editor.tsx` loads draft via `getPresenceEditor`
- [ ] `PresenceStudioV2Editor.tsx` can edit room title
- [ ] `PresenceStudioV2Editor.tsx` saves via `patchPresenceEditorDraft` (existing draft) or `createPresenceEditorDraft` (new draft)
- [ ] Save uses `presenceConfigFromStudioV2State` with existing config as second arg
- [ ] Reload page confirms title persists
- [ ] Dirty state is computed and shown
- [ ] Loading, saving, error, and notice states are shown
- [ ] No localStorage reads or writes
- [ ] No TemplateKit draft endpoint used
- [ ] No prototype UI components ported
- [ ] Typecheck passes
- [ ] Build passes
- [ ] Existing adapter and public payload tests pass
- [ ] Editor route is the ONLY route modified
