"use client";

// Studio DNA editor — minimal Pass 2.
//
// What it does:
// - shows the currently-rendering DNA (resolved by the same path as
//   the public renderer: backend_persisted > demo_overlay > inferred)
// - shows a provenance badge
// - lets the owner edit the raw DNA JSON
// - validates JSON shape + top-level keys client-side before save
// - PATCHes /api/presence/owner/nodes/<id> with { metadata: {...} }
//
// What it does NOT do (future passes):
// - per-field form UI
// - undo history
// - schema-aware suggestions
// - validation against the full DNA enum vocabulary

import { useEffect, useMemo, useState } from "react";
import { Save, Sparkles, RotateCcw, AlertTriangle, Check } from "lucide-react";
import type { PresenceNode } from "@/lib/api/types";
import { resolvePresenceDna } from "@/lib/presence/dna/overlay";
import type { PresenceDna } from "@/lib/presence/dna/types";
import { updateNode } from "@/lib/api/owner";

const DNA_CATEGORY_KEYS = new Set([
  "entity",
  "practice",
  "audience",
  "goal",
  "personality",
  "proof",
  "visual",
  "composition",
  "signature",
]);
const DNA_TOP_LEVEL_EXTRA = new Set(["source", "notes"]);

interface PresenceDnaPanelProps {
  node: PresenceNode;
  nodeId: number;
  token: string;
  onSaved?: () => Promise<void> | void;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

interface ParsedDna {
  ok: true;
  value: Partial<PresenceDna>;
}
interface ParseError {
  ok: false;
  message: string;
}

function parseDnaJson(input: string): ParsedDna | ParseError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? `Invalid JSON: ${err.message}` : "Invalid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, message: "Top level must be a JSON object." };
  }
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (DNA_CATEGORY_KEYS.has(key)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ok: false, message: `\"${key}\" must be a JSON object.` };
      }
    } else if (DNA_TOP_LEVEL_EXTRA.has(key)) {
      // basic checks; backend re-validates strictly
      if (key === "notes" && value !== null && !(Array.isArray(value) && value.every((n) => typeof n === "string"))) {
        return { ok: false, message: "\"notes\" must be a list of strings." };
      }
    } else {
      return { ok: false, message: `Unknown top-level key \"${key}\". Allowed: ${[...DNA_CATEGORY_KEYS, ...DNA_TOP_LEVEL_EXTRA].join(", ")}.` };
    }
  }
  return { ok: true, value: parsed as Partial<PresenceDna> };
}

const SOURCE_LABEL: Record<PresenceDna["source"], string> = {
  backend_persisted: "Backend-persisted",
  node_metadata: "Node metadata",
  demo_overlay: "Demo overlay (temporary)",
  inferred: "Inferred from existing fields",
};

const SOURCE_TONE: Record<PresenceDna["source"], string> = {
  backend_persisted: "presence-dna-prov ok",
  node_metadata: "presence-dna-prov ok",
  demo_overlay: "presence-dna-prov warn",
  inferred: "presence-dna-prov subtle",
};

export default function PresenceDnaPanel({ node, nodeId, token, onSaved }: PresenceDnaPanelProps) {
  const resolved = useMemo(() => resolvePresenceDna(node), [node]);
  const persisted = (node.metadata as { presence_dna?: Partial<PresenceDna> } | null | undefined)?.presence_dna;
  const initial = persisted ?? resolved;
  const [draft, setDraft] = useState<string>(() => pretty(initial));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setDraft(pretty(initial));
  }, [initial]);

  const parseResult = useMemo(() => parseDnaJson(draft), [draft]);

  async function handleSave() {
    if (!parseResult.ok) {
      setErrorMessage(parseResult.message);
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const nextMetadata = { ...(node.metadata ?? {}), presence_dna: parseResult.value };
      await updateNode(nodeId, { metadata: nextMetadata } as unknown as Record<string, unknown>, token);
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 2200);
      if (onSaved) await onSaved();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not save Presence DNA.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setDraft(pretty(persisted ?? resolved));
    setErrorMessage(null);
  }

  function handleSeedFromInferred() {
    setDraft(pretty(resolvePresenceDna({ ...node, metadata: null } as PresenceNode)));
    setErrorMessage(null);
  }

  return (
    <section className="presence-dna-panel">
      <header className="presence-dna-panel-head">
        <div>
          <p className="eyebrow">Presence DNA</p>
          <h2>Identity record</h2>
          <p className="sub">Profession informs DNA. DNA authors the room — blueprint, theme, motion, signature module, and mobile nav are derived from this object.</p>
        </div>
        <span className={SOURCE_TONE[resolved.source]} aria-label={`Provenance: ${SOURCE_LABEL[resolved.source]}`}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> {SOURCE_LABEL[resolved.source]}
        </span>
      </header>

      <label className="presence-dna-editor-label" htmlFor="presence-dna-editor">
        Raw DNA JSON
      </label>
      <textarea
        id="presence-dna-editor"
        className="presence-dna-editor"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setErrorMessage(null);
        }}
        spellCheck={false}
        rows={22}
      />

      <div className="presence-dna-status">
        {parseResult.ok ? (
          <span className="ok"><Check className="h-3.5 w-3.5" aria-hidden /> JSON parses · top-level keys valid</span>
        ) : (
          <span className="err"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {parseResult.message}</span>
        )}
        {errorMessage && (
          <span className="err"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {errorMessage}</span>
        )}
        {savedAt && (
          <span className="ok"><Check className="h-3.5 w-3.5" aria-hidden /> Saved</span>
        )}
      </div>

      <div className="presence-dna-actions">
        <button
          type="button"
          className="presence-dna-primary"
          onClick={() => void handleSave()}
          disabled={saving || !parseResult.ok}
        >
          <Save className="h-3.5 w-3.5" aria-hidden /> {saving ? "Saving..." : "Save Presence DNA"}
        </button>
        <button
          type="button"
          className="presence-dna-secondary"
          onClick={handleReset}
          disabled={saving}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to persisted
        </button>
        <button
          type="button"
          className="presence-dna-secondary"
          onClick={handleSeedFromInferred}
          disabled={saving}
          title="Replace the draft with the DNA inferred from this node's existing fields. Useful as a starting point."
        >
          Seed from inferred
        </button>
      </div>

      <details className="presence-dna-resolved">
        <summary>Currently rendering with</summary>
        <pre>{pretty(resolved)}</pre>
      </details>
    </section>
  );
}
