"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { buildSignInHref } from "@/lib/auth/returnTo";
import { generatePathFromMoodBoard, getMoodBoard, removeMoodBoardItem } from "@/lib/api/presenceGraph";
import { createClient } from "@/lib/supabase/client";
import type { MoodBoard, PresencePath } from "@/lib/api/types";

export function MoodBoardDetailClient({ boardId }: { boardId: number }) {
  const [token, setToken] = useState<string | null>(null);
  const [board, setBoard] = useState<MoodBoard | null>(null);
  const [generatedPath, setGeneratedPath] = useState<PresencePath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const result = await getMoodBoard(boardId, session.access_token);
        if (!cancelled) setBoard(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Mood Board.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  async function removeItem(itemId: number) {
    if (!token || !board) return;
    await removeMoodBoardItem(board.id, itemId, token);
    setBoard({ ...board, items: (board.items ?? []).filter((item) => item.id !== itemId) });
  }

  async function generatePath() {
    setError(null);
    try {
      const path = await generatePathFromMoodBoard(boardId);
      setGeneratedPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a Path from this board.");
    }
  }

  if (loading) {
    return <main className="flex min-h-dvh items-center justify-center bg-stone-950 text-stone-50"><Loader2 className="h-7 w-7 animate-spin text-orange-300" /></main>;
  }
  if (!token) {
    return (
      <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50">
        <div className="mx-auto max-w-lg rounded-3xl border border-stone-800 bg-stone-900 p-6">
          <h1 className="text-2xl font-semibold">Sign in to view this Mood Board.</h1>
          <Link href={buildSignInHref(`/observer/mood-boards/${boardId}`)} className="mt-5 inline-flex rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950">Sign in</Link>
        </div>
      </main>
    );
  }
  if (!board) {
    return <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50"><p>{error || "Mood Board not found."}</p></main>;
  }

  return (
    <main className="min-h-dvh bg-stone-950 px-4 py-8 text-stone-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link href="/observer/mood-boards" className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 hover:text-stone-200">
          Mood Boards
        </Link>
        <header className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{board.board_type.replace(/_/g, " ")}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{board.title}</h1>
          {board.description && <p className="mt-3 text-sm leading-6 text-stone-300">{board.description}</p>}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void generatePath()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 py-3 text-sm font-semibold text-stone-950">
              Generate a Path from this Board
              <ArrowRight className="h-4 w-4" />
            </button>
            {generatedPath && (
              <Link href={`/paths/${generatedPath.id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100">
                Open generated Path
              </Link>
            )}
          </div>
        </header>
        {error && <p className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-100">{error}</p>}

        {(board.items ?? []).length === 0 ? (
          <section className="rounded-3xl border border-stone-800 bg-stone-900 p-6">
            <h2 className="text-2xl font-semibold">This board is empty.</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">Add Rooms from public Room pages to make this board shape a future Path.</p>
          </section>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2">
            {(board.items ?? []).map((item) => (
              <article key={item.id} className="rounded-3xl border border-stone-800 bg-stone-900 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{item.item_type.replace(/_/g, " ")}</p>
                <h2 className="mt-2 text-lg font-semibold">{item.title || `Item ${item.id}`}</h2>
                {item.description && <p className="mt-2 text-sm leading-6 text-stone-300">{item.description}</p>}
                <button type="button" onClick={() => void removeItem(item.id)} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-red-200">
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

