"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Compass, Droplets, EyeOff, Footprints, Scissors } from "lucide-react";
import { compostSeed, nurtureSeed, pruneSeed } from "@/lib/api/gardens";
import {
  SEED_KIND_LABELS,
  SEED_STATE_DESCRIPTIONS,
  SEED_STATE_LABELS,
} from "@/lib/presence/graph/copy";
import type { GardenSeed, SeedState } from "@/lib/api/types";
import { PresenceChip } from "./primitives";

function destinationHref(seed: GardenSeed): string | null {
  if (seed.href) return seed.href;
  switch (seed.seed_kind) {
    case "mask":
      return seed.source_slug ? `/m/${seed.source_slug}` : null;
    case "room":
      return seed.source_slug ? `/presence/${seed.source_slug}` : null;
    case "hall":
      return seed.source_slug ? `/halls/${seed.source_slug}` : null;
    case "path":
      return seed.source_id ? `/paths/${seed.source_id}` : null;
    case "mood_board":
      return seed.source_id ? `/observer/mood-boards/${seed.source_id}` : null;
    default:
      return null;
  }
}

export function SeedCard({
  seed,
  token,
  onChange,
  compact = false,
}: {
  seed: GardenSeed;
  token: string | null;
  onChange?: (next: GardenSeed) => void;
  compact?: boolean;
}) {
  const [local, setLocal] = useState<GardenSeed>(seed);
  const [busy, setBusy] = useState<null | "nurture" | "prune" | "compost">(null);
  const [error, setError] = useState<string | null>(null);

  const state = (local.state as SeedState) ?? "active";
  const stateLabel = SEED_STATE_LABELS[state] ?? state;
  const stateBlurb = SEED_STATE_DESCRIPTIONS[state] ?? "";
  const kindLabel = SEED_KIND_LABELS[local.seed_kind] ?? local.seed_kind;
  const href = destinationHref(local);

  async function withGuard<T>(label: "nurture" | "prune" | "compost", fn: () => Promise<T>) {
    if (!token) {
      setError("Create an Observer Mask to nurture or prune Seeds.");
      return null;
    }
    setBusy(label);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this Seed.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function handleNurture() {
    const res = await withGuard("nurture", () => nurtureSeed(local.id, token!));
    if (res?.seed) {
      setLocal(res.seed);
      onChange?.(res.seed);
    }
  }

  async function handlePrune() {
    const res = await withGuard("prune", () => pruneSeed(local.id, token!));
    if (res?.seed) {
      setLocal(res.seed);
      onChange?.(res.seed);
    }
  }

  async function handleCompost() {
    const res = await withGuard("compost", () => compostSeed(local.id, token!));
    if (res?.seed) {
      setLocal(res.seed);
      onChange?.(res.seed);
    }
  }

  return (
    <article className="seed-card" data-state={state} data-seed-kind={local.seed_kind} aria-label={`Seed: ${local.source_label}`}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="presence-eyebrow" style={{ margin: 0 }}>
            <span>{kindLabel}</span>
            <span aria-hidden style={{ margin: "0 6px", color: "var(--presence-on-paper-dim)" }}>·</span>
            <span>{stateLabel}</span>
          </p>
          <p
            className="presence-display"
            style={{
              margin: "6px 0 0",
              fontSize: compact ? 18 : 22,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: "var(--presence-on-paper)",
            }}
          >
            {href ? (
              <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>
                {local.source_label}
              </Link>
            ) : (
              local.source_label
            )}
          </p>
        </div>
        {state === "recently_watered" && <PresenceChip tone="accent">Watered</PresenceChip>}
        {state === "wilting" && <PresenceChip>Fading</PresenceChip>}
      </header>

      {local.reason && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--presence-on-paper-mute)", lineHeight: 1.55 }}>
          {local.reason}
        </p>
      )}

      {local.last_shared_space && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--presence-on-paper-dim)", fontStyle: "italic" }}>
          Last shared space — {local.last_shared_space}
        </p>
      )}

      {state !== "composted" && state !== "pruned" && state !== "blocked" && stateBlurb && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--presence-on-paper-dim)" }}>{stateBlurb}</p>
      )}

      {error && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--presence-vermilion)",
            background: "color-mix(in oklab, var(--presence-vermilion) 8%, transparent)",
            padding: "6px 8px",
            borderRadius: 2,
          }}
        >
          {error}
        </p>
      )}

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexWrap: "wrap",
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px dashed var(--presence-rule)",
        }}
      >
        {href && (
          <Link href={href} className="observation-action" aria-label={`Open ${local.source_label}`}>
            <ArrowRight size={14} aria-hidden /> Open
          </Link>
        )}
        {state !== "composted" && state !== "blocked" && state !== "pruned" && (
          <button
            type="button"
            className="observation-action"
            onClick={handleNurture}
            disabled={busy !== null}
            aria-label={`Nurture ${local.source_label}`}
            data-action="nurture"
          >
            <Droplets size={14} aria-hidden />
            {busy === "nurture" ? "Watering…" : "Nurture"}
          </button>
        )}
        {(local.seed_kind === "room" || local.seed_kind === "hall") && local.source_id && (
          <Link
            href={
              local.seed_kind === "hall"
                ? `/halls/${local.source_slug}`
                : `/paths/from-room/${local.source_id}`
            }
            className="observation-action"
          >
            {local.seed_kind === "hall" ? <Compass size={14} aria-hidden /> : <Footprints size={14} aria-hidden />}
            {local.seed_kind === "hall" ? "Enter Hall" : "Walk a Path"}
          </Link>
        )}
        {state !== "pruned" && state !== "blocked" && (
          <button
            type="button"
            className="observation-action"
            onClick={handlePrune}
            disabled={busy !== null}
            aria-label={`Prune ${local.source_label}`}
            data-action="prune"
          >
            <Scissors size={14} aria-hidden />
            {busy === "prune" ? "Pruning…" : "Prune"}
          </button>
        )}
        {state === "wilting" && (
          <button
            type="button"
            className="observation-action"
            onClick={handleCompost}
            disabled={busy !== null}
            aria-label={`Compost ${local.source_label}`}
            data-action="compost"
          >
            <EyeOff size={14} aria-hidden />
            {busy === "compost" ? "Composting…" : "Compost"}
          </button>
        )}
      </footer>
    </article>
  );
}
