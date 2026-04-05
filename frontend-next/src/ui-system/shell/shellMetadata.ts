import { ANU_PATTERN_EXPERIMENTS, ANU_TOKEN_STAGING_GROUPS } from '@/ui-system/anu/patternBank';
import { ANU_PRIMITIVE_MANIFEST, getPrimitiveAdoptionSummary } from '@/ui-system/anu/primitiveManifest';
import { ANU_CHAMBER_MODULES, ANU_CHAMBER_PROTOCOL_RULES, getChamberCoverageSummary } from '@/ui-system/anu/chamberManifest';
import {
  ANU_COMMUNITY_MODULES,
  ANU_COMMUNITY_PROTOCOL_RULES,
  getCommunityCoverageSummary,
} from '@/ui-system/anu/communityManifest';
import {
  ANU_OBSERVATORY_MODULES,
  ANU_OBSERVATORY_PROTOCOL_RULES,
  getObservatoryCoverageSummary,
} from '@/ui-system/anu/observatoryManifest';
import { REALM_ROUTE_REGISTRY } from '@/ui-system/realms/realmRegistry';

export const SHELL_METADATA_CONTRACT_VERSION = 'm5.2026-04-01';

export const SHELL_PRIMITIVES = ANU_PRIMITIVE_MANIFEST.map((entry) => entry.id);

export function buildShellMetadata() {
  return {
    contract_version: SHELL_METADATA_CONTRACT_VERSION,
    generated_at: new Date().toISOString(),
    shell: {
      token_groups: ANU_TOKEN_STAGING_GROUPS,
      primitive_count: SHELL_PRIMITIVES.length,
      primitives: [...SHELL_PRIMITIVES],
      primitive_manifest: ANU_PRIMITIVE_MANIFEST,
      primitive_adoption: getPrimitiveAdoptionSummary(),
      pattern_experiment_count: ANU_PATTERN_EXPERIMENTS.length,
    },
    chambers: {
      module_count: ANU_CHAMBER_MODULES.length,
      protocol_rule_count: ANU_CHAMBER_PROTOCOL_RULES.length,
      coverage: getChamberCoverageSummary(),
      modules: ANU_CHAMBER_MODULES,
    },
    community: {
      module_count: ANU_COMMUNITY_MODULES.length,
      protocol_rule_count: ANU_COMMUNITY_PROTOCOL_RULES.length,
      coverage: getCommunityCoverageSummary(),
      modules: ANU_COMMUNITY_MODULES,
    },
    observatory: {
      module_count: ANU_OBSERVATORY_MODULES.length,
      protocol_rule_count: ANU_OBSERVATORY_PROTOCOL_RULES.length,
      coverage: getObservatoryCoverageSummary(),
      modules: ANU_OBSERVATORY_MODULES,
    },
    realms: REALM_ROUTE_REGISTRY.map((entry) => ({
      id: entry.id,
      prefixes: [...entry.prefixes],
      surface: entry.surface,
    })),
  };
}
