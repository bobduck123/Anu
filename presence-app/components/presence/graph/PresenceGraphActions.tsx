"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Compass,
  FolderPlus,
  Heart,
  Loader2,
  Mask,
  PenLine,
  Plus,
  Sparkles,
} from "lucide-react";
import { buildSignInHref, buildSignUpHref } from "@/lib/auth/returnTo";
import {
  addMoodBoardItem,
  captureRoomEncounter,
  createFieldNote,
  createMoodBoard,
  createObserverProfile,
  createSignal,
  followRoom,
  getObserverProfile,
  listMoodBoards,
  saveRoom,
} from "@/lib/api/presenceGraph";
import { PresenceApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { anonymousVisitorId, shouldCaptureEncounter } from "@/lib/presence/graph/anonymous";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { MoodBoard, ObserverProfile, PresenceNode, Signal } from "@/lib/api/types";

const SIGNALS = [
  { type: "resonated", label: "Resonated" },
  { type: "would_book", label: "Would book" },
  { type: "inspiring", label: "Inspiring" },
  { type: "beautiful", label: "Beautiful" },
  { type: "important", label: "Important" },
];

type AuthState = {
  token: string | null;
  observer: ObserverProfile | null;
  checked: boolean;
};

export function PresenceGraphActions({ node }: { node: PresenceNode }) {
  const searchParams = useSearchParams();
  const [auth, setAuth] = useState<AuthState>({ token: null, observer: null, checked: false });
  const [gateOpen, setGateOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardId, setBoardId] = useState<number | "new">("new");
  const [newBoardTitle, setNewBoardTitle] = useState("Rooms to return to");
  const [fieldNote, setFieldNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"public" | "room_owner_only" | "private">("public");
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [observerAlias, setObserverAlias] = useState("");
  const [observerBio, setObserverBio] = useState("");

  const source = searchParams.get("source") || searchParams.get("utm_source") || "direct";
  const roomKeyToken = searchParams.get("key") || searchParams.get("room_key") || searchParams.get("token");
  const contextLabel = searchParams.get("context") || searchParams.get("campaign");
  const returnTo = typeof window === "undefined" ? `/presence/${node.slug}` : window.location.pathname + window.location.search;

  useEffect(() => {
    let cancelled = false;
    async function loadAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (!cancelled) setAuth({ token: null, observer: null, checked: true });
        return;
      }
      try {
        const observer = await getObserverProfile(session.access_token);
        if (!cancelled) setAuth({ token: session.access_token, observer, checked: true });
      } catch {
        if (!cancelled) setAuth({ token: session.access_token, observer: null, checked: true });
      }
    }
    void loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!node.id || !shouldCaptureEncounter(node.id, roomKeyToken)) return;
    const visitorId = anonymousVisitorId();
    captureRoomEncounter(node.id, {
      source,
      room_key_token: roomKeyToken || undefined,
      context_label: contextLabel || undefined,
      anonymous_visitor_id: visitorId,
    }, auth.token).catch(() => {});
  }, [auth.token, contextLabel, node.id, roomKeyToken, source]);

  const actionHint = useMemo(() => {
    if (saved) return "Saved to your Passport.";
    if (following) return "Following this Room.";
    return status;
  }, [following, saved, status]);

  async function requireObserver(action: string) {
    if (!auth.token) {
      setGateOpen(true);
      setStatus(action);
      return null;
    }
    if (auth.observer) return auth;
    try {
      const observer = await getObserverProfile(auth.token);
      setAuth((current) => ({ ...current, observer }));
      return { ...auth, observer };
    } catch {
      setGateOpen(true);
      return null;
    }
  }

  async function saveCurrentRoom() {
    const ready = await requireObserver("Create an Observer Mask to save this Room.");
    if (!ready?.token) return;
    setBusy("save");
    try {
      await saveRoom(node.id, ready.token);
      setSaved(true);
      setStatus("Saved to your Passport.");
    } catch (err) {
      setStatus(errorMessage(err, "Could not save this Room."));
    } finally {
      setBusy(null);
    }
  }

  async function followCurrentRoom() {
    const ready = await requireObserver("Create an Observer Mask to follow this Room.");
    if (!ready?.token) return;
    setBusy("follow");
    try {
      await followRoom(node.id, ready.token);
      setFollowing(true);
      setStatus("Following this Room.");
    } catch (err) {
      setStatus(errorMessage(err, "Could not follow this Room."));
    } finally {
      setBusy(null);
    }
  }

  async function openBoardChooser() {
    const ready = await requireObserver("Create an Observer Mask to add this Room to a Mood Board.");
    if (!ready?.token) return;
    setBoardOpen(true);
    try {
      const result = await listMoodBoards(ready.token);
      setBoards(result.items);
      if (result.items[0]) setBoardId(result.items[0].id);
    } catch {
      setBoards([]);
    }
  }

  async function addToBoard() {
    const ready = await requireObserver("Create an Observer Mask to add this Room to a Mood Board.");
    if (!ready?.token) return;
    setBusy("board");
    try {
      let targetId = typeof boardId === "number" ? boardId : null;
      if (!targetId) {
        const board = await createMoodBoard({
          title: newBoardTitle || "Saved Rooms",
          board_type: "saved_rooms",
          visibility: "private",
        }, ready.token);
        targetId = board.id;
        setBoards((current) => [board, ...current]);
      }
      await addMoodBoardItem(targetId, {
        item_type: "room",
        item_id: node.id,
        title: node.display_name,
        source_context: "Saved from public Room",
      }, ready.token);
      setStatus("Added to Mood Board.");
      setBoardOpen(false);
    } catch (err) {
      setStatus(errorMessage(err, "Could not add this Room to a Mood Board."));
    } finally {
      setBusy(null);
    }
  }

  async function leaveFieldNote() {
    const ready = await requireObserver("Create an Observer Mask to leave a Field Note.");
    if (!ready?.token) return;
    if (!fieldNote.trim()) {
      setStatus("Write a Field Note first.");
      return;
    }
    setBusy("note");
    try {
      await createFieldNote({ room_id: node.id, body: fieldNote, visibility: noteVisibility }, ready.token);
      setFieldNote("");
      setStatus("Field Note saved.");
    } catch (err) {
      setStatus(errorMessage(err, "Field Notes are traces, not ads."));
    } finally {
      setBusy(null);
    }
  }

  async function signalRoom(signalType: string) {
    const ready = await requireObserver("Create an Observer Mask to leave a Signal.");
    if (!ready?.token) return;
    setBusy(signalType);
    try {
      const signal = await createSignal({ target_type: "room", target_id: node.id, signal_type: signalType }, ready.token);
      setSignals((current) => ({ ...current, [signalType]: signal }));
      setStatus("Signal saved.");
    } catch (err) {
      setStatus(errorMessage(err, "Could not save this Signal."));
    } finally {
      setBusy(null);
    }
  }

  async function createMask() {
    if (!auth.token) return;
    setBusy("mask");
    try {
      const observer = await createObserverProfile({
        alias: observerAlias,
        bio_fragment: observerBio || undefined,
      }, auth.token);
      setAuth((current) => ({ ...current, observer }));
      setGateOpen(false);
      setStatus("Observer Mask ready.");
    } catch (err) {
      setStatus(errorMessage(err, PRESENCE_GRAPH_COPY.selfPromotionGuardrail));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8" data-presence-graph-actions>
      <div className="rounded-2xl border border-[var(--room-border)] bg-[var(--room-surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--room-muted)]">
              Presence Pass
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--room-text)]">
              Remember this Room
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--room-muted)]">
              {PRESENCE_GRAPH_COPY.observerExplainer}
            </p>
          </div>
          <Link
            href={`/paths/from-room/${node.id}`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--room-accent)] px-4 py-3 text-sm font-semibold text-[var(--room-accent-text)]"
          >
            <Compass className="h-4 w-4" />
            Walk a Path
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActionButton label={saved ? "Saved" : "Save Room"} icon={<Bookmark className="h-4 w-4" />} busy={busy === "save"} onClick={saveCurrentRoom} />
          <ActionButton label={following ? "Following" : "Follow"} icon={<Heart className="h-4 w-4" />} busy={busy === "follow"} onClick={followCurrentRoom} />
          <ActionButton label="Mood Board" icon={<FolderPlus className="h-4 w-4" />} busy={busy === "board"} onClick={openBoardChooser} />
          <ActionButton label="Field Note" icon={<PenLine className="h-4 w-4" />} busy={busy === "note"} onClick={() => document.getElementById("presence-field-note")?.focus()} />
        </div>

        {actionHint && (
          <p className="mt-4 rounded-xl bg-[var(--room-soft)] px-3 py-2 text-sm text-[var(--room-text)]">
            {actionHint}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--room-border)] bg-[var(--room-surface)] p-4">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-[var(--room-accent)]" />
            <h3 className="font-semibold text-[var(--room-text)]">Leave a Field Note</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--room-muted)]">Field Notes are traces, not ads.</p>
          <textarea
            id="presence-field-note"
            value={fieldNote}
            onChange={(event) => setFieldNote(event.target.value)}
            placeholder="What should you remember about this Room?"
            className="mt-4 min-h-28 w-full rounded-xl border border-[var(--room-border)] bg-[var(--room-bg)] px-3 py-2 text-sm text-[var(--room-text)] outline-none focus:ring-2 focus:ring-[var(--room-accent)]"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <select
              value={noteVisibility}
              onChange={(event) => setNoteVisibility(event.target.value as typeof noteVisibility)}
              className="rounded-xl border border-[var(--room-border)] bg-[var(--room-bg)] px-3 py-2 text-sm text-[var(--room-text)]"
            >
              <option value="public">Public trace</option>
              <option value="room_owner_only">Room owner only</option>
              <option value="private">Private memory</option>
            </select>
            <button
              type="button"
              onClick={() => void leaveFieldNote()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--room-accent)] px-4 py-2 text-sm font-semibold text-[var(--room-accent-text)]"
            >
              {busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              Save Field Note
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--room-border)] bg-[var(--room-surface)] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--room-accent)]" />
            <h3 className="font-semibold text-[var(--room-text)]">Signals</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--room-muted)]">Small, specific signals beat generic likes.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SIGNALS.map((signal) => (
              <button
                type="button"
                key={signal.type}
                onClick={() => void signalRoom(signal.type)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  signals[signal.type]
                    ? "border-[var(--room-accent)] bg-[var(--room-accent)] text-[var(--room-accent-text)]"
                    : "border-[var(--room-border)] text-[var(--room-text)] hover:border-[var(--room-accent)]"
                }`}
              >
                {busy === signal.type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {signal.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {boardOpen && (
        <div className="rounded-2xl border border-[var(--room-border)] bg-[var(--room-surface)] p-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-[var(--room-accent)]" />
            <h3 className="font-semibold text-[var(--room-text)]">{PRESENCE_GRAPH_COPY.moodBoard}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--room-muted)]">
            The Rooms and references you save here will shape future Paths.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              {boards.length > 0 && (
                <select
                  value={boardId}
                  onChange={(event) => setBoardId(event.target.value === "new" ? "new" : Number(event.target.value))}
                  className="rounded-xl border border-[var(--room-border)] bg-[var(--room-bg)] px-3 py-2 text-sm text-[var(--room-text)]"
                >
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>{board.title}</option>
                  ))}
                  <option value="new">Create new board</option>
                </select>
              )}
              {(boardId === "new" || boards.length === 0) && (
                <input
                  value={newBoardTitle}
                  onChange={(event) => setNewBoardTitle(event.target.value)}
                  className="rounded-xl border border-[var(--room-border)] bg-[var(--room-bg)] px-3 py-2 text-sm text-[var(--room-text)]"
                  placeholder="Board title"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => void addToBoard()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--room-accent)] px-4 py-2 text-sm font-semibold text-[var(--room-accent-text)]"
            >
              {busy === "board" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Room
            </button>
          </div>
        </div>
      )}

      {gateOpen && (
        <div className="rounded-2xl border border-[var(--room-border)] bg-[var(--room-surface)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--room-soft)] text-[var(--room-accent)]">
              <Mask className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--room-text)]">{PRESENCE_GRAPH_COPY.observerUpgrade}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--room-muted)]">{PRESENCE_GRAPH_COPY.observerExplainer}</p>

              {!auth.token ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Link href={buildSignInHref(returnTo)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--room-accent)] px-4 py-2 text-sm font-semibold text-[var(--room-accent-text)]">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={buildSignUpHref(returnTo)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--room-border)] px-4 py-2 text-sm font-semibold text-[var(--room-text)]">
                    Create account
                  </Link>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <input
                    value={observerAlias}
                    onChange={(event) => setObserverAlias(event.target.value)}
                    placeholder="alias, e.g. quiet-walker"
                    className="rounded-xl border border-[var(--room-border)] bg-[var(--room-bg)] px-3 py-2 text-sm text-[var(--room-text)]"
                  />
                  <textarea
                    value={observerBio}
                    onChange={(event) => setObserverBio(event.target.value)}
                    placeholder="Short bio fragment. No links or promotion."
                    className="min-h-20 rounded-xl border border-[var(--room-border)] bg-[var(--room-bg)] px-3 py-2 text-sm text-[var(--room-text)]"
                  />
                  <button
                    type="button"
                    onClick={() => void createMask()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--room-accent)] px-4 py-2 text-sm font-semibold text-[var(--room-accent-text)]"
                  >
                    {busy === "mask" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mask className="h-4 w-4" />}
                    Create Observer Mask
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ActionButton({
  label,
  icon,
  busy,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--room-border)] px-3 py-2 text-sm font-semibold text-[var(--room-text)] transition hover:border-[var(--room-accent)]"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof PresenceApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

