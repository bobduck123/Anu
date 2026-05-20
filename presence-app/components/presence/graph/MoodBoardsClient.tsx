"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FolderPlus, Loader2, Plus } from "lucide-react";
import { buildSignInHref } from "@/lib/auth/returnTo";
import { createMoodBoard, listMoodBoards } from "@/lib/api/presenceGraph";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { MoodBoard } from "@/lib/api/types";

const BOARD_TYPES = ["general", "influences", "saved_rooms", "event", "place", "material", "sound", "mood", "editorial"];

export function MoodBoardsClient() {
  const [token, setToken] = useState<string | null>(null);
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [boardType, setBoardType] = useState("general");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (!cancelled) setLoading(false);
        return;
      }
      setToken(session.access_token);
      try {
        const result = await listMoodBoards(session.access_token);
        if (!cancelled) setBoards(result.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Mood Boards.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createBoard() {
    if (!token || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const board = await createMoodBoard({ title, board_type: boardType, visibility: "private" }, token);
      setBoards((current) => [board, ...current]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create Mood Board.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 hover:text-stone-200">
          Presence
        </Link>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Mood Boards</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{PRESENCE_GRAPH_COPY.moodBoard}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
            The Rooms and references you save here will shape future Paths.
          </p>
        </header>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-300" /></div>
        ) : !token ? (
          <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
            <FolderPlus className="mb-4 h-7 w-7 text-orange-300" />
            <h2 className="text-2xl font-semibold">Create an Observer Mask to build Mood Boards.</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">{PRESENCE_GRAPH_COPY.observerExplainer}</p>
            <Link href={buildSignInHref("/observer/mood-boards")} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-stone-800 bg-stone-900 p-5">
              <h2 className="font-semibold">Create board</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Board title"
                  className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                />
                <select
                  value={boardType}
                  onChange={(event) => setBoardType(event.target.value)}
                  className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm outline-none"
                >
                  {BOARD_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => void createBoard()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:opacity-60"
                  disabled={busy || !title.trim()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </button>
              </div>
              {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
            </section>

            {boards.length === 0 ? (
              <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
                <h2 className="text-2xl font-semibold">No Mood Boards yet.</h2>
                <p className="mt-3 text-sm leading-6 text-stone-300">
                  Save a Room from its public page or create a board here to start mapping your taste.
                </p>
              </section>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {boards.map((board) => (
                  <Link key={board.id} href={`/observer/mood-boards/${board.id}`} className="rounded-3xl border border-stone-800 bg-stone-900 p-5 transition hover:border-orange-300/60">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{board.board_type.replace(/_/g, " ")}</p>
                    <h2 className="mt-2 text-xl font-semibold">{board.title}</h2>
                    {board.description && <p className="mt-2 text-sm leading-6 text-stone-300">{board.description}</p>}
                    <p className="mt-4 text-xs text-stone-500">{board.visibility}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

