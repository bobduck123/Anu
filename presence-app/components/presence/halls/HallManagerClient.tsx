"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BarChart3, Loader2, PlusCircle, Trash2 } from "lucide-react";
import {
  addHallPortal,
  addHallSession,
  addHallStall,
  addHallZone,
  deleteHall,
  getOwnerHall,
  removeHallZone,
  updateHall,
} from "@/lib/api/halls";
import { PresenceApiError, isPresenceConnectionError } from "@/lib/api/client";
import {
  HALL_ZONE_BLURBS,
  HALL_ZONE_LABELS,
  hallTypeLabel,
} from "@/lib/presence/graph/copy";
import type {
  HallZone,
  HallZoneKind,
  PresenceHall,
  PresenceNode,
} from "@/lib/api/types";

const ZONE_KINDS: HallZoneKind[] = ["lobby", "stage", "table", "stall", "noticeboard", "portal"];

export function HallManagerClient({
  node,
  hallId,
  token,
}: {
  node: PresenceNode;
  hallId: number;
  token: string | null;
}) {
  const [hall, setHall] = useState<PresenceHall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionDown, setConnectionDown] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [zoneDraft, setZoneDraft] = useState<{ kind: HallZoneKind; title: string }>({
    kind: "stage",
    title: "",
  });
  const [stallSlug, setStallSlug] = useState("");
  const [stallPitch, setStallPitch] = useState("");
  const [portalLabel, setPortalLabel] = useState("");
  const [portalKind, setPortalKind] = useState<string>("room");
  const [portalSlug, setPortalSlug] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionStart, setSessionStart] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getOwnerHall(node.id, hallId, token);
      setHall(result);
      setConnectionDown(false);
    } catch (err) {
      if (isPresenceConnectionError(err)) {
        // Owner pages must surface this clearly, not hide it behind an
        // empty placeholder.
        setConnectionDown(true);
        setHall(null);
      } else if (err instanceof PresenceApiError && err.status === 403) {
        setError("You don't have access to manage this Hall.");
      } else {
        setError(err instanceof Error ? err.message : "Could not open this Hall.");
      }
    } finally {
      setLoading(false);
    }
  }, [hallId, node.id, node.slug, node.display_name, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchHall(payload: { status?: string; visibility?: string; title?: string }) {
    if (!hall || !token) return;
    setSavingField("hall");
    try {
      const updated = await updateHall(hall.id, payload, token);
      setHall(updated);
    } catch (err) {
      if (err instanceof PresenceApiError && err.code === "endpoint_unavailable") {
        setHall({ ...hall, ...payload });
      } else {
        setError(err instanceof Error ? err.message : "Could not update the Hall.");
      }
    } finally {
      setSavingField(null);
    }
  }

  async function handleAddZone(e: React.FormEvent) {
    e.preventDefault();
    if (!hall || !token || !zoneDraft.title.trim()) return;
    setSavingField("zone");
    try {
      const result = await addHallZone(
        hall.id,
        {
          zone_kind: zoneDraft.kind,
          title: zoneDraft.title.trim(),
          order_index: (hall.zones?.length ?? 0) + 1,
        },
        token,
      );
      setHall({ ...hall, zones: [...(hall.zones ?? []), result] });
      setZoneDraft({ kind: zoneDraft.kind, title: "" });
    } catch (err) {
      if (err instanceof PresenceApiError && err.code === "endpoint_unavailable") {
        const local: HallZone = {
          id: Date.now(),
          hall_id: hall.id,
          zone_kind: zoneDraft.kind,
          title: zoneDraft.title.trim(),
          order_index: (hall.zones?.length ?? 0) + 1,
        };
        setHall({ ...hall, zones: [...(hall.zones ?? []), local] });
        setZoneDraft({ kind: zoneDraft.kind, title: "" });
      } else {
        setError(err instanceof Error ? err.message : "Could not add Zone.");
      }
    } finally {
      setSavingField(null);
    }
  }

  async function handleRemoveZone(zoneId: number) {
    if (!hall || !token) return;
    try {
      await removeHallZone(hall.id, zoneId, token).catch(() => {});
    } finally {
      setHall({ ...hall, zones: (hall.zones ?? []).filter((z) => z.id !== zoneId) });
    }
  }

  async function handleAddStall(e: React.FormEvent) {
    e.preventDefault();
    if (!hall || !token || !stallSlug.trim()) return;
    setSavingField("stall");
    try {
      const result = await addHallStall(
        hall.id,
        { room_id: 0, short_pitch: stallPitch || undefined },
        token,
      );
      setHall({ ...hall, stalls: [...(hall.stalls ?? []), result] });
      setStallSlug("");
      setStallPitch("");
    } catch (err) {
      if (err instanceof PresenceApiError && err.code === "endpoint_unavailable") {
        setHall({
          ...hall,
          stalls: [
            ...(hall.stalls ?? []),
            {
              id: Date.now(),
              hall_id: hall.id,
              room_id: 0,
              room_slug: stallSlug,
              room_display_name: stallSlug,
              short_pitch: stallPitch || undefined,
            },
          ],
        });
        setStallSlug("");
        setStallPitch("");
      } else {
        setError(err instanceof Error ? err.message : "Could not add Stall.");
      }
    } finally {
      setSavingField(null);
    }
  }

  async function handleAddPortal(e: React.FormEvent) {
    e.preventDefault();
    if (!hall || !token || !portalLabel.trim()) return;
    setSavingField("portal");
    try {
      const result = await addHallPortal(
        hall.id,
        {
          label: portalLabel.trim(),
          destination_kind: portalKind as "room" | "hall" | "garden" | "path" | "mood_board",
          destination_slug: portalSlug || undefined,
        },
        token,
      );
      setHall({ ...hall, portals: [...(hall.portals ?? []), result] });
      setPortalLabel("");
      setPortalSlug("");
    } catch (err) {
      if (err instanceof PresenceApiError && err.code === "endpoint_unavailable") {
        setHall({
          ...hall,
          portals: [
            ...(hall.portals ?? []),
            {
              id: Date.now(),
              hall_id: hall.id,
              label: portalLabel.trim(),
              destination_kind: portalKind as "room" | "hall" | "garden" | "path" | "mood_board",
              destination_slug: portalSlug || undefined,
            },
          ],
        });
        setPortalLabel("");
        setPortalSlug("");
      } else {
        setError(err instanceof Error ? err.message : "Could not add Portal.");
      }
    } finally {
      setSavingField(null);
    }
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    if (!hall || !token || !sessionTitle.trim()) return;
    setSavingField("session");
    try {
      const result = await addHallSession(
        hall.id,
        { title: sessionTitle.trim(), starts_at: sessionStart || undefined },
        token,
      );
      setHall({ ...hall, sessions: [...(hall.sessions ?? []), result] });
      setSessionTitle("");
      setSessionStart("");
    } catch (err) {
      if (err instanceof PresenceApiError && err.code === "endpoint_unavailable") {
        setHall({
          ...hall,
          sessions: [
            ...(hall.sessions ?? []),
            {
              id: Date.now(),
              hall_id: hall.id,
              title: sessionTitle.trim(),
              status: "scheduled",
              starts_at: sessionStart || undefined,
            },
          ],
        });
        setSessionTitle("");
        setSessionStart("");
      } else {
        setError(err instanceof Error ? err.message : "Could not add Session.");
      }
    } finally {
      setSavingField(null);
    }
  }

  async function handleDelete() {
    if (!hall || !token) return;
    if (!window.confirm("Delete this Hall? This cannot be undone.")) return;
    try {
      await deleteHall(hall.id, token);
      window.location.href = `/studio/${node.id}/halls`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this Hall.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--p-studio-accent)" }} />
      </div>
    );
  }

  if (connectionDown) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10" role="status">
        <p className="rounded-2xl border border-red-900/60 bg-red-950/25 p-4 text-sm text-red-200">
          <strong className="font-semibold">Backend unreachable.</strong>{" "}
          The Presence backend at <code>{process.env.NEXT_PUBLIC_API_BASE ?? "the configured API base"}</code>{" "}
          did not respond. This Hall manager cannot load Hall state. Check the backend is running, then refresh.
        </p>
      </div>
    );
  }

  if (!hall) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="rounded-2xl border border-red-900/60 bg-red-950/25 p-4 text-sm text-red-200">
          {error ?? "Could not load this Hall."}
        </p>
      </div>
    );
  }

  const baseStyles = {
    borderColor: "var(--p-studio-border)",
    background: "var(--p-studio-surface)",
  } as const;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header
        className="rounded-3xl border p-5 flex flex-col gap-3"
        style={baseStyles}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
              {hallTypeLabel(hall.hall_type)} · {hall.status}
            </p>
            <h1 className="mt-2 text-2xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
              {hall.title}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/studio/${node.id}/halls/${hall.id}/analytics`}
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </Link>
            <Link
              href={`/halls/${hall.slug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950"
            >
              Public view <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={hall.status}
            disabled={savingField !== null}
            onChange={(e) => patchHall({ status: e.target.value })}
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            <option value="scheduled" style={baseStyles}>Scheduled</option>
            <option value="live" style={baseStyles}>Live</option>
            <option value="ended" style={baseStyles}>Ended</option>
            <option value="archived" style={baseStyles}>Archived</option>
          </select>
          <select
            value={hall.visibility}
            disabled={savingField !== null}
            onChange={(e) => patchHall({ visibility: e.target.value })}
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            <option value="public" style={baseStyles}>Public</option>
            <option value="unlisted" style={baseStyles}>Unlisted</option>
            <option value="invite" style={baseStyles}>Invite</option>
            <option value="private" style={baseStyles}>Private</option>
          </select>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-900/60 bg-red-950/25 p-4 text-sm text-red-200">{error}</p>
      )}

      {/* Zones */}
      <section className="rounded-3xl border p-5 flex flex-col gap-4" style={baseStyles}>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
            Zones
          </p>
          <h2 className="mt-2 text-xl font-semibold" style={{ color: "var(--p-studio-text)" }}>
            Where Masks can stand.
          </h2>
        </header>
        <ul className="grid gap-2">
          {(hall.zones ?? []).map((zone) => (
            <li
              key={zone.id}
              className="rounded-2xl border p-3 flex items-center justify-between gap-3"
              style={{ borderColor: "var(--p-studio-border)" }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--p-studio-muted)" }}>
                  {HALL_ZONE_LABELS[zone.zone_kind] ?? zone.zone_kind}
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--p-studio-text)" }}>{zone.title}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveZone(zone.id)}
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: "var(--p-studio-muted)" }}
                aria-label={`Remove zone ${zone.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddZone} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
          <select
            value={zoneDraft.kind}
            onChange={(e) => setZoneDraft((s) => ({ ...s, kind: e.target.value as HallZoneKind }))}
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            {ZONE_KINDS.map((k) => (
              <option key={k} value={k} style={baseStyles}>{HALL_ZONE_LABELS[k]}</option>
            ))}
          </select>
          <input
            value={zoneDraft.title}
            onChange={(e) => setZoneDraft((s) => ({ ...s, title: e.target.value }))}
            placeholder={HALL_ZONE_BLURBS[zoneDraft.kind]}
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950"
            disabled={savingField === "zone"}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </section>

      {/* Stalls */}
      <section className="rounded-3xl border p-5 flex flex-col gap-4" style={baseStyles}>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
            Stalls — Rooms in the Hall
          </p>
        </header>
        {(hall.stalls ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--p-studio-muted)" }}>
            No Stalls yet. Add another Room's slug to invite them inside this Hall.
          </p>
        ) : (
          <ul className="grid gap-2">
            {hall.stalls!.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border p-3"
                style={{ borderColor: "var(--p-studio-border)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--p-studio-text)" }}>{s.room_display_name}</p>
                <p className="text-xs" style={{ color: "var(--p-studio-muted)" }}>/presence/{s.room_slug}</p>
                {s.short_pitch && <p className="mt-1 text-sm" style={{ color: "var(--p-studio-muted)" }}>{s.short_pitch}</p>}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddStall} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={stallSlug}
            onChange={(e) => setStallSlug(e.target.value)}
            placeholder="Room slug"
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          />
          <input
            value={stallPitch}
            onChange={(e) => setStallPitch(e.target.value)}
            placeholder="Short pitch (optional)"
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950"
            disabled={savingField === "stall"}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Stall
          </button>
        </form>
      </section>

      {/* Portals */}
      <section className="rounded-3xl border p-5 flex flex-col gap-4" style={baseStyles}>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
            Portals — doors out of this Hall
          </p>
        </header>
        {(hall.portals ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--p-studio-muted)" }}>No Portals yet.</p>
        ) : (
          <ul className="grid gap-2">
            {hall.portals!.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border p-3"
                style={{ borderColor: "var(--p-studio-border)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--p-studio-text)" }}>{p.label}</p>
                <p className="text-xs" style={{ color: "var(--p-studio-muted)" }}>
                  → {p.destination_kind}{p.destination_slug ? `: ${p.destination_slug}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddPortal} className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
          <input
            value={portalLabel}
            onChange={(e) => setPortalLabel(e.target.value)}
            placeholder="Label visitors will see"
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          />
          <select
            value={portalKind}
            onChange={(e) => setPortalKind(e.target.value)}
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          >
            <option value="room" style={baseStyles}>Room</option>
            <option value="hall" style={baseStyles}>Hall</option>
            <option value="garden" style={baseStyles}>Garden / Mask</option>
            <option value="path" style={baseStyles}>Path</option>
            <option value="mood_board" style={baseStyles}>Mood Board</option>
          </select>
          <input
            value={portalSlug}
            onChange={(e) => setPortalSlug(e.target.value)}
            placeholder="Destination slug or id"
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950"
            disabled={savingField === "portal"}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Portal
          </button>
        </form>
      </section>

      {/* Sessions */}
      <section className="rounded-3xl border p-5 flex flex-col gap-4" style={baseStyles}>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--p-studio-muted)" }}>
            Sessions — what happens, when
          </p>
        </header>
        {(hall.sessions ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--p-studio-muted)" }}>No Sessions scheduled.</p>
        ) : (
          <ul className="grid gap-2">
            {hall.sessions!.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border p-3"
                style={{ borderColor: "var(--p-studio-border)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--p-studio-text)" }}>{s.title}</p>
                {s.starts_at && (
                  <p className="text-xs" style={{ color: "var(--p-studio-muted)" }}>{new Date(s.starts_at).toLocaleString()}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddSession} className="grid gap-2 sm:grid-cols-[1fr_240px_auto]">
          <input
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="Session title"
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          />
          <input
            type="datetime-local"
            value={sessionStart}
            onChange={(e) => setSessionStart(e.target.value)}
            className="rounded-xl border bg-transparent px-3 py-2 text-sm"
            style={{ borderColor: "var(--p-studio-border)", color: "var(--p-studio-text)" }}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950"
            disabled={savingField === "session"}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      </section>

      {/* Danger */}
      <section className="rounded-3xl border p-5 flex flex-col gap-3" style={{ ...baseStyles, borderColor: "#7f1d1d40" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "#ef4444" }}>
          Danger
        </p>
        <p className="text-sm" style={{ color: "var(--p-studio-muted)" }}>
          Deleting a Hall removes it from the public index. Participants will not be notified.
        </p>
        <div>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "#7f1d1d80", color: "#fecaca" }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete this Hall
          </button>
        </div>
      </section>
    </div>
  );
}
