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
  amber: '#f59e0b',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  emerald: '#10b981',
  fuchsia: '#d946ef',
  gold: '#fbbf24',
  indigo: '#6366f1',
  lime: '#84cc16',
  neutral: '#94a3b8',
  orange: '#f97316',
  pink: '#ec4899',
  purple: '#8b5cf6',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  slate: '#64748b',
  teal: '#14b8a6',
  violet: '#7c3aed',
  yellow: '#eab308',
};

export function colorTokenToHex(token?: string): string {
  if (!token) {
    return '#60a5fa';
  }

  return COLOR_TOKEN_MAP[token.trim().toLowerCase()] ?? '#60a5fa';
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

  return `${map.nodes.length} nodes • ${map.edges.length} edges • ${map.snapshots.length} snapshots`;
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
      return 'bg-emerald-100 text-emerald-800';
    case 'reviewed':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-200 text-slate-700';
  }
}

export function relationLabel(relation: MapRelation): string {
  return relation.replace(/_/g, ' ');
}

export function sortNodesByImportance(nodes: MapNode[]): MapNode[] {
  return [...nodes].sort((left, right) => right.metrics.importance - left.metrics.importance);
}
