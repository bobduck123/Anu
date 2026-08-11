import type { PresenceEditableConfig, PresenceNode } from "@/lib/api/types";

export type RcrId = "RCR-06" | "RCR-07" | "RCR-08" | "RCR-09" | "RCR-10" | "RCR-11";

export interface RcrContractIssue {
  id: string;
  rcr: RcrId;
  severity: "critical";
  label: string;
  detail: string;
  path: string;
}

export interface RcrContractEvaluationOptions {
  surface?: "internal" | "public";
  authenticatedOwnerIds?: string[];
}

export const RCR_RESTRICTED_PUBLIC_PAYLOAD_KEYS = [
  "accountmembership",
  "acl",
  "auth",
  "authsubject",
  "auth_subject",
  "capability",
  "commission",
  "credential",
  "deliveryrecipient",
  "delivery_recipient",
  "inbox",
  "invoice",
  "invite",
  "login",
  "notificationendpoint",
  "notification_endpoint",
  "passwordreset",
  "password_reset",
  "payment",
  "permission",
  "queuefanout",
  "queue_fanout",
  "receiptstate",
  "receipt_state",
  "referencecontract",
  "reference_contract",
  "registrycontract",
  "registry_contract",
  "revenuesplit",
  "revenue_split",
  "rcrcontract",
  "rcr_contract",
  "roleguard",
  "routeguard",
  "route_guard",
  "sentstate",
  "sent_state",
  "session",
  "tax",
  "tenantid",
  "tenantroute",
  "tenant_id",
  "tenant_route",
  "webhook",
  "workspace",
] as const;

export const RCR_RESTRICTED_PUBLIC_PAYLOAD_VALUE_FRAGMENTS = [
  "account membership",
  "delivery recipient",
  "gate 4 accepted",
  "gate 7 started",
  "gate 8 accepted",
  "gate 9 approved",
  "public-ready",
  "receipt state",
  "route guard",
  "sent state",
  "tenant route",
  "workspace tenant",
] as const;

const RCR_CONTRACT_CONTAINER_KEYS = [
  "registry_contract",
  "registryContract",
  "rcr_contract",
  "rcrContract",
  "reference_contract",
  "referenceContract",
] as const;

const OWNER_LIFECYCLE_STATES = new Set(["active", "departed", "withdrawn"]);
const OWNERSHIP_KINDS = new Set(["commons", "member", "contested"]);
const COMPATIBILITY_TIERS = new Set(["flagship", "supported", "experimental", "blocked"]);

const PUBLIC_CLAIM_PATTERN =
  /\b(public-ready|public ready|hosted proof|elite|gate\s*4\s*(accepted|approved|passed)|gate\s*7\s*(started|implemented|accepted|approved|passed)|gate\s*8\s*(accepted|approved|passed)|gate\s*9\s*(approved|accepted|passed))\b/i;

const OWNER_ID_PRINCIPAL_PATTERN = /^(user|auth|account|acct|tenant|login|delivery|recipient)[_-]/i;
const DELIVERY_CLAIM_PATTERN = /\b(sent|delivered|delivery|receipt|routed|destination|booking|booked|donation|payment|notified|notification|reference number)\b/i;
const NEGATED_DELIVERY_PATTERN = /\b(no|not|nothing|without|never)\s+(was\s+|is\s+|owner\s+)?(destination|delivery|receipt|routing|route|routed|send|sent|delivered|notification|notified|booking|booked|donation|payment|reference number)\b/i;

export function evaluateRcrContractInPresence(
  config?: PresenceEditableConfig | null,
  node?: PresenceNode | null,
  options: RcrContractEvaluationOptions = {},
): RcrContractIssue[] {
  const roots: Array<[string, unknown]> = [
    ["config", config],
    ["node", node],
  ];
  const contracts = roots.flatMap(([path, value]) => collectRcrContracts(value, path));
  const authenticatedOwnerIds = [
    ...strings(record(node)?.owner_user_id),
    ...strings(record(node)?.auth_subject),
    ...strings(record(node)?.authSubject),
  ];
  const evaluationOptions = {
    ...options,
    authenticatedOwnerIds: [
      ...(options.authenticatedOwnerIds ?? []),
      ...authenticatedOwnerIds,
    ].filter(Boolean),
  };
  return contracts.flatMap(({ contract, path }) => evaluateRcrContract(contract, path, evaluationOptions));
}

