"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarPlus,
  DoorOpen,
  Loader2,
  PlusCircle,
  Settings,
} from "lucide-react";
import { listOwnerHalls } from "@/lib/api/halls";
import { PresenceApiError, isPresenceConnectionError } from "@/lib/api/client";
import { HALL_TYPE_DESCRIPTIONS, hallTypeLabel } from "@/lib/presence/graph/copy";
import type { PresenceHall, PresenceNode } from "@/lib/api/types";
import { PresenceChip } from "../garden/primitives";

export function OwnerHallStudio({
  node,
  token,
}: {
  node: PresenceNode;
  token: string | null;
}) {
  const [halls, setHalls] = useState<PresenceHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionDown, setConnectionDown] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setConnectionDown(false);
    try {
      const res = await listOwnerHalls(node.id, token);
      setHalls(res.items);
    } catch (err) {
      // Owner / Studio surfaces must surface a real connection error so the
      // operator knows the backend wasn't reached — not a "no Halls yet" lie.
      if (isPresenceConnectionError(err)) {
        setConnectionDown(true);
        setHalls([]);
      } else if (err instanceof PresenceApiError && err.status === 403) {
        setError("You don't have access to manage Halls for this Room.");
      } else {
        setError(err instanceof Error ? err.message : "Could not load your Halls.");
      }
    } finally {
      setLoading(false);
    }
  }, [node.id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      <section
        className="rounded-3xl border p-5"
        style={{
          borderColor: "var(--p-studio-border)",
          background: "var(--p-studio-surface)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
          Halls · for {node.display_name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: "var(--p-studio-text)" }}>
          Halls are where your Room gathers people.
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--p-studio-muted)" }}>
          Your Room is a storefront. A Hall is what happens when your Room opens its doors — a Town Hall,
          a Salon, a Market with Stalls, a Listening Hall. Schedule one, open one now, or close one when it’s done.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/studio/${node.id}/halls/new`}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4" />
            Create a Hall
          </Link>
          <Link
            href="/halls"
            className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            Browse all Halls
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--p-studio-accent)" }} />
        </div>
      )}

      {connectionDown && (
        <section
          role="status"
          className="rounded-3xl border p-5"
          style={{ borderColor: "#7f1d1d80", background: "#7f1d1d20", color: "#fecaca" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Backend unreachable</p>
          <p className="mt-2 text-sm leading-6">
            The Presence backend at <code>{process.env.NEXT_PUBLIC_API_BASE ?? "the configured API base"}</code> did not respond.
            Your Halls are not loading right now. Check that the backend is running, then refresh.
          </p>
        </section>
      )}

      {error && (
        <p className="rounded-2xl border border-red-900/60 bg-red-950/25 p-4 text-sm text-red-200">{error}</p>
      )}

      {!loading && !connectionDown && halls.length === 0 && (
        <section
          className="rounded-3xl border p-6"
          style={{
            borderColor: "var(--p-studio-border)",
            background: "var(--p-studio-surface)",
          }}
        >
          <DoorOpen className="w-7 h-7" style={{ color: "var(--p-studio-accent)" }} />
          <h2 className="mt-4 text-xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
            No Halls yet.
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--p-studio-muted)" }}>
            Open a Hall when you want to gather people around your Room — a launch night, a salon, a workshop, an open
            studio, or a market with Stalls.
          </p>
          <div className="mt-4">
            <Link
              href={`/studio/${node.id}/halls/new`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950"
            >
              <PlusCircle className="w-4 h-4" /> Create your first Hall
            </Link>
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {halls.map((hall) => (
          <article
            key={hall.id}
            className="rounded-3xl border p-5 flex flex-col gap-3"
            style={{
              borderColor: "var(--p-studio-border)",
              background: "var(--p-studio-surface)",
            }}
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full"
                  style={{
                    color:
                      hall.status === "live"
                        ? "#fb923c"
                        : "var(--p-studio-muted)",
                    border:
                      hall.status === "live"
                        ? "1px solid #fb923c66"
                        : "1px solid var(--p-studio-border)",
                  }}
                >
                  {hall.status === "live" ? "● Live" : hall.status === "scheduled" ? "Scheduled" : hall.status}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border"
                  style={{
                    borderColor: "var(--p-studio-border)",
                    color: "var(--p-studio-muted)",
                  }}
                >
                  {hallTypeLabel(hall.hall_type)}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/studio/${node.id}/halls/${hall.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
                >
                  <Settings className="w-3.5 h-3.5" /> Manage
                </Link>
                <Link
                  href={`/studio/${node.id}/halls/${hall.id}/analytics`}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Analytics
                </Link>
              </div>
            </header>
            <h2 className="text-xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
              {hall.title}
            </h2>
            <p className="text-sm leading-6" style={{ color: "var(--p-studio-muted)" }}>
              {hall.description ?? HALL_TYPE_DESCRIPTIONS[hall.hall_type]}
            </p>
            <footer className="flex items-center justify-between text-xs" style={{ color: "var(--p-studio-muted)" }}>
              <span>
                {hall.participants_count ?? 0} participants ·{" "}
                {hall.starts_at ? new Date(hall.starts_at).toLocaleDateString() : "no start time"}
              </span>
              <Link href={`/halls/${hall.slug}`} className="inline-flex items-center gap-1.5 hover:underline">
                Public view <ArrowRight className="w-3 h-3" />
              </Link>
            </footer>
          </article>
        ))}
      </div>

      <section
        className="rounded-3xl border p-5"
        style={{
          borderColor: "var(--p-studio-border)",
          background: "var(--p-studio-surface)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
          Hall types
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(HALL_TYPE_DESCRIPTIONS).map(([k, v]) => (
            <li
              key={k}
              className="rounded-2xl border p-3 text-sm"
              style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-muted)" }}
            >
              <span className="font-semibold" style={{ color: "var(--p-studio-text)" }}>
                {hallTypeLabel(k)}
              </span>
              <span className="ml-2">{v}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function OwnerHallCreateForm({
  node,
  token,
}: {
  node: PresenceNode;
  token: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hallType, setHallType] = useState<string>("salon");
  const [visibility, setVisibility] = useState<string>("public");
  const [startsAt, setStartsAt] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PresenceHall | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Sign in required to create a Hall.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { createHall } = await import("@/lib/api/halls");
      const result = await createHall(
        {
          title,
          description: description || undefined,
          hall_type: hallType,
          visibility,
          host_room_id: node.id,
          starts_at: startsAt || null,
        },
        token,
      );
      setCreated(result);
    } catch (err) {
      if (err instanceof PresenceApiError && err.code === "endpoint_unavailable") {
        setError(
          "Hall creation endpoint isn't deployed yet. The form is ready — your request will work as soon as the backend is wired.",
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not create this Hall.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <PresenceChip tone="accent">Created</PresenceChip>
        <h1 className="mt-4 text-3xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
          {created.title} is open.
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--p-studio-muted)" }}>
          Add zones, sessions, stalls, and portals — then publish or share the public link.
        </p>
        <div className="mt-6 flex gap-2 flex-wrap">
          <Link
            href={`/studio/${node.id}/halls/${created.id}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950"
          >
            Open Hall Manager <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/halls/${created.slug}`}
            className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            Public view
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
          New Hall · {node.display_name}
        </p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
          Open a gathering.
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--p-studio-muted)" }}>
          Halls are where your Room gathers people. Choose a type, give it a name, set a time if it's scheduled.
        </p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-studio-muted)" }}>
          Title
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={120}
          placeholder="Friday Open Studio"
          className="w-full rounded-2xl border bg-transparent px-4 py-3 text-base"
          style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-studio-muted)" }}>
          Description / rules
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What is this Hall for? Who can attend? What can be said here?"
          className="w-full rounded-2xl border bg-transparent px-4 py-3 text-base"
          style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-studio-muted)" }}>
            Hall type
          </span>
          <select
            value={hallType}
            onChange={(e) => setHallType(e.target.value)}
            className="w-full rounded-2xl border bg-transparent px-4 py-3 text-base"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            {Object.entries(HALL_TYPE_DESCRIPTIONS).map(([k]) => (
              <option key={k} value={k} style={{ background: "var(--p-studio-surface)" }}>
                {hallTypeLabel(k)}
              </option>
            ))}
          </select>
          <span className="text-xs" style={{ color: "var(--p-studio-muted)" }}>
            {HALL_TYPE_DESCRIPTIONS[hallType]}
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-studio-muted)" }}>
            Visibility
          </span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full rounded-2xl border bg-transparent px-4 py-3 text-base"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            <option value="public" style={{ background: "var(--p-studio-surface)" }}>Public — anyone can visit</option>
            <option value="unlisted" style={{ background: "var(--p-studio-surface)" }}>Unlisted — link only</option>
            <option value="invite" style={{ background: "var(--p-studio-surface)" }}>Invite — for selected Masks</option>
            <option value="private" style={{ background: "var(--p-studio-surface)" }}>Private — drafted</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-studio-muted)" }}>
          Starts at (optional)
        </span>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="w-full rounded-2xl border bg-transparent px-4 py-3 text-base"
          style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
        />
        <span className="text-xs" style={{ color: "var(--p-studio-muted)" }}>
          Leave empty for a Hall that opens immediately.
        </span>
      </label>

      {error && (
        <p className="rounded-2xl border border-red-900/60 bg-red-950/25 p-4 text-sm text-red-200">{error}</p>
      )}

      <div className="flex flex-wrap gap-3 mt-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 disabled:opacity-60"
        >
          <CalendarPlus className="w-4 h-4" />
          {busy ? "Opening Hall…" : "Open Hall"}
        </button>
        <Link
          href={`/studio/${node.id}/halls`}
          className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold"
          style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
