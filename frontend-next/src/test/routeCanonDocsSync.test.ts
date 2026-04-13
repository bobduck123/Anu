import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FLAGSHIP_ROUTE_LIST, INTERNAL_ROUTE_CANON, ROUTE_ALIAS_REGISTRY } from '@/ui-system/anu/routePurposeRegistry';

function readDoc(relativePath: string): string {
  const path = resolve(process.cwd(), '..', relativePath);
  return readFileSync(path, 'utf8');
}

describe('route canon docs sync', () => {
  it('keeps route-purpose doc aligned with flagship route canon', () => {
    const routePurposeDoc = readDoc('docs/ROUTE_PURPOSE_REGISTRY_2026-04-07.md');

    for (const route of FLAGSHIP_ROUTE_LIST) {
      expect(routePurposeDoc).toContain(route);
    }
  });

  it('documents canonical /lab posture and legacy alias', () => {
    const routePurposeDoc = readDoc('docs/ROUTE_PURPOSE_REGISTRY_2026-04-07.md');

    expect(routePurposeDoc).toContain(INTERNAL_ROUTE_CANON.lab);

    for (const alias of ROUTE_ALIAS_REGISTRY) {
      expect(routePurposeDoc).toContain(alias.alias);
      expect(routePurposeDoc).toContain(alias.canonical);
    }
  });
});