export function assertRcrContract(
  contract: unknown,
  path = "registry_contract",
  options: RcrContractEvaluationOptions = {},
): void {
  const issues = evaluateRcrContract(contract, path, options);
  if (issues.length > 0) {
    const message = issues.map((issue) => `${issue.rcr} ${issue.id}: ${issue.detail}`).join("; ");
    throw new Error(`RCR contract enforcement failed: ${message}`);
  }
}

export function evaluateRcrContract(
  contract: unknown,
  path = "registry_contract",
  options: RcrContractEvaluationOptions = {},
): RcrContractIssue[] {
  if (!isRecord(contract)) return [];

  const surface = options.surface ?? "public";
  const issues: RcrContractIssue[] = [];
  const ownerRecords = arrayRecords(firstDefined(contract.ownerReferences, contract.owner_references, contract.owners));
  const ownerIds = new Set<string>();
  const authenticatedOwnerIds = new Set((options.authenticatedOwnerIds ?? []).map((id) => id.trim()).filter(Boolean));

  ownerRecords.forEach((owner, index) => {
    const ownerPath = `${path}.owners[${index}]`;
    const id = text(firstDefined(owner.id, owner.ownerId, owner.owner_id));
    const displayName = text(firstDefined(owner.displayName, owner.display_name, owner.label));
    const lifecycleState = text(firstDefined(owner.lifecycleState, owner.lifecycle_state, owner.state));
    const displayPolicy = text(firstDefined(owner.displayPolicy, owner.display_policy));

    if (!id) {
      addIssue(issues, "rcr06-owner-id", "RCR-06", "Owner reference needs a content id.", "Owner references must use stable content-model ids.", ownerPath);
    } else {
      ownerIds.add(id);
      if (OWNER_ID_PRINCIPAL_PATTERN.test(id)) {
        addIssue(issues, "rcr06-owner-principal-id", "RCR-06", "Owner reference id looks like an account principal.", "Owner references are attribution ids only and must not encode login, tenant, account, auth, or delivery principals.", `${ownerPath}.id`);
      }
      if (authenticatedOwnerIds.has(id)) {
        addIssue(issues, "rcr06-owner-auth-reuse", "RCR-06", "Owner reference reuses an authenticated owner id.", "M1 owner references are content attribution ids and must not reuse PresenceNode.owner_user_id or auth subject identifiers.", `${ownerPath}.id`);
      }
    }

    if (!displayName) {
      addIssue(issues, "rcr06-owner-display-name", "RCR-06", "Owner reference needs a display name.", "Owner references must keep attribution display text separate from account identity.", ownerPath);
    }

    if (!OWNER_LIFECYCLE_STATES.has(lifecycleState)) {
      addIssue(issues, "rcr06-owner-lifecycle", "RCR-06", "Owner reference lifecycle is missing or unsupported.", "Owner references must declare active, departed, or withdrawn lifecycle state.", ownerPath);
    } else if ((lifecycleState === "departed" || lifecycleState === "withdrawn") && !displayPolicy) {
      addIssue(issues, "rcr07-owner-display-policy", "RCR-07", "Departed or withdrawn owner is missing display policy.", "Publish readiness must fail closed until departed or withdrawn attribution has an explicit display policy.", ownerPath);
    }

    for (const found of findRestrictedKeys(owner, ownerPath)) {
      addIssue(issues, "rcr06-owner-principal-field", "RCR-06", "Owner reference contains a forbidden principal or delivery field.", `${found.key} is outside Level 1 attributed single-tenancy owner references.`, found.path);
    }
  });

  const ownerships = arrayRecords(firstDefined(contract.ownerships, contract.ownership, contract.holders));
  ownerships.forEach((ownership, index) => {
    const ownershipPath = `${path}.ownerships[${index}]`;
    const kind = text(firstDefined(ownership.kind, ownership.ownershipKind, ownership.ownership_kind));
    const ids = relationIds(ownership);

    if (!OWNERSHIP_KINDS.has(kind)) {
      addIssue(issues, "rcr06-ownership-kind", "RCR-06", "Ownership kind is missing or unsupported.", "Ownership must be commons, member, or contested.", ownershipPath);
      return;
    }

    ids.forEach((id) => {
      if (!ownerIds.has(id)) {
        addIssue(issues, "rcr07-dangling-ownership", "RCR-07", "Ownership points at a missing owner reference.", `${id} is not declared in ownerReferences.`, ownershipPath);
      }
    });

    if (kind === "commons" && ids.length > 0) {
      addIssue(issues, "rcr06-commons-holder", "RCR-06", "Commons ownership must not mint a hidden owner principal.", "Commons ownership is an unowned/public commons attribution state.", ownershipPath);
    }

    if (kind === "member" && ids.length !== 1) {
      addIssue(issues, "rcr06-member-holder", "RCR-06", "Member ownership requires exactly one owner reference.", "Member attribution is single-holder content attribution only.", ownershipPath);
    }

    if (kind === "contested") {
      const uniqueIds = new Set(ids);
      if (ids.length !== 2 || uniqueIds.size !== 2) {
        addIssue(issues, "rcr06-contested-holders", "RCR-06", "Contested ownership requires two distinct owner references.", "Contested attribution must preserve both sides without merging them.", ownershipPath);
      }
      if (!text(firstDefined(ownership.orderingBasis, ownership.ordering_basis))) {
        addIssue(issues, "rcr06-contested-ordering", "RCR-06", "Contested ownership needs an ordering basis.", "Contested attribution must not imply priority without an explicit basis.", ownershipPath);
      }
      if (surface === "public" && ownership.realOwners !== false) {
        addIssue(issues, "rcr07-contested-public", "RCR-07", "Contested real-owner attribution cannot be published.", "Contested real-owner attribution must stay blocked until human confirmation resolves public wording.", ownershipPath);
      }
    }
  });

  const relations = arrayRecords(firstDefined(contract.relations, contract.ownerRelations, contract.owner_relations, contract.references));
  relations.forEach((relation, index) => {
    const relationPath = `${path}.relations[${index}]`;
    const ids = relationIds(relation);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      addIssue(issues, "rcr07-duplicate-relation", "RCR-07", "Relation contains duplicate owner references.", "Publish readiness must fail closed on duplicate owner/reference relations.", relationPath);
    }
    ids.forEach((id) => {
      if (!ownerIds.has(id)) {
        addIssue(issues, "rcr07-dangling-relation", "RCR-07", "Relation points at a missing owner reference.", `${id} is not declared in ownerReferences.`, relationPath);
      }
    });
  });

  const testimonies = arrayRecords(firstDefined(contract.testimonies, contract.testimonials, contract.suppliedTestimony, contract.supplied_testimony));
  testimonies.forEach((testimony, index) => {
    const testimonyPath = `${path}.testimonies[${index}]`;
    const hasAttribution = Boolean(text(firstDefined(testimony.ownerId, testimony.owner_id, testimony.ownerName, testimony.owner_name, testimony.attribution)));
    const hasText = Boolean(text(firstDefined(testimony.text, testimony.quote, testimony.statement)));
    if (!hasAttribution && !hasText) return;
    if (testimony.generated === true || testimony.inferred === true || testimony.supplied !== true) {
      addIssue(issues, "rcr07-supplied-testimony", "RCR-07", "Attributed testimony is not proven supplied.", "Generated, inferred, or unsupplied testimony cannot pass publish readiness.", testimonyPath);
    }
    if (!text(firstDefined(testimony.approvalEvidence, testimony.approval_evidence, testimony.sourceEvidence, testimony.source_evidence))) {
      addIssue(issues, "rcr07-testimony-evidence", "RCR-07", "Attributed testimony lacks approval evidence.", "Supplied testimony needs preserved approval evidence before publish readiness can pass.", testimonyPath);
    }
  });

  const routings = arrayRecords(firstDefined(contract.routing, contract.delivery, contract.deliveryClaims, contract.delivery_claims));
  routings.forEach((routing, index) => {
    const routingPath = `${path}.routing[${index}]`;
    const outcome = text(firstDefined(routing.result, routing.state, routing.status, routing.outcome));
    const success = routing.success === true || routing.sent === true || routing.delivered === true || routing.receipt === true;
    if (success || hasUnapprovedDeliveryClaim(outcome)) {
      addIssue(issues, "rcr07-fake-delivery", "RCR-07", "Delivery or action success is claimed without an approved delivery contract.", "The app contract cannot invent send, receipt, booking, donation, or delivery success.", routingPath);
    }
    if (routing.fallbackUsed === true || routing.fallback_used === true) {
      addIssue(issues, "rcr07-unroutable-fallback", "RCR-07", "Unroutable delivery fallback is being treated as usable.", "Silent unroutable fallback must remain a publish-readiness blocker.", routingPath);
    }
  });

  strings(firstDefined(contract.publishClaims, contract.publish_claims, contract.claims)).forEach((claim, index) => {
    if (PUBLIC_CLAIM_PATTERN.test(claim)) {
      addIssue(issues, "rcr07-public-claim", "RCR-07", "Unsupported public launch or gate claim found.", "Contract enforcement cannot carry hosted, public-ready, elite, Gate 4, Gate 7, Gate 8, or Gate 9 claims.", `${path}.publishClaims[${index}]`);
    }
  });

  if (contract.site02Material === true || contract.site_02_material === true) {
    addIssue(issues, "rcr07-site02-private", "RCR-07", "Site 02 private material is marked for public readiness.", "Site 02 remains private and non-public.", path);
  }

  if (contract.visitorIdentityCollected === true || contract.visitor_identity_collected === true || contract.visitorStorage === true || contract.visitor_storage === true) {
    addIssue(issues, "rcr07-visitor-storage", "RCR-07", "Visitor identity or storage is present without a later consent contract.", "Visitor storage and identity persistence must fail closed until consent and retention are separately approved.", path);
  }

  const reducedMotionContracts = arrayRecords(firstDefined(contract.reducedMotion, contract.reduced_motion, contract.reducedMotionContracts, contract.reduced_motion_contracts));
  reducedMotionContracts.forEach((entry, index) => validateReducedMotionContract(entry, `${path}.reducedMotion[${index}]`, issues));

  const measurements = arrayRecords(firstDefined(contract.measurementReadiness, contract.measurement_readiness, contract.measurement, contract.measurements));
  measurements.forEach((entry, index) => validateMeasurementReadiness(entry, `${path}.measurementReadiness[${index}]`, issues));

  const pairings = arrayRecords(firstDefined(contract.compatibilityPairings, contract.compatibility_pairings, contract.pairings, contract.compatibility));
  pairings.forEach((pairing, index) => validateCompatibilityPairing(pairing, `${path}.compatibilityPairings[${index}]`, issues));

  return issues;
}

