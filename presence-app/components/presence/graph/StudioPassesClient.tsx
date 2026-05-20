"use client";

import { use, useEffect, useState } from "react";
import { Copy, CreditCard, KeyRound, Loader2, Pause, Plus, ShieldOff } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";
import { createPresencePass, createRoomKey, listPresencePasses, listRoomKeys, updateRoomKey } from "@/lib/api/presenceGraph";
import { roomKeyPublicUrl } from "@/lib/presence/url";
import { PRESENCE_GRAPH_COPY } from "@/lib/presence/graph/copy";
import type { PresencePass, RoomKey } from "@/lib/api/types";

const PASS_TYPES = ["nfc_card", "qr", "badge", "sticker", "poster", "short_link"];
const KEY_TYPES = ["nfc", "qr", "badge", "sticker", "poster", "short_link", "direct"];

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
      setMessage("Room Key created.");
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

        {message && <p className="rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-3 text-sm text-[var(--p-studio-text)]">{message}</p>}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[var(--p-studio-accent)]" />
              <h3 className="font-semibold">Create Presence Pass</h3>
            </div>
            <div className="mt-4 grid gap-3">
              <input value={passLabel} onChange={(event) => setPassLabel(event.target.value)} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm outline-none" />
              <select value={passType} onChange={(event) => setPassType(event.target.value)} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm outline-none">
                {PASS_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}
              </select>
              <button type="button" onClick={() => void createPass()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950">
                {busy === "pass" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Pass
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[var(--p-studio-accent)]" />
              <h3 className="font-semibold">Create Room Key</h3>
            </div>
            <div className="mt-4 grid gap-3">
              <input value={keyLabel} onChange={(event) => setKeyLabel(event.target.value)} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm outline-none" />
              <select value={keyType} onChange={(event) => setKeyType(event.target.value)} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm outline-none">
                {KEY_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}
              </select>
              <button type="button" onClick={() => void createKey()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950">
                {busy === "key" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Key
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="font-semibold">Room Keys</h3>
          {keys.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">No Room Keys yet. Create one for an NFC card, QR poster, badge, sticker, or direct share.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {keys.map((key) => {
                const url = key.public_token ? roomKeyPublicUrl(key.public_token) : "";
                return (
                  <article key={key.id} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/15 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{key.campaign_label || key.key_type.replace(/_/g, " ")}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--p-studio-muted)]">{key.status} · {key.key_type}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void navigator.clipboard?.writeText(url)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold">
                          <Copy className="h-3.5 w-3.5" />
                          Copy URL
                        </button>
                        <button type="button" onClick={() => void setKeyStatus(key, "paused")} className="inline-flex items-center gap-2 rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold">
                          <Pause className="h-3.5 w-3.5" />
                          Pause
                        </button>
                        <button type="button" onClick={() => void setKeyStatus(key, "revoked")} className="inline-flex items-center gap-2 rounded-xl border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-200">
                          <ShieldOff className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      </div>
                    </div>
                    {url && <p className="mt-3 break-all rounded-xl bg-black/25 px-3 py-2 font-mono text-xs text-[var(--p-studio-muted)]">{url}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="font-semibold">Presence Passes</h3>
          {passes.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">No Presence Passes yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {passes.map((pass) => (
                <article key={pass.id} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/15 p-4">
                  <p className="font-semibold">{pass.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--p-studio-muted)]">{pass.status} · {pass.pass_type.replace(/_/g, " ")}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudioShell>
  );
}

