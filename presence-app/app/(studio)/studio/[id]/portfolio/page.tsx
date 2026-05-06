"use client";

import { use, useState, useEffect } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { Loading, Button, Input, Textarea } from "@/components/ui";
import { updateNode } from "@/lib/api/owner";
import type { PresenceNodeInput } from "@/lib/api/types";

export default function StudioPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, reload } = useOwnerNode(nodeId);
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
      practice_statement: node.practice_statement ?? "",
      curatorial_statement: node.curatorial_statement ?? "",
      public_email: node.public_email ?? "",
      public_phone: node.public_phone ?? "",
      primary_cta_label: node.primary_cta_label ?? "",
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

  if (loading) return <Loading />;
  if (!node) return null;

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--p-studio-text)]">Portfolio</h2>
          <Button size="sm" loading={saving} onClick={() => void save()}>
            {saved ? "Saved ✓" : "Save"}
          </Button>
        </div>

        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Identity</h3>
          <Input label="Display name" value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
          <Input label="Headline" value={form.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
          <Input label="Location" value={form.location_label ?? ""} onChange={(e) => set("location_label", e.target.value)} />
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Media</h3>
          <Input label="Profile image URL" type="url" value={form.profile_image_url ?? ""} onChange={(e) => set("profile_image_url", e.target.value)} />
          <Input label="Cover image URL" type="url" value={form.cover_image_url ?? ""} onChange={(e) => set("cover_image_url", e.target.value)} />
          <p className="text-xs text-[var(--p-studio-muted)]">Use hosted image URLs (Unsplash, Supabase Storage, Cloudinary, Imgix). Direct upload coming later.</p>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">About</h3>
          <Textarea label="Bio" rows={4} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
          <Textarea label="Practice statement" rows={4} value={form.practice_statement ?? ""} onChange={(e) => set("practice_statement", e.target.value)} />
          <Textarea label="Curatorial statement" rows={4} value={form.curatorial_statement ?? ""} onChange={(e) => set("curatorial_statement", e.target.value)} />
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Contact</h3>
          <Input label="Public email" type="email" value={form.public_email ?? ""} onChange={(e) => set("public_email", e.target.value)} />
          <Input label="Public phone" type="tel" value={form.public_phone ?? ""} onChange={(e) => set("public_phone", e.target.value)} />
          <Input label="Primary CTA label" value={form.primary_cta_label ?? ""} onChange={(e) => set("primary_cta_label", e.target.value)} />
        </section>

        <div className="flex justify-end">
          <Button loading={saving} onClick={() => void save()}>
            {saved ? "Saved ✓" : "Save changes"}
          </Button>
        </div>
      </div>
    </StudioShell>
  );
}