export function parseReducedMotionDeclaration(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : "")).join("\n").trim();
  }
  return typeof value === "string" ? value.trim() : "";
}

export function ownedHTML(
  value: string,
  ownership: unknown,
  ownerReferences: unknown,
  options: RcrContractEvaluationOptions = {},
): string {
  if (!isRecord(ownership)) {
    throw new Error("RCR ownership rendering failed: ownership must be a declared object.");
  }

  assertRcrContract(
    {
      ownerReferences,
      ownerships: [ownership],
    },
    "ownedHTML",
    options,
  );

  const owners = arrayRecords(ownerReferences);
  const ownerById = new Map(
    owners.map((owner) => [
      text(firstDefined(owner.id, owner.ownerId, owner.owner_id)),
      text(firstDefined(owner.displayName, owner.display_name, owner.label)),
    ]),
  );
  const kind = text(firstDefined(ownership.kind, ownership.ownershipKind, ownership.ownership_kind));
  const ids = relationIds(ownership);
  const escapedValue = escapeHtml(value);

  if (kind === "commons") {
    return `<span class="presence-owned presence-owned--commons" data-ownership-kind="commons" data-owner-ids="">${escapedValue}<span class="presence-owned__mark">Shared commons</span></span>`;
  }

  if (kind === "member") {
    const ownerId = ids[0] ?? "";
    const ownerName = ownerById.get(ownerId) ?? ownerId;
    return `<span class="presence-owned presence-owned--member" data-ownership-kind="member" data-owner-ids="${escapeHtml(ownerId)}">${escapedValue}<span class="presence-owned__mark">Owned by ${escapeHtml(ownerName)}</span></span>`;
  }

  const ownerNames = ids.map((id) => ownerById.get(id) ?? id);
  return `<span class="presence-owned presence-owned--contested" data-ownership-kind="contested" data-owner-ids="${escapeHtml(ids.join(" "))}">${escapedValue}<span class="presence-owned__mark">Unresolved attribution: ${escapeHtml(ownerNames.join(" / "))}</span></span>`;
}

