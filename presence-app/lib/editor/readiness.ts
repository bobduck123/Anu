import type { PresenceEditableConfig, PresenceEditorOverview, PresenceNode } from "@/lib/api/types";
import { validateAssetUrl } from "./assetValidator";
import { diffEditableConfigs } from "./diffEngine";

export type ReadinessSeverity = "critical" | "recommended" | "polish";

export interface ReadinessIssue {
  id: string;
  severity: ReadinessSeverity;
  label: string;
  detail: string;
  tabId: string;
}

export interface ImprovementTip {
  id: string;
  tone: "urgent" | "suggestion" | "polish";
  message: string;
  tabId: string;
}

export interface ReadinessReport {
  percentage: number;
  issues: ReadinessIssue[];
  critical: ReadinessIssue[];
  recommended: ReadinessIssue[];
  polish: ReadinessIssue[];
  tips: ImprovementTip[];
  changedCount: number;
  hasBlockingIssues: boolean;
}

export interface ReadinessInput {
  config: PresenceEditableConfig;
  overview: PresenceEditorOverview | null;
  node: PresenceNode;
  dirty: boolean;
  mobilePreviewReviewed?: boolean;
}

export function buildReadinessReport({
  config,
  overview,
  node,
  dirty,
  mobilePreviewReviewed = false,
}: ReadinessInput): ReadinessReport {
  const issues: ReadinessIssue[] = [];
  const artwork = sceneById(config, "artwork_field");
  const calling = sceneById(config, "calling_card");
  const hero = asRecord(recordAt(config.asset_config, "hero_image"));
  const works = getWorks(config, node);
  const visibleWorks = works.filter((work) => work.is_visible !== false);
  const contact = asRecord(recordAt(config.content_config, "contact"));
  const enquiry = asRecord(config.enquiry_config);
  const motion = asRecord(config.motion_config);

  add(!text(artwork.title), "missing-title", "critical", "Scene 01 needs a room title.", "Visitors need a clear entrance title.", "scenes");
  add(
    !text(hero.url) && !visibleWorks.some((work) => text(work.url) || text(work.image_url)),
    "missing-primary-image",
    "critical",
    "Primary artwork or hero image is missing.",
    "The room needs a visual anchor before it is ready for visitors.",
    "assets",
  );
  add(
    !text(enquiry.cta_label) && !text(calling.enquiry_cta) && !text(recordAt(artwork.action_labels, "primary")),
    "missing-primary-cta",
    "critical",
    "Primary invitation is missing.",
    "Add the action language visitors use to begin a conversation.",
    "calling-card",
  );
  add(
    !text(enquiry.delivery_posture),
    "missing-enquiry-routing",
    "critical",
    "Enquiry routing is not configured.",
    "Keep visitor contact routed through the backend Presence enquiry posture.",
    "calling-card",
  );
  add(!overview?.published, "no-published-config", "critical", "No published editable config exists.", "Public rooms will fall back to renderer constants until the first publish.", "preview");

  add(visibleWorks.length === 0, "empty-work-wall", "recommended", "Work Wall is empty.", "Add at least one visible work so the room feels inhabited.", "work-wall");
  add(Boolean(text(hero.url)) && !text(hero.alt_text), "missing-hero-alt", "recommended", "Hero image alt text is missing.", "Alt text keeps the room legible to assistive technology.", "assets");
  for (const work of visibleWorks) {
    if (Boolean(text(work.url) || text(work.image_url) || text(work.thumbnail_url)) && !text(work.alt_text)) {
      add(true, `missing-alt-${text(work.slug) || text(work.title)}`, "recommended", `Alt text is missing for ${text(work.title) || "a visible work"}.`, "Every public work image should carry safe descriptive alt text.", "work-wall");
      break;
    }
  }

  for (const url of collectAssetUrls(config)) {
    const result = validateAssetUrl(url);
    if (!result.isValid) {
      add(true, `unsafe-asset-${hash(url)}`, "critical", result.errors[0] ?? "Unsafe asset URL.", url, "assets");
    }
  }

  for (const link of arrayRecords(contact.external_links)) {
    const url = text(link.url);
    if (url && !isSafeExternalUrl(url)) {
      add(true, `broken-link-${hash(url)}`, "recommended", "External link needs review.", `Link is not a safe public https URL: ${url}`, "calling-card");
    }
  }

  add(boolean(motion.heavy_motion_enabled, false), "heavy-motion-enabled", "polish", "Heavy motion is enabled.", "Keep this opt-in and verify reduced-motion behavior before opening the room.", "motion");
  add(dirty, "unsaved-local-changes", "recommended", "There are unsaved draft changes.", "Save the draft before previewing or opening the room to visitors.", "overview");

  const changedCount = diffEditableConfigs(overview?.published_public_config ?? overview?.published, config).length;
  add(changedCount > 0, "unpublished-changes", "recommended", "Draft differs from the live room.", "Review the draft-vs-published comparison before opening the room to visitors.", "preview");
  add(!mobilePreviewReviewed, "mobile-preview-not-reviewed", "polish", "Mobile preview has not been reviewed in this session.", "Check the small viewport before publishing visual changes.", "preview");

  const critical = issues.filter((issue) => issue.severity === "critical");
  const recommended = issues.filter((issue) => issue.severity === "recommended");
  const polish = issues.filter((issue) => issue.severity === "polish");
  const percentage = Math.max(0, Math.min(100, 100 - critical.length * 18 - recommended.length * 7 - polish.length * 3));

  return {
    percentage,
    issues,
    critical,
    recommended,
    polish,
    tips: buildTips(issues),
    changedCount,
    hasBlockingIssues: critical.length > 0,
  };

  function add(condition: boolean, id: string, severity: ReadinessSeverity, label: string, detail: string, tabId: string) {
    if (condition && !issues.some((issue) => issue.id === id)) {
      issues.push({ id, severity, label, detail, tabId });
    }
  }
}

