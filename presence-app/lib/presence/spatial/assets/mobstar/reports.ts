import type {
  InternalUseManifest,
  MobstarGate4Bridge,
  MobstarShortlist,
  ReviewScore,
  ShortlistEntry,
} from "../types/internalUse.ts";

function score(value: ReviewScore): string {
  return value === null ? "n/a" : `${value}/4`;
}

function dimensions(value: readonly [number, number, number]): string {
  if (value[0] === 0 && value[1] === 0 && value[2] === 0) return "unknown";
  return value.map((n) => n.toFixed(2)).join(" x ");
}

function size(value: number | null): string {
  return value === null ? "not exported" : `${value} KB`;
}

const ADMISSION_BANNER = [
  "> **Status: internal-use candidates only.**",
  "> Nothing in this document is an admitted Presence component. Nothing is production-ready or",
  "> public-launch-ready. Source clearance is an owner declaration recorded as-is — no independent",
  "> legal verification was performed, and the original provenance metadata is preserved unchanged.",
].join("\n");

export function renderShortlistMarkdown(input: {
  shortlist: MobstarShortlist;
  registryPath: string;
}): string {
  const { shortlist } = input;
  const lines: string[] = [];

  lines.push("# Mobstar Gate 4 component shortlist");
  lines.push("");
  lines.push("Date: 2026-08-17  ");
  lines.push("Gate: Mobstar Gate 4 — dark luxury streetwear showroom  ");
  lines.push(`Source registry: \`${input.registryPath}\``);
  lines.push("");
  lines.push(ADMISSION_BANNER);
  lines.push("");

  lines.push("## How this shortlist was produced");
  lines.push("");
  lines.push("Two stages, deliberately separated:");
  lines.push("");
  lines.push("1. **Automated filter** over the candidate registry — runtime asset present, inside budget, has a thumbnail, has material slots, has anchors, plausible showroom scale, and not from an excluded source. This narrows the field; it never selects.");
  lines.push("2. **Recorded visual review** — every selected or rejected row below was judged by opening its rendered thumbnail. Metadata alone was not trusted, and that turned out to matter.");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---|");
  lines.push(`| Registry components | ${shortlist.totals.registryComponents} |`);
  lines.push(`| Registry room kits | ${shortlist.totals.registryRoomKits} |`);
  lines.push(`| Passed the automated filter | ${shortlist.totals.passedAutomatedFilter} |`);
  lines.push(`| Visually reviewed | ${shortlist.totals.visuallyReviewed} |`);
  lines.push(`| Selected for Gate 4 | ${shortlist.totals.selected} |`);
  lines.push(`| Rejected on sight | ${shortlist.totals.rejected} |`);
  lines.push("");

  lines.push("### Why visual review was not optional");
  lines.push("");
  lines.push("`candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014` scored well on every automated");
  lines.push("measure: right category, 1.83 x 2.49 m, flat, 264 KB, inside budget, slots and anchors");
  lines.push("present. Its thumbnail shows a third party's baked brand graphic reading \"ENJOY YOUR");
  lines.push("TIME WITH COFFEE\". A metadata-only shortlist would have promoted another brand's");
  lines.push("identity into the Mobstar showroom.");
  lines.push("");
  lines.push("The heuristic categories were also wrong on most of what proved useful: the best display");
  lines.push("plinth is filed as `table`, the product risers as `chair`, the seating as");
  lines.push("`decorative-prop`, the lighting fixture as `chair`, and the drape as `shelf`.");
  lines.push("");

  lines.push("## Selection criteria");
  lines.push("");
  for (const criterion of shortlist.criteria) lines.push(`- ${criterion}`);
  lines.push("");

  const groups: Array<{ decision: ShortlistEntry["decision"]; heading: string; blurb: string }> = [
    { decision: "use-for-mobstar-gate4", heading: "Selected — `use-for-mobstar-gate4`", blurb: "Cleared for internal Gate 4 use. See the internal-use manifest and bridge." },
    { decision: "maybe-use-later", heading: "Deferred — `maybe-use-later`", blurb: "Competent but not right for this direction, or not reviewed in this pass." },
    { decision: "needs-manual-cleanup", heading: "Blocked — `needs-manual-cleanup`", blurb: "Would need splitting or repair before it could be used." },
    { decision: "reject", heading: "Rejected — `reject`", blurb: "Not usable for Mobstar. Reasons are recorded so they are not re-litigated." },
  ];

  for (const group of groups) {
    const rows = shortlist.entries.filter((entry) => entry.decision === group.decision);
    if (rows.length === 0) continue;
    lines.push(`## ${group.heading}`);
    lines.push("");
    lines.push(group.blurb);
    lines.push("");
    lines.push("| Candidate | Observed as | Role | Dimensions (m) | Size | Visual | Scale | Fit | Budget |");
    lines.push("|---|---|---|---|---|---|---|---|---|");
    for (const entry of rows) {
      lines.push([
        `\`${entry.candidateId}\``,
        entry.observedAs,
        entry.role ?? "-",
        dimensions(entry.dimensions),
        size(entry.runtimeSizeKb),
        score(entry.scores.visualQuality),
        score(entry.scores.scaleConfidence) + (entry.scores.needs3dReview ? " ⚠" : ""),
        score(entry.scores.mobstarFit),
        entry.budgetStatus,
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
    for (const entry of rows) {
      lines.push(`### \`${entry.candidateId}\``);
      lines.push("");
      lines.push(`- Observed as: ${entry.observedAs}`);
      lines.push(`- Source: \`${entry.sourceAssetId}\` | pipeline category guess: \`${entry.category}\``);
      if (entry.thumbnail) lines.push(`- Thumbnail: \`${entry.thumbnail}\``);
      if (entry.rejectionReason) lines.push(`- **Rejection reason: ${entry.rejectionReason}**`);
      if (entry.scores.needs3dReview) lines.push("- `needs-3d-review`: the thumbnail could not settle every question, usually absolute scale.");
      for (const note of entry.notes) lines.push(`- ${note}`);
      lines.push("");
    }
  }

  lines.push("## Roles the batch cannot fill");
  lines.push("");
  lines.push("The ingested collection is interiors — a church, a coffee shop, two living rooms, a");
  lines.push("spaceship and two baked VR rooms. It contains **no retail garment fixtures at all**, so");
  lines.push("the fixtures most central to a streetwear showroom cannot be extracted and must be");
  lines.push("procedural for this gate.");
  lines.push("");
  lines.push("| Role | Why it is missing | Recommended fallback |");
  lines.push("|---|---|---|");
  for (const role of shortlist.unfilledRoles) {
    lines.push(`| \`${role.role}\` | ${role.reason} | \`${role.recommendedFallback.primitive ?? role.recommendedFallback.kind}\` — ${role.recommendedFallback.note} |`);
  }
  lines.push("");
  lines.push("Every recommended primitive already exists in the Gate 4 art-direction lane's extension");
  lines.push("of `SpatialPrimitiveKind`, so no new model work is required to fill these gaps.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function renderInternalUseReviewMarkdown(input: {
  manifest: InternalUseManifest;
  bridge: MobstarGate4Bridge;
  manifestPath: string;
  bridgePath: string;
  shortlistPath: string;
}): string {
  const { manifest, bridge } = input;
  const lines: string[] = [];

  lines.push("# Mobstar Gate 4 internal-use candidate review");
  lines.push("");
  lines.push("Date: 2026-08-17  ");
  lines.push("Gate: Mobstar Gate 4  ");
  lines.push(`Manifest: \`${input.manifestPath}\`  `);
  lines.push(`Bridge: \`${input.bridgePath}\`  `);
  lines.push(`Shortlist: \`${input.shortlistPath}\``);
  lines.push("");
  lines.push(ADMISSION_BANNER);
  lines.push("");

  lines.push("## What the three statuses mean here");
  lines.push("");
  lines.push("| Status | Meaning | Used in this pass |");
  lines.push("|---|---|---|");
  lines.push("| `candidate-review-required` | What the ingestion pipeline writes. Unreviewed. | All 126 registry entries keep this. |");
  lines.push("| `candidate-cleared-for-internal-use` | Single-context review passed. Usable inside Mobstar Gate 4 only. | **Granted to the entries below.** |");
  lines.push("| `admitted-presence-component` | Second-context review passed; a real Presence library component. | **Granted to nothing.** Enforced in code and by test. |");
  lines.push("");
  lines.push("The candidate registry itself was not mutated. Internal-use clearance is additive");
  lines.push("metadata in a separate manifest, so re-running the ingestion pipeline cannot silently");
  lines.push("overwrite a review decision, and revoking clearance means deleting one file.");
  lines.push("");

  lines.push("## Source clearance");
  lines.push("");
  lines.push("The product owner confirmed they will source these assets and that source/licence");
  lines.push("concerns are cleared appropriately for internal use. That declaration is recorded on");
  lines.push("every entry as `user-sourced-cleared-for-internal-use`, alongside:");
  lines.push("");
  lines.push("- `independentLegalVerification: false`");
  lines.push("- the original `declaredLicense`, `declaredAuthor`, `declaredCopyright` and licence evidence, carried forward unchanged");
  lines.push("");
  lines.push("No licence field was erased or rewritten. Two of the selected items descend from");
  lines.push("`CC-BY-4.0` sources, whose attribution requirement still travels with anything published.");
  lines.push("");

  lines.push(`## Selected components (${manifest.components.length})`);
  lines.push("");
  for (const component of manifest.components) {
    lines.push(`### \`${component.componentId}\` — ${component.role}`);
    lines.push("");
    lines.push(`- **Observed as:** ${component.observedAs}`);
    lines.push(`- Status: \`${component.status}\``);
    lines.push(`- Runtime asset: \`${component.runtimeAsset}\` (optimised candidate export, not a raw source GLB)`);
    lines.push(`- Thumbnail: ${component.thumbnail ? `\`${component.thumbnail}\`` : "none"}`);
    lines.push(`- Dimensions: ${dimensions(component.dimensions)} m | Size: ${size(component.runtimeSizeKb)} | Budget: ${component.budgetStatus} (${component.budgetTier})`);
    lines.push(`- Material slots: ${component.materialSlots.join(", ")} → Presence slots: ${component.presenceMaterialSlots.join(", ")}`);
    lines.push(`- Anchors (${component.anchors.length}): ${component.anchors.slice(0, 8).join(", ")}${component.anchors.length > 8 ? ", …" : ""}`);
    lines.push(`- Placement: ${component.placement}`);
    lines.push(`- Scores — visual ${score(component.scores.visualQuality)}, scale ${score(component.scores.scaleConfidence)}, Mobstar fit ${score(component.scores.mobstarFit)}${component.scores.needs3dReview ? " | **needs-3d-review**" : ""}`);
    lines.push(`- Scale confirmation required: ${component.scaleReviewRequired ? "**yes**" : "no"}`);
    lines.push(`- Provenance: licence \`${component.sourceClearance.declaredLicense ?? "none declared"}\`, author \`${component.sourceClearance.declaredAuthor ?? "none declared"}\``);
    lines.push(`- Not admitted because: ${component.notAdmittedReason}`);
    for (const note of component.notes) lines.push(`- ${note}`);
    lines.push("");
  }

  lines.push(`## Selected room kits (${manifest.roomKits.length})`);
  lines.push("");
  for (const roomKit of manifest.roomKits) {
    lines.push(`### \`${roomKit.roomKitId}\``);
    lines.push("");
    lines.push(`- **Observed as:** ${roomKit.observedAs}`);
    lines.push(`- Status: \`${roomKit.status}\` | category: ${roomKit.category}`);
    lines.push(`- Runtime asset: \`${roomKit.runtimeAsset}\``);
    lines.push(`- Dimensions: ${dimensions(roomKit.dimensions)} m | Size: ${size(roomKit.runtimeSizeKb)} | Budget: ${roomKit.budgetStatus}`);
    lines.push(`- **Usage: ${roomKit.usage}** — ${roomKit.usageNote}`);
    lines.push(`- Component candidates extracted from this interior: ${roomKit.extractedComponentCount}`);
    lines.push(`- Scale confirmation required: ${roomKit.scaleReviewRequired ? "**yes**" : "no"}`);
    for (const note of roomKit.notes) lines.push(`- ${note}`);
    lines.push("");
  }

  lines.push("## Gaps to fill procedurally");
  lines.push("");
  lines.push("Five Mobstar roles have no suitable extracted candidate. The most important is the");
  lines.push("garment rack: there is no rack anywhere in the registry, because nothing ingested is a");
  lines.push("retail environment.");
  lines.push("");
  for (const role of manifest.unfilledRoles) {
    lines.push(`- **\`${role.role}\`** → \`${role.recommendedFallback.primitive}\`. ${role.reason} ${role.recommendedFallback.note}`);
  }
  lines.push("");

  lines.push("## How Gate 4 consumes this");
  lines.push("");
  lines.push(`The bridge at \`${input.bridgePath}\` maps each selected candidate to a role, a runtime`);
  lines.push("asset, material slots, anchors and a placement, and names the style and lighting this set");
  lines.push(`targets: \`${bridge.targets.materialStylePreset}\` and \`${bridge.targets.lightingProfile}\`.`);
  lines.push("");
  lines.push("Layouts reference components; geometry is never inlined and no per-client GLB is created.");
  lines.push("Mobstar identity arrives through material presets, skins and media refs on the shared slots.");
  lines.push("");

  lines.push("## What still requires a human");
  lines.push("");
  lines.push("- Second-context art-direction review before anything becomes `admitted-presence-component`.");
  lines.push("- 3D scale confirmation on every entry flagged `needs-3d-review`; three of the six selected components carry unconfirmed absolute scale.");
  lines.push("- A decision on whether the display plinth's origin as a church altar is acceptable framing.");
  lines.push("- Confirmation that CC-BY attribution will be carried wherever these appear.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}