function collectRcrContracts(value: unknown, path: string): Array<{ contract: unknown; path: string }> {
  if (!isRecord(value)) return [];

  const direct: Array<{ contract: unknown; path: string }> = [];
  for (const key of RCR_CONTRACT_CONTAINER_KEYS) {
    if (key in value) {
      direct.push({ contract: value[key], path: `${path}.${key}` });
    }
  }

  for (const nestedKey of ["content_config", "metadata", "style_dna", "motion_config"]) {
    const nested = value[nestedKey];
    if (isRecord(nested)) {
      direct.push(...collectRcrContracts(nested, `${path}.${nestedKey}`));
    }
  }

  return direct;
}

function validateReducedMotionContract(entry: Record<string, unknown>, path: string, issues: RcrContractIssue[]): void {
  const declaration = parseReducedMotionDeclaration(firstDefined(entry.declaration, entry.contract, entry.summary));
  if (!declaration) {
    addIssue(issues, "rcr09-reduced-motion-missing", "RCR-09", "Reduced-motion contract is missing.", "Reduced-motion must be declared before adapter reliance.", path);
  } else if (!/\b(reduced motion|prefers-reduced-motion|motion-reduced)\b/i.test(declaration) || !/\b(same|truth|state|resolved|terminal|legible|visible|present|placed|remaining|arrives)\b/i.test(declaration)) {
    addIssue(issues, "rcr09-reduced-motion-weak", "RCR-09", "Reduced-motion declaration does not preserve resolved state.", "The declaration must prove reduced motion reaches the same content truth state as the animated path.", `${path}.declaration`);
  }

  const animatedTruthState = firstDefined(entry.animatedTruthState, entry.animated_truth_state);
  const reducedTruthState = firstDefined(entry.reducedTruthState, entry.reduced_truth_state);
  if (animatedTruthState === undefined || reducedTruthState === undefined) {
    addIssue(issues, "rcr09-reduced-motion-state", "RCR-09", "Reduced-motion truth states are missing.", "Animated and reduced paths must each declare their resolved content state.", path);
  } else if (stableStringify(animatedTruthState) !== stableStringify(reducedTruthState)) {
    addIssue(issues, "rcr09-reduced-motion-divergence", "RCR-09", "Reduced-motion path resolves to a different truth state.", "Reduced-motion cannot strand or skip content compared with the animated path.", path);
  }

  if (entry.usesDivergentSimulation === true || entry.uses_divergent_simulation === true || entry.strandedContent === true || entry.stranded_content === true || entry.unreachableTerminalState === true || entry.unreachable_terminal_state === true) {
    addIssue(issues, "rcr09-reduced-motion-divergent-path", "RCR-09", "Reduced-motion path is divergent or incomplete.", "Divergent simulation, stranded content, and unreachable terminal states fail closed.", path);
  }

  if (strings(firstDefined(entry.missingMarkers, entry.missing_markers)).length > 0) {
    addIssue(issues, "rcr09-reduced-motion-markers", "RCR-09", "Reduced-motion contract is missing required markers.", "Reduced-motion validation must not pass when expected state markers are absent.", path);
  }
}

