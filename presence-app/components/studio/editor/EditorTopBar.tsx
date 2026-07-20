"use client";

import Link from "next/link";
import { Eye, Globe, Loader2, Save, Send } from "lucide-react";

export function EditorTopBar({
  roomName,
  roomId,
  publicUrl,
  hasLiveRoom,
  dirty,
  saving,
  publishing,
  blockedCount,
  onSave,
  onOpenVisitors,
}: {
  roomName: string;
  roomId: number;
  publicUrl: string;
  hasLiveRoom: boolean;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  blockedCount: number;
  onSave: () => void;
  onOpenVisitors: () => void;
}) {
  const savedState = saving ? "Saving..." : dirty ? "Unsaved" : "All changes saved";

  return (
    <header className="bg-[#f5f0e8] px-5 py-5 text-[#211d19] sm:px-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#846747]">Presence Studio</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{roomName}</h1>
            <span className="text-xs font-semibold text-[#766a5e]">
              {hasLiveRoom ? "Live room open to visitors" : "Draft only - not yet open to visitors"}
            </span>
          </div>
          <p data-testid="topbar-save-state" className="mt-2 text-sm text-[#766a5e]">{savedState}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#26211c] px-4 py-2 text-sm font-semibold text-[#faf7f0] hover:bg-[#393126] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save your changes
            </button>
          )}
          <Link
            href={`/studio/${roomId}/editor/preview`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cabda9] px-4 py-2 text-sm font-semibold text-[#393126] hover:bg-[#ede5d7]"
          >
            <Eye className="h-4 w-4" />
            Preview your draft
          </Link>
          {!dirty && (
            <button
              type="button"
              data-testid="open-to-visitors-primary"
              disabled={publishing || blockedCount > 0}
              aria-describedby={blockedCount > 0 ? "publish-blocked-reason" : undefined}
              onClick={onOpenVisitors}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#317650] px-4 py-2 text-sm font-semibold text-white hover:bg-[#265e40] disabled:cursor-not-allowed disabled:bg-[#bdb4a7] disabled:text-[#655c51]"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {publishing ? "Opening your room..." : "Open room to visitors"}
            </button>
          )}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#766a5e] hover:bg-[#ede5d7]"
          >
            <Globe className="h-4 w-4" />
            Live room
          </a>
        </div>
      </div>
    </header>
  );
}
