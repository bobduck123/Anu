// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UniverseExplainer } from '@/components/maps/universe/UniverseExplainer';
import type { UniverseStar } from '@/components/maps/universe/types';

const star: UniverseStar = {
  id: 'explainer-star',
  label: 'Packet Beacon',
  type: 'education',
  color: '#22d3ee',
  size: 1.4,
  coordinates: { x: 0, y: 0, z: 0 },
  connections: [],
  constellationIds: ['demo-constellation'],
  placement: {
    semanticAxisVector: { x: 0.5, y: 0.7, z: 0.4 },
    evidence: 0.82,
    freshness: 0.71,
    sourceDensity: 0.66,
    importance: 0.93,
    centrality: 0.72,
    controversy: 0.11,
    anchorMode: 'hybrid',
    authoredCoordinates: { x: 1, y: 1, z: 1 },
    derivedCoordinates: { x: 0, y: 0, z: 0 },
    finalCoordinates: { x: 0.68, y: 0.68, z: 0.68 },
    rationale: 'Packet placement rationale',
    axisReasoning: [
      {
        key: 'x',
        label: 'Meaning',
        score: 0.5,
        explanation: 'Packet meaning axis explanation.',
        confidence: 0.8,
      },
    ],
  },
  explainer: {
    title: 'Packet Beacon',
    summary: 'Packet summary visible in the shared explainer shell.',
    starTypeLabel: 'Education',
    categoryLabel: 'Packet Sensing',
    domainLabel: 'Mock packet',
    scopeLabel: 'mock-scope',
    metrics: {
      evidence: 0.82,
      freshness: 0.71,
      sourceDensity: 0.66,
      importance: 0.93,
      centrality: 0.72,
      controversy: 0.11,
    },
    placementRationale: 'Packet placement rationale',
    axisReasoning: [
      {
        key: 'x',
        label: 'Meaning',
        score: 0.5,
        explanation: 'Packet meaning axis explanation.',
        confidence: 0.8,
      },
    ],
    primarySource: {
      id: 'primary-source',
      url: 'https://example.com/source',
      title: 'Primary packet source',
      snippet: 'Source snippet visible in the shared explainer.',
    },
    sources: [],
    tags: ['packet-only-tag'],
    aliases: ['Packet alias'],
  },
  metadata: {
    participants: 12,
    impact: 88,
  },
};

describe('UniverseExplainer', () => {
  it('renders shared placement, source, and anchor details for a packet star', () => {
    render(<UniverseExplainer star={star} />);

    expect(screen.getByText('Packet Beacon')).toBeInTheDocument();
    expect(screen.getByText('Hybrid anchor')).toBeInTheDocument();
    expect(screen.getByText('Packet placement rationale')).toBeInTheDocument();
    expect(screen.getByText('Packet meaning axis explanation.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Primary packet source/i })).toHaveAttribute('href', 'https://example.com/source');
  });
});
