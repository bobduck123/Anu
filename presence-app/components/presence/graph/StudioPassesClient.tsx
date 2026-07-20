"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Check, Copy, CreditCard, ExternalLink, Info, KeyRound, Lightbulb, Loader2, Pause, Play, Plus, ShieldOff } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";
import { createPresencePass, createRoomKey, listPresencePasses, listRoomKeys, updateRoomKey } from "@/lib/api/presenceGraph";
import { roomKeyPublicUrl } from "@/lib/presence/url";
import { PRESENCE_GRAPH_COPY, roomKeyTypeLabel, roomKeyUseHint } from "@/lib/presence/graph/copy";
import type { PresencePass, RoomKey } from "@/lib/api/types";

const PASS_TYPES = [
  { value: "nfc_card", label: "NFC Card" },
  { value: "qr", label: "QR Code" },
  { value: "badge", label: "Event Badge" },
  { value: "sticker", label: "Sticker" },
  { value: "poster", label: "Poster" },
  { value: "short_link", label: "Direct Share" },
];

const KEY_TYPES = [
  { value: "nfc", label: "NFC Card / Sticker" },
  { value: "qr", label: "QR Poster / Sign" },
  { value: "badge", label: "Event Badge" },
  { value: "sticker", label: "Sticker" },
  { value: "poster", label: "Poster" },
  { value: "short_link", label: "Direct Share" },
  { value: "direct", label: "Direct Share" },
];