function validateMeasurementReadiness(entry: Record<string, unknown>, path: string, issues: RcrContractIssue[]): void {
  if (entry.analyticsOnly === true || entry.analytics_only === true) {
    addIssue(issues, "rcr10-analytics-only", "RCR-10", "Measurement readiness is being replaced by analytics.", "Box measurement readiness must be distinct from analytics events or dashboards.", path);
  }

  const box = record(firstDefined(entry.measuredBox, entry.measured_box, entry.box));
  const width = numberValue(firstDefined(box?.width, box?.w));
  const height = numberValue(firstDefined(box?.height, box?.h));
  if (!box || width === null || height === null || width <= 0 || height <= 0 || (width === 300 && height === 150)) {
    addIssue(issues, "rcr10-degenerate-box", "RCR-10", "Measurement readiness has a missing or degenerate box.", "Studio preview and module box readiness must fail closed on zero, hidden, or default canvas boxes.", path);
  }

  const signals = record(firstDefined(entry.signals, entry.readinessSignals, entry.readiness_signals));
  const hasRequiredSignals = signals?.resizeObserver === true && signals?.boundedAnimationFrame === true && signals?.documentVisibility === true;
  if (!hasRequiredSignals || (entry.recoveredAfterVisibility === false || entry.recovered_after_visibility === false)) {
    addIssue(issues, "rcr10-measurement-signals", "RCR-10", "Measurement readiness is missing runtime box signals.", "Readiness must wait for ResizeObserver, bounded animation frame, and document visibility recovery signals.", path);
  }
}

