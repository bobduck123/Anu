import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRcrContract,
  evaluateRcrContract,
  evaluateRcrContractInPresence,
  ownedHTML,
  parseReducedMotionDeclaration,
} from "./rcrContract.ts";
import type { PresenceNode } from "@/lib/api/types.ts";

const validContract = {
  ownerReferences: [
    { id: "owner-christina", displayName: "Christina Kerkvliet Goddard", lifecycleState: "active" },
    { id: "owner-archive", displayName: "Archive reference", lifecycleState: "departed", displayPolicy: "Show as historical attribution." },
  ],
  ownerships: [
    { kind: "member", ownerIds: ["owner-christina"] },
  ],
  relations: [
    { id: "work-1", ownerIds: ["owner-christina"] },
  ],
  testimonies: [
    { ownerId: "owner-christina", quote: "Approved supplied text.", supplied: true, approvalEvidence: "source-sheet-row-2" },
  ],
  reducedMotion: [
    {
      declaration: [
        "Reduced motion path uses prefers-reduced-motion and reaches the same resolved truth state.",
        "All terminal content remains visible and present.",
      ],
      animatedTruthState: { visible: ["hero", "work-1"], terminal: "present" },
      reducedTruthState: { terminal: "present", visible: ["hero", "work-1"] },
    },
  ],
  measurementReadiness: [
    {
      measuredBox: { width: 640, height: 420 },
      signals: { resizeObserver: true, boundedAnimationFrame: true, documentVisibility: true },
      recoveredAfterVisibility: true,
    },
  ],
  compatibilityPairings: [
    { lookId: "look-a", roomStyleId: "room-a", tier: "supported", tested: true },
    { lookId: "look-b", roomStyleId: "room-a", tier: "blocked", reason: "Layout cannot preserve object order.", selectable: false, publishable: false },
  ],
};

test("valid Level 1 attributed single-tenancy contract passes public evaluation", () => {
  assert.deepEqual(evaluateRcrContract(validContract, "contract", { surface: "public" }), []);
  assert.doesNotThrow(() => assertRcrContract(validContract, "contract", { surface: "public" }));
});

test("RCR-06 rejects owner references that introduce account principals", () => {
  const issues = evaluateRcrContract({
    ...validContract,
    ownerReferences: [
      {
        id: "user_123",
        displayName: "Unsafe owner",
        lifecycleState: "active",
        tenantId: "tenant-1",
        deliveryRecipient: "person@example.com",
      },
    ],
  }, "contract");

  assert.equal(issues.some((issue) => issue.rcr === "RCR-06" && issue.id === "rcr06-owner-principal-id"), true);
  assert.equal(issues.some((issue) => issue.rcr === "RCR-06" && issue.id === "rcr06-owner-principal-field"), true);
});

test("RCR-06 does not let empty primary relation arrays shadow populated holder aliases", () => {
  const issues = evaluateRcrContract({
    ownerReferences: [
      { id: "owner-a", displayName: "Owner A", lifecycleState: "active" },
    ],
    ownerships: [
      { kind: "commons", ownerIds: [], holderIds: ["owner-a"] },
      { kind: "member", ownerIds: [], holderIds: ["owner-a", "owner-b"] },
      { kind: "contested", ownerIds: [], holderIds: ["owner-a"] },
    ],
  }, "contract");

  assert.equal(issues.some((issue) => issue.id === "rcr06-commons-holder"), true);
  assert.equal(issues.some((issue) => issue.id === "rcr06-member-holder"), true);
  assert.equal(issues.some((issue) => issue.id === "rcr06-contested-holders"), true);
});

test("RCR-06 rejects M1 owner references that reuse authenticated owner ids", () => {
  const authOwnerId = "6f1b2c34-9a77-4c02-9c0e-3f1d2b7a55e1";
  const issues = evaluateRcrContractInPresence(
    {
      content_config: {
        registry_contract: {
          ownerReferences: [
            { id: authOwnerId, displayName: "Auth-shaped owner", lifecycleState: "active" },
          ],
        },
      },
    } as never,
    {
      id: 42,
      owner_user_id: authOwnerId,
      slug: "auth-shaped-owner",
      display_name: "Auth Shaped Owner",
      node_type: "artist",
      display_mode: "room",
      status: "draft",
      visibility: "private",
    } as unknown as PresenceNode,
  );

  assert.equal(issues.some((issue) => issue.id === "rcr06-owner-auth-reuse"), true);
});

test("RCR-07 blocks contested public attribution, dangling relations, unsupplied testimony, and fake delivery", () => {
  const issues = evaluateRcrContract({
    ownerReferences: [
      { id: "owner-a", displayName: "Owner A", lifecycleState: "active" },
      { id: "owner-b", displayName: "Owner B", lifecycleState: "active" },
    ],
    ownerships: [
      { kind: "contested", ownerIds: ["owner-a", "owner-b"], orderingBasis: "source order" },
    ],
    relations: [
      { id: "relation-1", ownerIds: ["owner-a", "owner-missing"] },
    ],
    testimonies: [
      { ownerId: "owner-a", quote: "Generated praise.", generated: true },
    ],
    routing: [
      { result: "delivered", success: true },
      { result: "unroutable", fallbackUsed: true },
    ],
    publishClaims: ["Gate 7 started and public-ready."],
    site02Material: true,
    visitorStorage: true,
  }, "contract", { surface: "public" });

  for (const id of [
    "rcr07-contested-public",
    "rcr07-dangling-relation",
    "rcr07-supplied-testimony",
    "rcr07-fake-delivery",
    "rcr07-unroutable-fallback",
    "rcr07-public-claim",
    "rcr07-site02-private",
    "rcr07-visitor-storage",
  ]) {
    assert.equal(issues.some((issue) => issue.id === id), true, id);
  }
});

