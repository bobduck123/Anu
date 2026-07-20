"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  Compass,
  Droplets,
  Flag,
  Footprints,
  Repeat2,
  Scissors,
} from "lucide-react";
import {
  nurtureObservation,
  reportObservation,
  unnurtureObservation,
} from "@/lib/api/gardens";
import { observationKindLabel, seedStateLabel } from "@/lib/presence/graph/copy";
import type { Observation } from "@/lib/api/types";
import { EchoComposer } from "./EchoComposer";
import { PresenceChip } from "./primitives";

function relativeTime(iso?: string | null): string {
  if (!iso) return "just now";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "recent";
  const delta = (Date.now() - date.getTime()) / 1000;
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  if (delta < 86400 * 7) return `${Math.floor(delta / 86400)}d`;
  return date.toLocaleDateString();
}

function maskHref(alias?: string | null): string | null {
  if (!alias) return null;
  return `/m/${encodeURIComponent(alias)}`;
}

function sourceHref(obs: Observation): string | null {
  if (!obs.source) return null;
  const { source_kind, source_slug, source_id } = obs.source;
  if (source_kind === "room" && source_slug) return `/presence/${source_slug}`;
  if (source_kind === "hall" && source_slug) return `/halls/${source_slug}`;
  if (source_kind === "path" && source_id) return `/paths/${source_id}`;
  if (source_kind === "mood_board" && source_id) return `/observer/mood-boards/${source_id}`;
  if (source_kind === "mask" && source_slug) return `/m/${source_slug}`;
  return null;
}

