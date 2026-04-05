import { NextResponse } from 'next/server';
import {
  ANU_OBSERVATORY_MODULES,
  ANU_OBSERVATORY_PROTOCOL_RULES,
  OBSERVATORY_CONTRACT_VERSION,
  getObservatoryCoverageSummary,
} from '@/ui-system/anu/observatoryManifest';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      contract_version: OBSERVATORY_CONTRACT_VERSION,
      modules: ANU_OBSERVATORY_MODULES,
      protocol_rules: ANU_OBSERVATORY_PROTOCOL_RULES,
      coverage: getObservatoryCoverageSummary(),
    },
  });
}
