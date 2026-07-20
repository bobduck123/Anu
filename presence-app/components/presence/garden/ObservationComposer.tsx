"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { createObservation, type ObservationInput } from "@/lib/api/gardens";
import { observationKindLabel } from "@/lib/presence/graph/copy";
import type { Observation, ObservationKind } from "@/lib/api/types";

const KINDS: ObservationKind[] = ["text", "mood", "find", "field", "walk_log"];

const SELF_PROMOTION_RE =
  /(book me|hire me|dm me|services|rates|website|portfolio|pricing|enquir(y|ies)|whatsapp|telegram|http|www\.|@\w+\.com)/i;

export function ObservationComposer({
  token,
  defaultKind = "text",
  defaultBody = "",
  onPosted,
  contextLabel,
  hallId,
  source,
}: {
  token: string | null;
  defaultKind?: ObservationKind;
  defaultBody?: string;
  onPosted?: (observation: Observation) => void;
  contextLabel?: string;
  hallId?: number;
  source?: {
    source_kind: string;
    source_id?: number;
    source_slug?: string;
  };
}) {
  const [body, setBody] = useState(defaultBody);
  const [kind, setKind] = useState<ObservationKind>(defaultKind);
  const [visibility, setVisibility] = useState<ObservationInput["visibility"]>("public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setStatus(null);
    if (!token) {
      setError("Create an Observer Mask to share an Observation.");
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write a few words first.");
      return;
    }
    if (SELF_PROMOTION_RE.test(trimmed)) {
      setError(
        "This sounds like a Presence Room. Observations are what you notice along the way — not promotion. Open a Room for that.",
      );
      return;
    }
    setBusy(true);
    try {
      const payload: ObservationInput = {
        observation_kind: kind,
        body: trimmed,
        body_format: kind === "field" || kind === "mood" ? "display" : "plain",
        visibility,
      };
      if (source?.source_kind) {
        payload.source_kind = source.source_kind;
        if (source.source_id !== undefined) payload.source_id = source.source_id;
        if (source.source_slug) payload.source_slug = source.source_slug;
      }
      if (hallId) payload.hall_id = hallId;
      const result = await createObservation(payload, token);
      setBody("");
      setStatus("Observation shared.");
      onPosted?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share this Observation.");
    } finally {
      setBusy(false);
    }
  }

  const placeholder =
    contextLabel ? `Share an Observation about ${contextLabel}…` : "Share an Observation. What did you notice?";

  return (
    <form
      className="observation-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      aria-label="Compose an Observation"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={1200}
        aria-label="Observation body"
        disabled={busy}
        data-testid="observation-composer-input"
      />
      <div className="observation-composer-bar">
        <div className="observation-composer-types" role="group" aria-label="Observation kind">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="observation-type-pill"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {observationKindLabel(k)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="presence-eyebrow" htmlFor="obs-visibility" style={{ marginRight: 6 }}>
            Visibility
          </label>
          <select
            id="obs-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ObservationInput["visibility"])}
            disabled={busy}
            style={{
              fontFamily: "var(--presence-f-mono)",
              fontSize: 11,
              padding: "6px 8px",
              border: "1px solid var(--presence-rule-strong)",
              background: "transparent",
              color: "var(--presence-on-paper)",
              borderRadius: 2,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <option value="public">Public</option>
            <option value="mask_only">Mask only</option>
            <option value="private">Private</option>
          </select>
          <button type="submit" className="presence-btn is-accent is-small" disabled={busy} data-testid="observation-composer-submit">
            <Send size={14} aria-hidden />
            {busy ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "8px 10px",
            border: "1px solid color-mix(in oklab, var(--presence-vermilion) 40%, transparent)",
            background: "color-mix(in oklab, var(--presence-vermilion) 8%, transparent)",
            color: "var(--presence-vermilion)",
            fontSize: 13,
            borderRadius: 2,
          }}
        >
          {error}
        </p>
      )}
      {status && !error && (
        <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--garden-accent)" }}>
          {status}
        </p>
      )}
    </form>
  );
}
