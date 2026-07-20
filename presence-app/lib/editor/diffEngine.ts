import type { PresenceEditableConfig } from "@/lib/api/types";

export type ConfigChangeType = "added" | "removed" | "modified";

export interface ConfigDiff {
  field: string;
  category: string;
  before: unknown;
  after: unknown;
  changeType: ConfigChangeType;
}

export interface ChangeSummary {
  total: number;
  byCategory: Record<string, number>;
  headline: string[];
}

const IGNORED_TOP_LEVEL = new Set([
  "id",
  "room_id",
  "status",
  "schema_version",
  "version",
  "created_by_user_id",
  "updated_by_user_id",
  "published_by_user_id",
  "created_at",
  "updated_at",
  "published_at",
  "archived_at",
]);

const CATEGORY_BY_ROOT: Record<string, string> = {
  renderer_key: "Renderer",
  scene_config: "Scenes",
  content_config: "Scenes and copy",
  asset_config: "Works and assets",
  style_dna: "Style DNA",
  motion_config: "Motion and texture",
  roomkey_config: "RoomKey",
  enquiry_config: "Enquiry and actions",
  locked_fields: "Locked fields",
};

export function diffEditableConfigs(
  published: PresenceEditableConfig | null | undefined,
  draft: PresenceEditableConfig | null | undefined,
): ConfigDiff[] {
  if (!draft) return [];
  const before = comparableConfig(published);
  const after = comparableConfig(draft);
  const diffs: ConfigDiff[] = [];
  deepDiff(before, after, "", diffs);
  return diffs.filter((diff) => diff.field && !IGNORED_TOP_LEVEL.has(diff.field.split(".")[0] ?? ""));
}

export function summarizeEditableChanges(diffs: ConfigDiff[]): ChangeSummary {
  const byCategory: Record<string, number> = {};
  for (const diff of diffs) {
    byCategory[diff.category] = (byCategory[diff.category] ?? 0) + 1;
  }

  const headline = Object.entries(byCategory).map(([category, count]) => {
    const fields = diffs
      .filter((diff) => diff.category === category)
      .map((diff) => formatConfigFieldName(diff.field).split(" / ").slice(1).join(" / ") || formatConfigFieldName(diff.field));
    const uniqueFields = Array.from(new Set(fields)).slice(0, 3);
    const suffix = uniqueFields.length > 0 ? `: ${uniqueFields.join(", ")}` : "";
    return `${category} ${count === 1 ? "has 1 change" : `has ${count} changes`}${suffix}`;
  });

  return { total: diffs.length, byCategory, headline };
}

export function formatConfigFieldName(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(" / ");
}

function comparableConfig(config: PresenceEditableConfig | null | undefined): Record<string, unknown> {
  if (!config) return {};
  const record = config as unknown as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !IGNORED_TOP_LEVEL.has(key)),
  );
}

function deepDiff(before: unknown, after: unknown, path: string, diffs: ConfigDiff[]) {
  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      deepDiff(before[key], after[key], path ? `${path}.${key}` : key, diffs);
    }
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) {
      pushDiff(path, before, after, "modified", diffs);
      return;
    }
    for (let index = 0; index < before.length; index += 1) {
      deepDiff(before[index], after[index], `${path}[${index}]`, diffs);
    }
    return;
  }

  if (before === undefined && after !== undefined) {
    pushDiff(path, before, after, "added", diffs);
    return;
  }

  if (before !== undefined && after === undefined) {
    pushDiff(path, before, after, "removed", diffs);
    return;
  }

  if (!Object.is(before, after)) {
    pushDiff(path, before, after, "modified", diffs);
  }
}

function pushDiff(path: string, before: unknown, after: unknown, changeType: ConfigChangeType, diffs: ConfigDiff[]) {
  diffs.push({
    field: path,
    category: CATEGORY_BY_ROOT[path.split(".")[0] ?? ""] ?? "General",
    before,
    after,
    changeType,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
