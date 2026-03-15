import { createHash } from 'crypto';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeTopicKey(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function toTitleCase(topic: string): string {
  return topic
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function stableId(prefix: string, ...parts: string[]): string {
  const digest = createHash('sha1').update(parts.join('::')).digest('hex').slice(0, 16);
  return `${prefix}_${digest}`;
}

export function normalizeScore(value: number | undefined, fallback = 0.5): number {
  return clamp(typeof value === 'number' ? value : fallback, 0, 1);
}

export function normalizeAxis(value: number | undefined, fallback = 0): number {
  return clamp(typeof value === 'number' ? value : fallback, -1, 1);
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
}