function buildTips(issues: ReadinessIssue[]): ImprovementTip[] {
  return issues.slice(0, 6).map((issue) => ({
    id: `tip-${issue.id}`,
    tone: issue.severity === "critical" ? "urgent" : issue.severity === "recommended" ? "suggestion" : "polish",
    message: issue.severity === "critical" ? `Resolve before publishing: ${issue.label}` : issue.label,
    tabId: issue.tabId,
  }));
}

function collectAssetUrls(config: PresenceEditableConfig): string[] {
  const urls: string[] = [];
  const hero = asRecord(recordAt(config.asset_config, "hero_image"));
  const push = (value: unknown) => {
    const next = text(value);
    if (next) urls.push(next);
  };
  push(hero.url);
  for (const work of arrayRecords(recordAt(config.asset_config, "artworks"))) {
    push(work.url);
    push(work.image_url);
    push(work.thumbnail_url);
  }
  for (const asset of arrayRecords(recordAt(config.asset_config, "attached_assets"))) {
    push(asset.url);
  }
  for (const asset of arrayRecords(recordAt(config.asset_config, "texture_assets"))) {
    push(asset.url);
  }
  return Array.from(new Set(urls));
}

function getWorks(config: PresenceEditableConfig, node: PresenceNode): Record<string, unknown>[] {
  const assetWorks = arrayRecords(recordAt(config.asset_config, "artworks"));
  const contentWorks = arrayRecords(recordAt(config.content_config, "works"));
  if (assetWorks.length > 0) return assetWorks;
  if (contentWorks.length > 0) return contentWorks;
  return (node.works ?? []) as unknown as Record<string, unknown>[];
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !/(localhost|127\.|0\.0\.0\.0|\.local|\.internal)/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function sceneById(config: PresenceEditableConfig, id: string): Record<string, unknown> {
  const scenes = arrayRecords(recordAt(config.scene_config, "scenes"));
  return scenes.find((scene) => text(scene.id) === id) ?? {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function recordAt(value: unknown, key: string): unknown {
  return asRecord(value)[key];
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function hash(value: string): string {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result.toString(36);
}
