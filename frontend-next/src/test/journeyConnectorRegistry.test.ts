import { describe, expect, it } from 'vitest';
import {
  FLAGSHIP_JOURNEY_CONNECTORS,
  buildJourneyConnectorRailPayload,
  getJourneyDeadEndRoutes,
  hasArchivePathFromKnowledgeSource,
} from '@/ui-system/anu/journeyConnectorRegistry';

describe('journey connector registry', () => {
  it('keeps a knowledge-to-archive path reachable', () => {
    expect(hasArchivePathFromKnowledgeSource()).toBe(true);
  });

  it('declares no dead-end touched routes except archive terminal', () => {
    expect(getJourneyDeadEndRoutes()).toEqual([]);
  });

  it('activates action and event transitions from education map routes', () => {
    const payload = buildJourneyConnectorRailPayload('/education/maps/weaving-futures-atlas');
    const activeTargets = payload.activeConnectors.map((connector) => connector.targetRoute);

    expect(activeTargets).toEqual(expect.arrayContaining(['/actions', '/events']));
    expect(payload.thresholdContext.defaultThreshold).toBe('MEMBER');
    expect(payload.degradedHonesty.isDegraded).toBe(false);
  });

  it('keeps governance and transparency routes connected to archive handoff', () => {
    const governance = buildJourneyConnectorRailPayload('/governance/model-registry');
    const transparency = buildJourneyConnectorRailPayload('/transparency');

    expect(governance.activeConnectors.map((connector) => connector.targetRoute)).toContain('/archive');
    expect(transparency.activeConnectors.map((connector) => connector.targetRoute)).toContain('/archive');
    expect(governance.archiveHandoff.recordRoute).toMatch(/^\/archive\//);
  });

  it('maintains provenance and threshold posture on every connector', () => {
    for (const connector of FLAGSHIP_JOURNEY_CONNECTORS) {
      expect(connector.summary.length).toBeGreaterThan(10);
      expect(connector.thresholdRequired.length).toBeGreaterThan(0);
      expect(['source-backed', 'verified-summary', 'degraded-honesty']).toContain(connector.provenanceMode);
    }
  });
});