export function ObservationCard({
  observation,
  token,
  onChange,
  variant = "default",
  enableEcho = true,
  enableReport = true,
}: {
  observation: Observation;
  token: string | null;
  onChange?: (next: Observation) => void;
  variant?: "default" | "pinned" | "compact";
  enableEcho?: boolean;
  enableReport?: boolean;
}) {
  const [local, setLocal] = useState<Observation>(observation);
  const [busy, setBusy] = useState<null | "nurture" | "echo" | "report">(null);
  const [status, setStatus] = useState<string | null>(null);
  const [echoOpen, setEchoOpen] = useState(false);

  const author = local.author;
  const authorHref = maskHref(author?.alias);
  const srcHref = sourceHref(local);
  const kindLabel = observationKindLabel(local.observation_kind);
  const showAuthor = variant !== "compact";

  async function handleNurture() {
    if (!token) {
      setStatus("Create an Observer Mask to nurture this Observation.");
      return;
    }
    setBusy("nurture");
    setStatus(null);
    try {
      const action = local.has_nurtured ? unnurtureObservation : nurtureObservation;
      const res = await action(local.id, token);
      if (res?.observation) {
        setLocal(res.observation);
        onChange?.(res.observation);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not nurture this Observation.");
    } finally {
      setBusy(null);
    }
  }

  function handleEchoOpen() {
    if (!token) {
      setStatus("Create an Observer Mask to Echo Observations.");
      return;
    }
    setStatus(null);
    setEchoOpen(true);
  }

  async function handleReport() {
    if (!token) {
      setStatus("Create an Observer Mask to report Observations.");
      return;
    }
    const reason = window.prompt("What feels off about this Observation?");
    if (!reason) return;
    setBusy("report");
    try {
      await reportObservation(local.id, { reason }, token);
      setStatus("Reported. Thank you.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not report right now.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article
      className="observation-card"
      data-kind={local.observation_kind}
      data-variant={variant}
      aria-label={`Observation by ${author?.alias ?? "anonymous"}`}
    >
      <div className="observation-meta">
        {showAuthor && author && (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--presence-stage)",
                color: "var(--garden-accent)",
                fontFamily: "var(--presence-f-display)",
                fontStyle: "italic",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {author.alias.slice(0, 1).toUpperCase()}
            </span>
            {authorHref ? (
              <Link href={authorHref} style={{ color: "inherit", textDecoration: "none" }}>
                {author.alias}
              </Link>
            ) : (
              <span>{author.alias}</span>
            )}
          </span>
        )}
        <span aria-hidden style={{ color: "var(--presence-on-paper-dim)" }}>·</span>
        <span>{kindLabel}</span>
        {local.echoed_from && (
          <>
            <span aria-hidden style={{ color: "var(--presence-on-paper-dim)" }}>·</span>
            <span>
              Echoed from{" "}
              {maskHref(local.echoed_from.alias) ? (
                <Link href={maskHref(local.echoed_from.alias)!} style={{ color: "inherit", textDecoration: "underline" }}>
                  {local.echoed_from.alias}
                </Link>
              ) : (
                local.echoed_from.alias
              )}
            </span>
          </>
        )}
        <span aria-hidden style={{ color: "var(--presence-on-paper-dim)" }}>·</span>
        <span>{relativeTime(local.created_at)}</span>
      </div>

      <p className={`observation-body ${variant === "pinned" ? "is-display" : ""} ${local.body_format === "display" ? "is-display" : ""}`}>
        {local.body}
      </p>

      {local.image_url && (
        <img
          src={local.image_url}
          alt=""
          loading="lazy"
          style={{
            display: "block",
            width: "100%",
            borderRadius: "var(--presence-r-1)",
            border: "1px solid var(--presence-rule)",
          }}
        />
      )}

      {local.source && (
        <div className="presence-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {local.source.seed_state && <PresenceChip tone="accent">{seedStateLabel(local.source.seed_state)}</PresenceChip>}
          {local.source.reason_shown ?? local.source.source_label}
          {srcHref && (
            <Link href={srcHref} style={{ color: "var(--garden-accent)", textDecoration: "none" }}>
              ↗
            </Link>
          )}
        </div>
      )}

      {status && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--presence-on-paper-mute)",
            fontStyle: "italic",
          }}
        >
          {status}
        </p>
      )}

      <div className="observation-actions" role="group" aria-label="Observation actions">
        <button
          type="button"
          className={`observation-action ${local.has_nurtured ? "is-on" : ""}`}
          onClick={handleNurture}
          disabled={busy !== null}
          aria-pressed={local.has_nurtured ?? false}
          data-action="nurture"
        >
          <Droplets size={14} aria-hidden />
          <span>{local.nurture_count ?? 0}</span>
          <span className="sr-only">Nurture</span>
        </button>
        {enableEcho && (
          <button
            type="button"
            className={`observation-action ${local.has_echoed ? "is-on" : ""}`}
            onClick={handleEchoOpen}
            disabled={busy !== null || local.has_echoed}
            data-action="echo"
            aria-label="Echo this Observation"
          >
            <Repeat2 size={14} aria-hidden />
            <span>{local.echo_count ?? 0}</span>
          </button>
        )}
        <EchoComposer
          source={local}
          token={token}
          open={echoOpen}
          onClose={() => setEchoOpen(false)}
          onPosted={() => {
            const next = { ...local, has_echoed: true, echo_count: (local.echo_count ?? 0) + 1 };
            setLocal(next);
            onChange?.(next);
            setStatus("Echoed into your Garden.");
          }}
        />

        <button
          type="button"
          className="observation-action"
          aria-label="Save to Mood Board"
          data-action="save"
          onClick={() => setStatus("Open a Mood Board to save this — coming next pass.")}
        >
          <BookmarkPlus size={14} aria-hidden /> Save
        </button>
        {srcHref && local.source?.source_kind === "room" && (
          <Link
            href={`/paths/from-room/${local.source.source_id ?? 0}`}
            className="observation-action"
            aria-label="Walk a Path from this Room"
          >
            <Footprints size={14} aria-hidden /> Walk
          </Link>
        )}
        {srcHref && local.source?.source_kind === "hall" && (
          <Link href={srcHref} className="observation-action" aria-label="Open Hall">
            <Compass size={14} aria-hidden /> Hall
          </Link>
        )}
        {srcHref && (
          <Link href={srcHref} className="observation-action" aria-label="Open source">
            <ArrowRight size={14} aria-hidden /> Open
          </Link>
        )}
        {enableReport && (
          <button
            type="button"
            className="observation-action"
            onClick={handleReport}
            disabled={busy !== null}
            data-action="report"
            aria-label="Report Observation"
            style={{ marginLeft: "auto" }}
          >
            <Flag size={14} aria-hidden />
            <span className="sr-only">Report</span>
          </button>
        )}
      </div>
    </article>
  );
}
