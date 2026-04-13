import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FLAGSHIP_JOURNEY_SLUG } from '@/ui-system/anu/journeyConnectorRegistry';

function readDoc(relativePath: string): string {
  const path = resolve(process.cwd(), '..', relativePath);
  return readFileSync(path, 'utf8');
}

describe('connector docs sync', () => {
  it('keeps connector architecture spec aligned with flagship journey slug and archive handoff routes', () => {
    const connectorSpec = readDoc('docs/CONNECTOR_ARCHITECTURE_SPEC_2026-04-07.md');

    expect(connectorSpec).toContain(FLAGSHIP_JOURNEY_SLUG);
    expect(connectorSpec).toContain('/public/connectors');
    expect(connectorSpec).toContain('/public/journeys/:slug');
  });

  it('keeps trust/archive spec aligned with deep-link archive surfaces', () => {
    const trustSpec = readDoc('docs/TRUST_ARCHIVE_SPEC_2026-04-07.md');

    expect(trustSpec).toContain('/archive');
    expect(trustSpec).toContain('/archive/[record]');
    expect(trustSpec).toContain('/public/archive-handoffs/:slug');
  });
});
