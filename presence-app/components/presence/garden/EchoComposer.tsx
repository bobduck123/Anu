"use client";

import { useEffect, useRef, useState } from "react";
import { Repeat2, Send, X } from "lucide-react";
import { echoObservation } from "@/lib/api/gardens";
import { PresenceApiError, extractUpgradeRequired } from "@/lib/api/client";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { Observation, ObservationEcho } from "@/lib/api/types";

const SELF_PROMOTION_RE =
  /(book me|hire me|dm me|services|rates|website|portfolio|pricing|enquir(y|ies)|whatsapp|telegram|http|www\.|@\w+\.com)/i;

interface Props {
  source: Observation;
  token: string | null;
  open: boolean;
  onClose: () => void;
  onPosted?: (echo: ObservationEcho) => void;
}

export function EchoComposer({ source, token, open, onClose, onPosted }: Props) {
  const [commentary, setCommentary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeCta, setUpgradeCta] = useState<{ target: string; message: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setCommentary("");
    setError(null);
    setUpgradeCta(null);
    // Focus the textarea when the sheet opens.
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sourceAuthorAlias = source.author?.alias ?? "an Observer";
  const sourceSnippet =
    source.body.length > 220 ? `${source.body.slice(0, 220).trim()}…` : source.body;

  async function submit() {
    setError(null);
    setUpgradeCta(null);
    if (!token) {
      setError("Create an Observer Mask to Echo Observations.");
      return;
    }
    const trimmed = commentary.trim();
    if (trimmed && SELF_PROMOTION_RE.test(trimmed)) {
      setError(
        "Echo commentary cannot include commercial links, rates, or business positioning. Open a Presence Room for that.",
      );
      setUpgradeCta({ target: "presence_room", message: PRESENCE_GRAPH_COPY.selfPromotionGuardrail });
      return;
    }
    setBusy(true);
    try {
      const echo = await echoObservation(source.id, { commentary: trimmed || undefined }, token);
      onPosted?.(echo);
      onClose();
    } catch (err) {
      if (err instanceof PresenceApiError) {
        const upgrade = extractUpgradeRequired(err);
        if (upgrade) {
          setError(upgrade.message ?? err.message);
          setUpgradeCta({
            target: upgrade.upgrade_target ?? "presence_room",
            message: upgrade.message ?? PRESENCE_GRAPH_COPY.selfPromotionGuardrail,
          });
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Could not Echo right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="echo-composer-title"
      data-testid="echo-composer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <button
        type="button"
        aria-label="Close Echo composer"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(13,12,10,0.5)",
          border: 0,
          padding: 0,
          cursor: "pointer",
        }}
      />
      <div
        style={{
          position: "relative",
          background: "var(--presence-bone)",
          color: "var(--presence-on-paper)",
          border: "1px solid var(--presence-rule-strong)",
          borderRadius: "var(--presence-r-2) var(--presence-r-2) 0 0",
          boxShadow: "var(--presence-sh-cinema)",
          maxWidth: 540,
          width: "100%",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "85dvh",
          overflow: "auto",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <p className="presence-eyebrow" style={{ margin: 0 }}>Echo · into your Garden</p>
            <h2
              id="echo-composer-title"
              className="presence-display"
              style={{ margin: "8px 0 0", fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.01em" }}
            >
              Echo this Observation.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4 }}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <blockquote
          data-testid="echo-source-attribution"
          style={{
            margin: 0,
            padding: "12px 14px",
            borderLeft: "3px solid var(--garden-accent)",
            background: "var(--presence-paper)",
            borderRadius: 2,
            fontStyle: "italic",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--presence-on-paper)",
          }}
        >
          <p style={{ margin: 0 }}>“{sourceSnippet}”</p>
          <p
            className="presence-eyebrow"
            style={{ marginTop: 8, fontStyle: "normal" }}
          >
            — {sourceAuthorAlias}
          </p>
        </blockquote>

        <label className="flex flex-col gap-2">
          <span className="presence-eyebrow">Your commentary (optional)</span>
          <textarea
            ref={textareaRef}
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            placeholder="Why are you carrying this back into your Garden?"
            maxLength={600}
            rows={3}
            data-testid="echo-composer-input"
            style={{
              width: "100%",
              border: "1px solid var(--presence-rule-strong)",
              background: "var(--presence-bone)",
              padding: "10px 12px",
              fontFamily: "var(--presence-f-display)",
              fontSize: 16,
              lineHeight: 1.4,
              color: "var(--presence-on-paper)",
              borderRadius: 2,
              resize: "vertical",
              outline: "none",
            }}
          />
        </label>

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

        {upgradeCta && (
          <a
            href="/presence-chooser"
            className="presence-btn is-accent is-small"
            style={{ alignSelf: "flex-start" }}
            data-testid="echo-upgrade-cta"
          >
            Open a Presence Room
          </a>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            className="presence-btn is-ghost is-small"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            className="presence-btn is-accent is-small"
            disabled={busy}
            data-testid="echo-composer-submit"
          >
            {busy ? (
              <Send size={14} aria-hidden />
            ) : (
              <Repeat2 size={14} aria-hidden />
            )}
            {busy ? "Echoing…" : "Echo into your Garden"}
          </button>
        </div>
      </div>
    </div>
  );
}
