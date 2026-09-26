import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildGate4Bridge,
  buildInternalUseManifest,
  buildShortlist,
} from "../lib/presence/spatial/assets/mobstar/selection.ts";
import {
  renderInternalUseReviewMarkdown,
  renderShortlistMarkdown,
} from "../lib/presence/spatial/assets/mobstar/reports.ts";
import type { CandidateRegistry } from "../lib/presence/spatial/assets/types/candidates.ts";

const REGISTRY_PATH = "assets/presence-spatial/candidates/manifests/candidate-registry.json";
const SHORTLIST_JSON = "assets/presence-spatial/candidates/mobstar-shortlist.json";
const INTERNAL_USE_JSON = "assets/presence-spatial/candidates/internal-use-components.mobstar-gate4.json";
const BRIDGE_JSON = "assets/presence-spatial/candidates/component-bridge.mobstar-gate4.json";
const SHORTLIST_DOC = "docs/program/presence-spatial-assets/MOBSTAR_COMPONENT_SHORTLIST_2026-08-17.md";
const REVIEW_DOC = "docs/program/presence-spatial-assets/MOBSTAR_INTERNAL_USE_CANDIDATE_REVIEW_2026-08-17.md";

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath: string, value: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const generatedAt = process.argv.includes("--at")
    ? process.argv[process.argv.indexOf("--at") + 1]
    : new Date().toISOString();

  const resolve = (relative: string): string => path.join(repoRoot, ...relative.split("/"));

  const registry = JSON.parse(await readFile(resolve(REGISTRY_PATH), "utf8")) as CandidateRegistry;
  process.stdout.write(`Read ${registry.components.length} component and ${registry.roomKits.length} room-kit candidates.\n`);

  const shortlist = buildShortlist({ registry, generatedAt, sourceRegistryPath: REGISTRY_PATH });
  const manifest = buildInternalUseManifest({ registry, generatedAt });
  const bridge = buildGate4Bridge({ manifest, registry, generatedAt });

  await writeJson(resolve(SHORTLIST_JSON), shortlist);
  await writeJson(resolve(INTERNAL_USE_JSON), manifest);
  await writeJson(resolve(BRIDGE_JSON), bridge);
  await writeText(resolve(SHORTLIST_DOC), renderShortlistMarkdown({ shortlist, registryPath: REGISTRY_PATH }));
  await writeText(resolve(REVIEW_DOC), renderInternalUseReviewMarkdown({
    manifest,
    bridge,
    manifestPath: INTERNAL_USE_JSON,
    bridgePath: BRIDGE_JSON,
    shortlistPath: SHORTLIST_JSON,
  }));

  process.stdout.write("\nMobstar Gate 4 selection\n");
  process.stdout.write(`  passed automated filter   ${shortlist.totals.passedAutomatedFilter}\n`);
  process.stdout.write(`  visually reviewed         ${shortlist.totals.visuallyReviewed}\n`);
  process.stdout.write(`  selected components       ${manifest.components.length}\n`);
  process.stdout.write(`  selected room kits        ${manifest.roomKits.length}\n`);
  process.stdout.write(`  rejected on sight         ${shortlist.totals.rejected}\n`);
  process.stdout.write(`  roles needing a fallback  ${manifest.unfilledRoles.length}\n`);
  process.stdout.write("\nWrote:\n");
  for (const written of [SHORTLIST_JSON, INTERNAL_USE_JSON, BRIDGE_JSON, SHORTLIST_DOC, REVIEW_DOC]) {
    process.stdout.write(`  ${written}\n`);
  }
  process.stdout.write("\nAll entries are candidate-cleared-for-internal-use. Nothing is an admitted Presence component.\n");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