test("RCR-07 allows honest no-delivery language while still blocking fake delivery", () => {
  const honestIssues = evaluateRcrContract({
    routing: [
      { result: "local review, no destination" },
      { result: "nothing was sent" },
      { result: "not booked" },
      { result: "never notified" },
      { result: "not routed anywhere" },
      { result: "not booked and never notified" },
      { result: "not routed anywhere — no destination" },
      { result: "unroutable" },
    ],
  }, "contract");
  assert.equal(honestIssues.some((issue) => issue.id === "rcr07-fake-delivery"), false);

  const fakeIssues = evaluateRcrContract({
    routing: [
      { result: "delivered" },
      { result: "owner destination assigned" },
      { result: "no destination locally, but delivered to the owner inbox" },
      { result: "no destination and delivered to the owner inbox" },
      { result: "no destination — delivered to the owner inbox" },
      { result: "not booked and routed to owner inbox" },
      { result: "local review", sent: true },
    ],
  }, "contract");
  assert.equal(fakeIssues.filter((issue) => issue.id === "rcr07-fake-delivery").length, 7);
});

test("RCR-08 fails by invocation through assertRcrContract", () => {
  assert.throws(
    () => assertRcrContract({ ownerReferences: [{ id: "auth_1", displayName: "Auth", lifecycleState: "active" }] }, "contract"),
    /RCR contract enforcement failed: RCR-06/,
  );
});

test("RCR-08 ownership rendering guard fails unsafe ownership and renders valid visible markers", () => {
  const ownerReferences = [
    { id: "owner-a", displayName: "Owner A", lifecycleState: "active" },
    { id: "owner-b", displayName: "Owner B", lifecycleState: "active" },
  ];

  assert.throws(
    () => ownedHTML("Shared cloth", { kind: "commons", ownerIds: [], holderIds: ["owner-a"] }, ownerReferences),
    /RCR contract enforcement failed: RCR-06/,
  );

  const memberMarkup = ownedHTML("Member cloth", { kind: "member", ownerIds: ["owner-a"] }, ownerReferences);
  assert.match(memberMarkup, /data-ownership-kind="member"/);
  assert.match(memberMarkup, /Owned by Owner A/);

  const contestedMarkup = ownedHTML(
    "Technique difference",
    { kind: "contested", ownerIds: ["owner-a", "owner-b"], orderingBasis: "source order" },
    ownerReferences,
    { surface: "internal" },
  );
  assert.match(contestedMarkup, /data-ownership-kind="contested"/);
  assert.match(contestedMarkup, /Unresolved attribution: Owner A \/ Owner B/);
});

test("RCR-09 supports multi-line declarations and rejects divergent reduced-motion states", () => {
  assert.equal(
    parseReducedMotionDeclaration(["Line one", "Line two"]),
    "Line one\nLine two",
  );

  const issues = evaluateRcrContract({
    reducedMotion: [
      {
        declaration: "Reduced motion branch uses prefers-reduced-motion but skips terminal state.",
        animatedTruthState: { visible: ["hero", "gallery"], terminal: "complete" },
        reducedTruthState: { visible: ["hero"], terminal: "incomplete" },
        missingMarkers: ["gallery"],
      },
    ],
  }, "contract");

  assert.equal(issues.some((issue) => issue.id === "rcr09-reduced-motion-divergence"), true);
  assert.equal(issues.some((issue) => issue.id === "rcr09-reduced-motion-markers"), true);
});

test("RCR-10 keeps measurement readiness distinct from analytics and rejects degenerate boxes", () => {
  const issues = evaluateRcrContract({
    measurementReadiness: [
      {
        analyticsOnly: true,
        source: "canvas-default",
        measuredBox: { width: 300, height: 150 },
        signals: { resizeObserver: true },
        recoveredAfterVisibility: false,
      },
    ],
  }, "contract");

  assert.equal(issues.some((issue) => issue.id === "rcr10-analytics-only"), true);
  assert.equal(issues.some((issue) => issue.id === "rcr10-degenerate-box"), true);
  assert.equal(issues.some((issue) => issue.id === "rcr10-measurement-signals"), true);
});

test("RCR-10 rejects default 300x150 boxes without relying on source strings", () => {
  const issues = evaluateRcrContract({
    measurementReadiness: [
      {
        measuredBox: { width: 300, height: 150 },
        signals: { resizeObserver: true, boundedAnimationFrame: true, documentVisibility: true },
        recoveredAfterVisibility: true,
      },
    ],
  }, "contract");

  assert.equal(issues.some((issue) => issue.id === "rcr10-degenerate-box"), true);
});

test("RCR-11 preserves Blocked tier reasons and prevents untested promotion", () => {
  const issues = evaluateRcrContract({
    compatibilityPairings: [
      { lookId: "look-a", roomStyleId: "room-a", tier: "blocked", selectable: true },
      { lookId: "look-b", roomStyleId: "room-a", tier: "supported", hypothesis: true, tested: false },
      { lookId: "look-c", roomStyleId: "room-a", tier: "experimental" },
    ],
  }, "contract");

  for (const id of [
    "rcr11-blocked-reason",
    "rcr11-blocked-selectable",
    "rcr11-untested-supported",
    "rcr11-hypothesis-promoted",
    "rcr11-experimental-warning",
  ]) {
    assert.equal(issues.some((issue) => issue.id === id), true, id);
  }
});
