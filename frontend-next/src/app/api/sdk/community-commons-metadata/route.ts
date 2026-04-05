import { NextResponse } from 'next/server';
import {
  ANU_COMMUNITY_MODULES,
  ANU_COMMUNITY_PROTOCOL_RULES,
  COMMUNITY_COMMONS_CONTRACT_VERSION,
  getCommunityCoverageSummary,
} from '@/ui-system/anu/communityManifest';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      contract_version: COMMUNITY_COMMONS_CONTRACT_VERSION,
      modules: ANU_COMMUNITY_MODULES,
      protocol_rules: ANU_COMMUNITY_PROTOCOL_RULES,
      coverage: getCommunityCoverageSummary(),
    },
  });
}