function validateCompatibilityPairing(pairing: Record<string, unknown>, path: string, issues: RcrContractIssue[]): void {
  const tier = text(firstDefined(pairing.tier, pairing.compatibilityTier, pairing.compatibility_tier)).toLowerCase();
  if (!COMPATIBILITY_TIERS.has(tier)) {
    addIssue(issues, "rcr11-tier-missing", "RCR-11", "Compatibility tier is missing or unsupported.", "Pairings must preserve Flagship, Supported, Experimental, or Blocked tier state.", path);
    return;
  }

  if (tier === "blocked") {
    if (!text(firstDefined(pairing.reason, pairing.blockedReason, pairing.blocked_reason))) {
      addIssue(issues, "rcr11-blocked-reason", "RCR-11", "Blocked pairing reason was discarded.", "Blocked compatibility tiers must preserve the reason text through adaptation.", path);
    }
    if (pairing.selectable === true || pairing.publishable === true || pairing.supported === true) {
      addIssue(issues, "rcr11-blocked-selectable", "RCR-11", "Blocked pairing is being treated as selectable or publishable.", "Blocked compatibility tiers must not become supported, selectable, publishable, or flagship.", path);
    }
  }

  if ((tier === "flagship" || tier === "supported") && pairing.tested !== true) {
    addIssue(issues, "rcr11-untested-supported", "RCR-11", "Untested pairing is marked supported.", "Untested Site 08 cross-pairings remain hypotheses and cannot be promoted to supported or flagship.", path);
  }

  if (tier === "experimental" && !text(firstDefined(pairing.warning, pairing.downgrade, pairing.reason))) {
    addIssue(issues, "rcr11-experimental-warning", "RCR-11", "Experimental pairing lacks a visible warning or downgrade.", "Experimental compatibility must carry its warning through adaptation.", path);
  }

  if ((pairing.hypothesis === true || pairing.untested === true) && (tier === "flagship" || tier === "supported")) {
    addIssue(issues, "rcr11-hypothesis-promoted", "RCR-11", "Hypothesis pairing was promoted to supported.", "Site 08 extraction-only pairings must remain untested hypotheses until separately proven.", path);
  }
}

function findRestrictedKeys(value: unknown, path: string): Array<{ key: string; path: string }> {
  if (!isRecord(value) && !Array.isArray(value)) return [];
  const found: Array<{ key: string; path: string }> = [];
  const restricted = new Set<string>(RCR_RESTRICTED_PUBLIC_PAYLOAD_KEYS);

  function visit(current: unknown, currentPath: string): void {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    if (!isRecord(current)) return;
    for (const [key, nested] of Object.entries(current)) {
      const normalized = normalizeKey(key);
      if (restricted.has(normalized) || /password|permission|tenant|webhook|deliveryrecipient|notificationendpoint/i.test(normalized)) {
        found.push({ key, path: `${currentPath}.${key}` });
      }
      visit(nested, `${currentPath}.${key}`);
    }
  }

  visit(value, path);
  return found;
}

function relationIds(recordValue: Record<string, unknown>): string[] {
  return [
    ...strings(recordValue.ownerIds),
    ...strings(recordValue.owner_ids),
    ...strings(recordValue.holderIds),
    ...strings(recordValue.holder_ids),
    ...strings(recordValue.references),
    ...strings(recordValue.referenceIds),
    ...strings(recordValue.reference_ids),
    ...strings(recordValue.ownerId),
    ...strings(recordValue.owner_id),
    ...strings(recordValue.holderId),
    ...strings(recordValue.holder_id),
  ];
}

function hasUnapprovedDeliveryClaim(outcome: string): boolean {
  if (!outcome || !DELIVERY_CLAIM_PATTERN.test(outcome)) return false;
  return splitDeliveryClauses(outcome).some((clause) => DELIVERY_CLAIM_PATTERN.test(clause) && !NEGATED_DELIVERY_PATTERN.test(clause));
}

function splitDeliveryClauses(outcome: string): string[] {
  return outcome.split(/\b(?:but|and)\b|[;,]|--|—/i).map((clause) => clause.trim()).filter(Boolean);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function addIssue(
  issues: RcrContractIssue[],
  id: string,
  rcr: RcrId,
  label: string,
  detail: string,
  path: string,
): void {
  issues.push({ id, rcr, severity: "critical", label, detail, path });
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

function arrayRecords(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) return [value];
  return [];
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => strings(item));
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (typeof value === "number") return [String(value)];
  return [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function normalizeKey(key: string): string {
  return key.replace(/[-_\s]/g, "").toLowerCase();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
