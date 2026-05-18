"use client";

import { use, useEffect, useState } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import PresenceMediaSlot from "@/components/studio/PresenceMediaSlot";
import { Loading, Button, Input, Textarea } from "@/components/ui";
import { updateNode } from "@/lib/api/owner";
import type { PresenceMediaEmbed, PresenceMediaUploadResult, PresenceNodeInput } from "@/lib/api/types";
import { canonicalPublicUrl } from "@/lib/presence/url";

const ROOM_TYPES = [
  ["", "Legacy Presence Node"],
  ["minimal_card", "Minimal Card Room"],
  ["artist_studio", "Artist Studio Room"],
  ["practitioner", "Practitioner Room"],
  ["performer_music", "Performer / Music Room"],
  ["organisation", "Organisation Room"],
] as const;

const THEME_PRESETS = [
  ["clean_light", "Clean Light"],
  ["editorial_dark", "Editorial Dark"],
  ["warm_earth", "Warm Earth"],
  ["gallery_white", "Gallery White"],
  ["neon_night", "Neon Night"],
  ["soft_healing", "Soft Healing"],
  ["cultural_org", "Cultural Organisation"],
  ["minimal_mono", "Minimal Mono"],
] as const;

export default function StudioPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired, reload } = useOwnerNode(nodeId);
  const [form, setForm] = useState<PresenceNodeInput>({});
  const [mediaEmbedsJson, setMediaEmbedsJson] = useState("[]");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      room_type: node.room_type ?? "",
      theme_preset: node.theme_preset ?? "clean_light",
      accent_color: node.accent_color ?? "",
      hero_title: node.hero_title ?? "",
      hero_subtitle: node.hero_subtitle ?? "",
      hero_image_url: node.hero_image_url ?? "",
      short_bio: node.short_bio ?? "",
      long_story: node.long_story ?? "",
      enquiry_email: node.enquiry_email ?? "",
      availability_status: node.availability_status ?? "",
      featured_notice: node.featured_notice ?? "",
      seo_title: node.seo_title ?? node.seo?.title ?? "",
      seo_description: node.seo_description ?? node.seo?.description ?? "",
      social_preview_image_url: node.social_preview_image_url ?? node.seo?.image ?? "",
    });
    setMediaEmbedsJson(JSON.stringify(node.media_embeds ?? [], null, 2));
  }, [node]);

  function set(key: keyof PresenceNodeInput, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setSaveError(null);
  }

  async function save() {
    if (!token) return;
    let media_embeds: PresenceMediaEmbed[] = [];
    try {
      const parsed = JSON.parse(mediaEmbedsJson || "[]");
      if (!Array.isArray(parsed)) throw new Error("Media embeds must be an array.");
      media_embeds = parsed;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Media embeds must be valid JSON.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateNode(nodeId, { ...form, media_embeds }, token);
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save Presence Room fields.");
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

  const publicUrl = canonicalPublicUrl(node.slug);

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
        {saveError && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {saveError}
          </p>
        )}

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Room setup</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--p-studio-muted)]">
                Presence Rooms are controlled templates layered on top of this Presence Node.
              </p>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl border border-[var(--p-studio-border)] px-3 py-1.5 text-xs font-semibold text-[var(--p-studio-text)] hover:border-[var(--p-studio-accent)]"
            >
              Preview
            </a>
          </div>
          <SelectField
            label="Room type"
            value={String(form.room_type ?? "")}
            options={ROOM_TYPES}
            onChange={(value) => set("room_type", value)}
          />
          <SelectField
            label="Theme preset"
            value={String(form.theme_preset ?? "clean_light")}
            options={THEME_PRESETS}
            onChange={(value) => set("theme_preset", value)}
          />
          <Input label="Accent colour" placeholder="#315f72" value={form.accent_color ?? ""} onChange={(e) => set("accent_color", e.target.value)} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Identity</h3>
          <Input label="Display name" value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
          <Input label="Headline" value={form.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
          <Input label="Hero title" value={form.hero_title ?? ""} onChange={(e) => set("hero_title", e.target.value)} />
          <Input label="Hero subtitle" value={form.hero_subtitle ?? ""} onChange={(e) => set("hero_subtitle", e.target.value)} />
          <Input label="Location" value={form.location_label ?? ""} onChange={(e) => set("location_label", e.target.value)} />
          <Input label="Availability status" value={form.availability_status ?? ""} onChange={(e) => set("availability_status", e.target.value)} />
          <Textarea label="Featured notice" rows={3} value={form.featured_notice ?? ""} onChange={(e) => set("featured_notice", e.target.value)} />
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
          <Input label="Hero image URL" type="url" value={form.hero_image_url ?? ""} onChange={(e) => set("hero_image_url", e.target.value)} />
          <Input label="Social preview image URL" type="url" value={form.social_preview_image_url ?? ""} onChange={(e) => set("social_preview_image_url", e.target.value)} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">World statement</h3>
          <Textarea label="Short bio" rows={3} value={form.short_bio ?? ""} onChange={(e) => set("short_bio", e.target.value)} />
          <Textarea label="Long room story" rows={5} value={form.long_story ?? ""} onChange={(e) => set("long_story", e.target.value)} />
          <Textarea label="Bio" rows={4} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
          <Textarea label="Practice statement" rows={4} value={form.practice_statement ?? ""} onChange={(e) => set("practice_statement", e.target.value)} />
          <Textarea label="Curatorial statement" rows={4} value={form.curatorial_statement ?? ""} onChange={(e) => set("curatorial_statement", e.target.value)} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Conversation route</h3>
          <Input label="Room enquiry inbox" type="email" value={form.enquiry_email ?? ""} onChange={(e) => set("enquiry_email", e.target.value)} />
          <Input label="Public email" type="email" value={form.public_email ?? ""} onChange={(e) => set("public_email", e.target.value)} />
          <Input label="Public phone" type="tel" value={form.public_phone ?? ""} onChange={(e) => set("public_phone", e.target.value)} />
          <Input label="Primary CTA label" value={form.primary_cta_label ?? ""} onChange={(e) => set("primary_cta_label", e.target.value)} />
          <Input label="Primary CTA URL" type="url" value={form.primary_cta_url ?? ""} onChange={(e) => set("primary_cta_url", e.target.value)} />
          <p className="text-xs leading-5 text-[var(--p-studio-muted)]">
            Enquiries route to the room enquiry inbox first, then public email, then the owner email if no room inbox is set.
          </p>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Media embeds</h3>
          <Textarea
            label="Embed JSON"
            rows={7}
            value={mediaEmbedsJson}
            onChange={(event) => {
              setMediaEmbedsJson(event.target.value);
              setSaved(false);
              setSaveError(null);
            }}
          />
          <p className="text-xs leading-5 text-[var(--p-studio-muted)]">
            Use an array of safe media links. Example: {`[{"label":"Latest mix","url":"https://soundcloud.com/example/demo","type":"audio"}]`}.
            The backend accepts only whitelisted media hosts.
          </p>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-5">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">SEO</h3>
          <Input label="SEO title" value={form.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} />
          <Textarea label="SEO description" rows={3} value={form.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} />
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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--p-text-muted)] uppercase tracking-wide">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2 text-sm text-[var(--p-text)] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[var(--p-accent)]"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "legacy"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