export function StudioPassesClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);
  const [passes, setPasses] = useState<PresencePass[]>([]);
  const [keys, setKeys] = useState<RoomKey[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passType, setPassType] = useState("nfc_card");
  const [passLabel, setPassLabel] = useState("Launch Presence Pass");
  const [keyType, setKeyType] = useState("nfc");
  const [keyLabel, setKeyLabel] = useState("First NFC card");
  const [copiedKey, setCopiedKey] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    void reload(token);
  }, [nodeId, token]);

  async function reload(authToken = token) {
    if (!authToken) return;
    const [passList, keyList] = await Promise.all([
      listPresencePasses(nodeId, authToken),
      listRoomKeys(nodeId, authToken),
    ]);
    setPasses(passList.items);
    setKeys(keyList.items);
  }

  async function createPass() {
    if (!token) return;
    setBusy("pass");
    try {
      await createPresencePass(nodeId, { pass_type: passType, label: passLabel }, token);
      setMessage("Presence Pass created.");
      await reload(token);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create Presence Pass.");
    } finally {
      setBusy(null);
    }
  }

  async function createKey() {
    if (!token) return;
    setBusy("key");
    try {
      await createRoomKey(nodeId, { key_type: keyType, campaign_label: keyLabel }, token);
      // Sentence starts with "Room Key created." for downstream substring
      // matching in tests + screen-reader status; the second sentence gives
      // owners practical confirmation of what to do next.
      setMessage(`Room Key created. Ready for ${roomKeyTypeLabel(keyType)}.`);
      await reload(token);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create Room Key.");
    } finally {
      setBusy(null);
    }
  }

  async function setKeyStatus(key: RoomKey, status: string) {
    if (!token) return;
    setBusy(`key-${key.id}`);
    try {
      await updateRoomKey(nodeId, key.id, { status }, token);
      setMessage(`Room Key ${status}.`);
      await reload(token);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update Room Key.");
    } finally {
      setBusy(null);
    }
  }

  async function copyUrl(key: RoomKey) {
    const url = key.public_token ? roomKeyPublicUrl(key.public_token) : "";
    if (!url || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard?.writeText(url);
      setCopiedKey(key.id);
      window.setTimeout(() => setCopiedKey((current) => (current === key.id ? null : current)), 1600);
    } catch {
      setMessage("Could not access clipboard.");
    }
  }

  if (loading) return <Loading label="Loading Presence Passes..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/passes`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">Presence Pass</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--p-studio-text)]">NFC, QR, badge, sticker, poster</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--p-studio-muted)]">{PRESENCE_GRAPH_COPY.presencePass}</p>
        </header>

        {/* Best-practice callout — owners often create one key and lose all source attribution */}
        <aside className="flex items-start gap-3 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--p-studio-accent)]" aria-hidden />
          <div className="min-w-0 text-sm leading-6 text-[var(--p-studio-muted)]">
            <p className="font-semibold text-[var(--p-studio-text)]">One key per surface keeps analytics clean.</p>
            <p className="mt-1">
              Create separate Room Keys for each NFC card batch, QR poster, or event so you can tell which Encounter came from where. Labels appear in your Studio analytics.
            </p>
          </div>
        </aside>

        {message && (
          <p
            className="rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-3 text-sm text-[var(--p-studio-text)]"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[var(--p-studio-accent)]" aria-hidden />
              <h3 className="font-semibold">Create Presence Pass</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--p-studio-muted)]">
              A Pass groups the physical artefact (one NFC card batch, one poster run) that visitors will tap or scan.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--p-studio-muted)]">
                Pass label
                <input
                  value={passLabel}
                  onChange={(event) => setPassLabel(event.target.value)}
                  className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm font-normal text-[var(--p-studio-text)] outline-none focus:border-[var(--p-studio-accent)]"
                  placeholder="e.g. Spring residency NFC batch"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--p-studio-muted)]">
                Surface type
                <select
                  value={passType}
                  onChange={(event) => setPassType(event.target.value)}
                  className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm font-normal text-[var(--p-studio-text)] outline-none focus:border-[var(--p-studio-accent)]"
                >
                  {PASS_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void createPass()}
                disabled={busy === "pass" || !passLabel.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 disabled:opacity-60"
              >
                {busy === "pass" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                Create Pass
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[var(--p-studio-accent)]" aria-hidden />
              <h3 className="font-semibold">Create Room Key</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--p-studio-muted)]">
              A Room Key is the URL that opens this Room from a single channel. Each key has its own analytics.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--p-studio-muted)]">
                Key label
                <input
                  value={keyLabel}
                  onChange={(event) => setKeyLabel(event.target.value)}
                  className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm font-normal text-[var(--p-studio-text)] outline-none focus:border-[var(--p-studio-accent)]"
                  placeholder="e.g. Opening night badges"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--p-studio-muted)]">
                Channel
                <select
                  value={keyType}
                  onChange={(event) => setKeyType(event.target.value)}
                  className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm font-normal text-[var(--p-studio-text)] outline-none focus:border-[var(--p-studio-accent)]"
                >
                  {KEY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              {/* Live preview of the practical microcopy the owner will see on the key card */}
              <p className="rounded-xl border border-dashed border-[var(--p-studio-border)] bg-black/15 p-3 text-xs leading-5 text-[var(--p-studio-muted)]">
                <span className="font-semibold text-[var(--p-studio-text)]">{roomKeyTypeLabel(keyType)}: </span>
                {roomKeyUseHint(keyType)}
              </p>
              <button
                type="button"
                onClick={() => void createKey()}
                disabled={busy === "key" || !keyLabel.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 disabled:opacity-60"
              >
                {busy === "key" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                Create Key
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Room Keys</h3>
            <Link
              href={`/studio/${nodeId}/qr`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--p-studio-accent)] hover:underline"
            >
              QR codes & downloads
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          {keys.length === 0 ? (
            <EmptyKeyState />
          ) : (
            <div className="mt-4 grid gap-3">
              {keys.map((key) => {
                const url = key.public_token ? roomKeyPublicUrl(key.public_token) : "";
                const status = (key.status ?? "active").toLowerCase();
                const isPaused = status === "paused";
                const isRevoked = status === "revoked";
                return (
                  <article key={key.id} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/15 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--p-studio-text)]">
                            {key.campaign_label || roomKeyTypeLabel(key.key_type)}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              isRevoked
                                ? "bg-red-900/40 text-red-200"
                                : isPaused
                                  ? "bg-amber-900/40 text-amber-200"
                                  : "bg-emerald-900/40 text-emerald-200"
                            }`}
                          >
                            {status}
                          </span>
                          <span className="text-xs uppercase tracking-[0.14em] text-[var(--p-studio-muted)]">
                            {roomKeyTypeLabel(key.key_type)}
                          </span>
                        </div>
                        <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-[var(--p-studio-muted)]">
                          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                          <span>{roomKeyUseHint(key.key_type)}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void copyUrl(key)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--p-studio-accent)]/60"
                          aria-label={`Copy URL for ${key.campaign_label || roomKeyTypeLabel(key.key_type)}`}
                        >
                          {copiedKey === key.id ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                          {copiedKey === key.id ? "Copied" : "Copy URL"}
                        </button>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--p-studio-accent)]/60"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            Open
                          </a>
                        )}
                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => void setKeyStatus(key, isPaused ? "active" : "paused")}
                            disabled={busy === `key-${key.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold disabled:opacity-60"
                          >
                            {isPaused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
                            {isPaused ? "Resume" : "Pause"}
                          </button>
                        )}
                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => void setKeyStatus(key, "revoked")}
                            disabled={busy === `key-${key.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-60"
                          >
                            <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                    {url && (
                      <p
                        className="mt-3 break-all rounded-xl bg-black/25 px-3 py-2 font-mono text-xs text-[var(--p-studio-muted)]"
                        title="Public Room Key URL"
                      >
                        {url}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="font-semibold">Presence Passes</h3>
          {passes.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">
              No Presence Passes yet. A Pass represents a physical batch — an NFC card order, a printed poster run, a sticker run — so you can pair it with a Room Key for clean attribution.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {passes.map((pass) => (
                <article key={pass.id} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/15 p-4">
                  <p className="font-semibold text-[var(--p-studio-text)]">{pass.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--p-studio-muted)]">
                    {(pass.status ?? "active")} · {roomKeyTypeLabel(pass.pass_type)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudioShell>
  );
}

function EmptyKeyState() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[var(--p-studio-border)] bg-black/10 p-5">
      <p className="text-sm font-semibold text-[var(--p-studio-text)]">No Room Keys yet.</p>
      <p className="mt-2 text-sm leading-6 text-[var(--p-studio-muted)]">
        Create one key per surface so you can tell tap-from-poster from tap-from-NFC in your analytics. A few common starts:
      </p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--p-studio-muted)] sm:grid-cols-2">
        {[
          { label: "Studio door NFC sticker", hint: "Visitors tap on arrival." },
          { label: "Business card NFC card", hint: "Hand out at meetings." },
          { label: "Opening-night QR badge", hint: "Pinned to a lanyard." },
          { label: "Workshop handout QR", hint: "Printed at the bottom of a sheet." },
        ].map((item) => (
          <li key={item.label} className="rounded-xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-3">
            <p className="font-medium text-[var(--p-studio-text)]">{item.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--p-studio-muted)]">{item.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
