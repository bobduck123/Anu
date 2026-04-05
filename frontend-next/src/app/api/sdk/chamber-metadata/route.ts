import { NextResponse } from 'next/server';
import {
  ANU_CHAMBER_MODULES,
  ANU_CHAMBER_PROTOCOL_RULES,
  CHAMBER_METADATA_CONTRACT_VERSION,
  getChamberCoverageSummary,
} from '@/ui-system/anu/chamberManifest';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      contract_version: CHAMBER_METADATA_CONTRACT_VERSION,
      modules: ANU_CHAMBER_MODULES,
      protocol_rules: ANU_CHAMBER_PROTOCOL_RULES,
      coverage: getChamberCoverageSummary(),
    },
  });
}
