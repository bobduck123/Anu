"use client";

import { use, useEffect, useState } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import PresenceMediaSlot from "@/components/studio/PresenceMediaSlot";
import { Loading, Button, Input, Textarea } from "@/components/ui";
import { updateNode } from "@/lib/api/owner";
import type { PresenceMediaUploadResult, PresenceNodeInput } from "@/lib/api/types";

export default function StudioPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired, reload } = useOwnerNode(nodeId);
  const [form, setForm] = useState<PresenceNodeInput>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!node) return;
    setForm({
      display_name: node.display_name,
      headline: node.headline ?? "",
      bio: node.bio ?? "",
      location_label: node.location_label ?? "",
      profile_image_url: node.profile_image_url ?? "",
      cover_image_url: node.cover_image_url ?? "",
      landing_background_url: node.landing_background_url ?? "",
      practice_statement: node.practice_statement ?? "",
      curatorial_statement: node.curatorial_statement ?? "",
      public_email: node.public_email ?? "",
      public_phone: node.public_phone ?? "",
      primary_cta_label: node.primary_cta_label ?? "",
      primary_cta_url: node.primary_cta_url ?? "",
    });
  }, [node]);

  function set(key: keyof PresenceNodeInput, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      await updateNode(nodeId, form, token);
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function syncMedia(result: PresenceMediaUploadResult) {
    if (!result.field) return;
    setForm((f) => ({ ...f, [result.field]: result.url ?? "" }));
    void reload();
  }

  if (loading) return <Loading label="Loading your Presence..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/portfolio`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
              Public identity
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--p-studio-text)]">
              Shape your Presence
            </h2>
          </div>
          <Button size="sm" loading={saving} onClick={() => void save()}>
            {saved ? "Saved" : "Save"}
          </Button>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Identity</h3>
          <Input label="Display name" value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
          <Input label="Headline" value={form.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
          <Input label="Location" value={form.location_label ?? ""} onChange={(e) => set("location_label", e.target.value)} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Media</h3>
          <PresenceMediaSlot
            label="Profile image"
            description="A face, mark, practice portrait, or object that identifies this Presence."
            currentUrl={form.profile_image_url}
            targetType="profile_image"
            nodeId={nodeId}
            token={token}
            aspectHint="aspect-square"
            recommendedSize="Recommended: square image, at least 900 px."
            publicVisibilityNote={node.status === "published" ? "Visible on the public page after upload." : "Kept inside your private draft until publish."}
            onUploaded={syncMedia}
            onCleared={syncMedia}
            onManualUrlChange={(url) => set("profile_image_url", url)}
          />
          <PresenceMediaSlot
            label="Cover image"
            description="A wide anchor image for your public page, gallery cards, and launch preview."
            currentUrl={form.cover_image_url}
            targetType="cover_image"
            nodeId={nodeId}
            token={token}
            aspectHint="aspect-[16/9]"
            recommendedSize="Recommended: landscape image, at least 1600 px wide."
            publicVisibilityNote={node.status === "published" ? "Visible on the public page after upload." : "Kept inside your private draft until publish."}
            onUploaded={syncMedia}
            onCleared={syncMedia}
            onManualUrlChange={(url) => set("cover_image_url", url)}
          />
          <PresenceMediaSlot
            label="Landing background"
            description="Optional first-screen atmosphere for Presence templates that use an entry view."
            currentUrl={form.landing_background_url}
            targetType="landing_background"
            nodeId={nodeId}
            token={token}
            aspectHint="aspect-[16/10]"
            recommendedSize="Recommended: calm, uncrowded image, at least 1600 px wide."
            publicVisibilityNote={node.status === "published" ? "Used only by templates that enable the landing screen." : "Kept inside your private draft until publish."}
            onUploaded={syncMedia}
            onCleared={syncMedia}
            onManualUrlChange={(url) => set("landing_background_url", url)}
          />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">World statement</h3>
          <Textarea label="Bio" rows={4} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
          <Textarea label="Practice statement" rows={4} value={form.practice_statement ?? ""} onChange={(e) => set("practice_statement", e.target.value)} />
          <Textarea label="Curatorial statement" rows={4} value={form.curatorial_statement ?? ""} onChange={(e) => set("curatorial_statement", e.target.value)} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Conversation route</h3>
          <Input label="Public email" type="email" value={form.public_email ?? ""} onChange={(e) => set("public_email", e.target.value)} />
          <Input label="Public phone" type="tel" value={form.public_phone ?? ""} onChange={(e) => set("public_phone", e.target.value)} />
          <Input label="Primary CTA label" value={form.primary_cta_label ?? ""} onChange={(e) => set("primary_cta_label", e.target.value)} />
          <Input label="Primary CTA URL" type="url" value={form.primary_cta_url ?? ""} onChange={(e) => set("primary_cta_url", e.target.value)} />
        </section>

        <div className="flex justify-end">
          <Button loading={saving} onClick={() => void save()}>
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </div>
    </StudioShell>
  );
}
