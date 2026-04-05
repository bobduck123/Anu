'use client';

import {
  MapCategory,
  MapCompileMode,
  MapNode,
  MapRelation,
  MapResource,
  MapStatus,
} from '@/lib/api/educationMaps';

export const MAP_STATUS_OPTIONS: MapStatus[] = ['draft', 'reviewed', 'published'];
export const MAP_COMPILE_MODE_OPTIONS: MapCompileMode[] = ['auto_seed', 'auto_expand', 'curated_refine'];
export const MAP_RELATION_OPTIONS: MapRelation[] = [
  'influences',
  'contradicts',
  'extends',
  'belongs_to',
  'derived_from',
  'similar_to',
  'co_occurs_with',
];

const COLOR_TOKEN_MAP: Record<string, string> = {
  amber: '#e0b115',
  blue: '#7c413c',
  cyan: '#7c413c',
  emerald: '#7c413c',
  fuchsia: '#f6d4cb',
  gold: '#e0b115',
  indigo: '#7c413c',
  lime: '#e0b115',
  neutral: '#f6d4cb',
  orange: '#e0b115',
  pink: '#7c413c',
  purple: '#f6d4cb',
  rose: '#7c413c',
  sky: '#7c413c',
  slate: '#7c413c',
  teal: '#7c413c',
  violet: '#7c413c',
  yellow: '#e0b115',
};

export function colorTokenToHex(token?: string): string {
  if (!token) {
    return '#f6d4cb';
  }

  return COLOR_TOKEN_MAP[token.trim().toLowerCase()] ?? '#f6d4cb';
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatNumber(value: number): string {
  return value.toFixed(value < 10 ? 2 : 1);
}

export function summarizeMap(map: MapResource | null): string {
  if (!map) {
    return '';
  }

  return `${map.nodes.length} nodes / ${map.edges.length} edges / ${map.snapshots.length} snapshots`;
}

export function nodeSearchText(node: MapNode): string {
  return [
    node.label,
    node.summary ?? '',
    node.longDescription ?? '',
    node.entityType,
    node.categoryKey ?? '',
    node.subcategoryKey ?? '',
    ...node.aliases,
    ...node.tags,
  ]
    .join(' ')
    .toLowerCase();
}

export function categoryLabel(categories: MapCategory[], categoryKey?: string): string {
  if (!categoryKey) {
    return 'Uncategorized';
  }

  return categories.find((entry) => entry.key === categoryKey)?.label ?? categoryKey;
}

export function categoryColor(categories: MapCategory[], categoryKey?: string): string {
  if (!categoryKey) {
    return colorTokenToHex('neutral');
  }

  return colorTokenToHex(categories.find((entry) => entry.key === categoryKey)?.colorToken);
}

export function statusBadgeClass(status: MapStatus): string {
  switch (status) {
    case 'published':
      return 'bg-[#665700] text-[#665700]';
    case 'reviewed':
      return 'bg-[#e0b115] text-[#e0b115]';
    default:
      return 'bg-[#f6d4cb] text-[#1e0227]';
  }
}

export function relationLabel(relation: MapRelation): string {
  return relation.replace(/_/g, ' ');
}

export function sortNodesByImportance(nodes: MapNode[]): MapNode[] {
  return [...nodes].sort((left, right) => right.metrics.importance - left.metrics.importance);
}
