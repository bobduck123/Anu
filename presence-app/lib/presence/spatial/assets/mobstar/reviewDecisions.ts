import type { CandidateReviewNote, UnfilledRole } from "../types/internalUse.ts";

/**
 * Recorded visual review for the Mobstar Gate 4 selection pass.
 *
 * Every entry here was produced by opening the candidate's rendered thumbnail,
 * not by reading its metadata. That distinction matters: the ingestion pipeline's
 * heuristic categories were wrong on most of the objects worth using, and three
 * of the highest-scoring rows by metadata alone turned out to be unusable on
 * sight. `observedAs` records what the object actually is.
 *
 * Scores are 0-4 and deliberately conservative. Where a Workbench thumbnail
 * could not settle a question — usually absolute scale — `needs3dReview` is set
 * and `scaleConfidence` is scored low rather than guessed upward.
 */
export const MOBSTAR_REVIEW_NOTES: readonly CandidateReviewNote[] = [
  // --- Selected ---
  {
    candidateId: "candidate.roomkit.warehouse-17b3",
    observedAs: "Brutalist interior shell with vertical ribbed/fluted concrete walls and a stepped ceiling",
    role: "showroom-shell",
    decision: "use-for-mobstar-gate4",
    scores: { visualQuality: 3, scaleConfidence: 4, mobstarFit: 3, needs3dReview: false },
    notes: [
      "The strongest architectural match in the batch for a dark luxury showroom: heavy ribbed concrete reads as sculptural rather than domestic.",
      "Metre-scaled at 10.7 x 4.2 x 6.8, so no rescale is needed — rare in this batch.",
      "668 KB textured, comfortably inside the 3 MB room-kit eager budget.",
      "Directly compatible with the ribbed-wall primitive and warm-nocturnal-boutique style added in the Gate 4 art-direction lane.",
      "Thumbnail views the shell from outside; interior read still needs a 3D pass before it drives final art direction.",
    ],
  },
  {
    candidateId: "candidate.table.old-church-modeling-interior-sce-ffd7-017",
    observedAs: "Clean rectangular stone slab on a recessed stepped base — reads as a sculptural plinth, not a table",
    role: "display-island",
    decision: "use-for-mobstar-gate4",
    scores: { visualQuality: 4, scaleConfidence: 3, mobstarFit: 4, needs3dReview: false },
    notes: [
      "The standout find of the batch. Silhouette is clean, symmetrical and reads immediately as a premium central display island.",
      "1.57 x 0.78 x 2.56 m is a usable island footprint at a natural 0.78 m display height.",
      "7.8 KB shape-only — two orders of magnitude inside the simple-component budget.",
      "Originally a church altar; stripped of texture it carries no religious signal, but a reviewer should confirm that framing is acceptable.",
      "Pairs with the rounded-island / display-bay primitives in the Gate 4 lane as the authored counterpart.",
    ],
  },
  {
    candidateId: "candidate.chair.interior-7-3bc1-013",
    observedAs: "Three stacked chunky sculptural blocks forming a stepped riser — not a chair",
    role: "product-riser",
    decision: "use-for-mobstar-gate4",
    scores: { visualQuality: 3, scaleConfidence: 2, mobstarFit: 4, needs3dReview: true },
    notes: [
      "Stacked raw blocks are a current streetwear-retail display idiom; this is a strong Mobstar fit despite the wrong category guess.",
      "0.35 x 0.49 x 0.42 m is a plausible riser, but absolute scale is inherited from a source whose units are unconfirmed.",
      "11.6 KB. Cheap enough to place several across the floor.",
      "needs-3d-review to confirm the blocks are solid and the stack is stable-looking from all sides.",
    ],
  },
  {
    candidateId: "candidate.decorative-prop.interior-7-3bc1-009",
    observedAs: "Wire-frame tub armchair with a thin seat pad",
    role: "showroom-seating",
    decision: "use-for-mobstar-gate4",
    scores: { visualQuality: 3, scaleConfidence: 1, mobstarFit: 2, needs3dReview: true },
    notes: [
      "Good open wire silhouette that will not visually block a small showroom floor.",
      "Recorded dimensions of 0.38 x 0.32 x 0.38 m are far too small for a real armchair, so the source scale is wrong or the extraction is partial.",
      "scaleConfidence scored 1 for that reason; do not place without a 3D scale pass.",
      "51.8 KB. Fit is moderate: it reads more cafe than luxury streetwear and may be replaced by an authored bench.",
    ],
  },
  {
    candidateId: "candidate.chair.interior-7-3bc1-000",
    observedAs: "Studio light head on a collapsible tripod stand — a lighting fixture, not a chair",
    role: "display-lighting-fixture",
    decision: "use-for-mobstar-gate4",
    scores: { visualQuality: 3, scaleConfidence: 2, mobstarFit: 3, needs3dReview: true },
    notes: [
      "A visible studio light is a credible showroom prop for a streetwear brand and supports the campaign/photography framing.",
      "Recorded height of 0.86 m is short for a light stand; the stand may be extracted collapsed, or the source scale is off.",
      "323.8 KB, within the simple-component budget but the heaviest of the selected props.",
      "Geometry only — it emits nothing. Actual lighting comes from the Gate 4 lighting profile, not from this mesh.",
    ],
  },
  {
    candidateId: "candidate.shelf.retopo-g-555780-0ae2-013",
    observedAs: "Full-height gathered fabric curtain / drape — not a shelf",
    role: "soft-division-drape",
    decision: "use-for-mobstar-gate4",
    scores: { visualQuality: 3, scaleConfidence: 3, mobstarFit: 3, needs3dReview: false },
    notes: [
      "Convincing cloth folds. Useful as a fitting-area division or a soft backdrop behind a garment display.",
      "2.07 m tall is a credible drape height and consistent with a metre-scaled source.",
      "127 KB. Maps cleanly onto the fabric material slot, so it can take fabric-garment-dark from the Gate 4 palette.",
      "Single-sided cloth: check backface behaviour in 3D before placing it where both sides are visible.",
    ],
  },

  // --- Rejected on sight ---
  {
    candidateId: "candidate.wall.coffee-shop-gld-coffee-shop-0ae2-014",
    observedAs: "Wall panel carrying a third-party baked brand graphic reading 'ENJOY YOUR TIME WITH COFFEE'",
    role: null,
    decision: "reject",
    rejectionReason: "Another brand's identity is baked into the geometry.",
    scores: { visualQuality: 2, scaleConfidence: 3, mobstarFit: 0, needs3dReview: false },
    notes: [
      "By metadata alone this looked like an ideal 1.83 x 2.49 m media wall: right size, right category, flat, 263 KB.",
      "On sight it is unusable. Baking a third party's brand into shared component geometry is exactly what the component-reference model exists to prevent.",
      "This single row justifies the cost of thumbnail-driven review over metadata scoring.",
    ],
  },
  {
    candidateId: "candidate.shelf.coffee-vending-machine-station-0ae2-004",
    observedAs: "Coffee vending machine with 'COFFEE POINT' lettering modelled into the housing",
    role: null,
    decision: "reject",
    rejectionReason: "Third-party branded fixture with baked lettering; wrong fixture type for a streetwear showroom.",
    scores: { visualQuality: 3, scaleConfidence: 4, mobstarFit: 0, needs3dReview: false },
    notes: ["Well modelled and correctly scaled at 2.35 m tall, but semantically wrong and brand-contaminated."],
  },
  {
    candidateId: "candidate.table.bovenkap-0ae2-001",
    observedAs: "Rounded appliance hood or waste-bin housing",
    role: null,
    decision: "reject",
    rejectionReason: "Service equipment, not showroom furniture.",
    scores: { visualQuality: 2, scaleConfidence: 3, mobstarFit: 0, needs3dReview: false },
    notes: ["586 KB for an object with no showroom role."],
  },
  {
    candidateId: "candidate.chair.pottery-007-0ae2-006",
    observedAs: "Terracotta vase with flowering stems",
    role: null,
    decision: "maybe-use-later",
    scores: { visualQuality: 3, scaleConfidence: 3, mobstarFit: 1, needs3dReview: false },
    notes: [
      "Competently modelled and could suit a warmer, more domestic Presence.",
      "Florals work against the dark luxury streetwear direction, so it is deferred rather than rejected outright.",
    ],
  },
  {
    candidateId: "candidate.sofa.sofa-0ae2-002",
    observedAs: "A complete lounge seating set — sofa, two tub chairs, coffee table and two planters extracted as one object",
    role: null,
    decision: "needs-manual-cleanup",
    scores: { visualQuality: 3, scaleConfidence: 3, mobstarFit: 1, needs3dReview: false },
    notes: [
      "The extraction is a grouping, not a component: six distinct objects share one node in the source.",
      "Would need splitting before any of its parts could be used, and the resulting sofa still reads cafe-lounge rather than showroom.",
      "751 KB for the whole group.",
    ],
  },
];

/**
 * Roles the ingested collection genuinely cannot fill.
 *
 * The batch is interiors — a church, a coffee shop, two living rooms, a
 * spaceship and two baked VR rooms. It contains no retail garment fixtures at
 * all, so the fixtures most central to a streetwear showroom have to come from
 * the procedural primitives rather than from extraction.
 */
export const MOBSTAR_UNFILLED_ROLES: readonly UnfilledRole[] = [
  {
    role: "garment-rack",
    status: "missing-suitable-candidate",
    reason: "The candidate registry contains zero rack-category components. No ingested source is a retail environment, so no garment rail or rack exists to extract.",
    recommendedFallback: {
      kind: "procedural-primitive",
      primitive: "suspended-rack",
      note: "Use the suspended-rack primitive from the Gate 4 art-direction lane with the rack-matte-black preset. This is the single most important Mobstar fixture and must be procedural for this gate.",
    },
  },
  {
    role: "garment-carrier",
    status: "missing-suitable-candidate",
    reason: "No garment, hanger or mannequin geometry exists anywhere in the batch.",
    recommendedFallback: {
      kind: "procedural-primitive",
      primitive: "garment-hanger",
      note: "Use the garment-hanger primitive with fabric-garment-dark and fabric-garment-signal so individual Pieces can be hung on rack slot anchors.",
    },
  },
  {
    role: "projection-media-wall",
    status: "missing-suitable-candidate",
    reason: "No projection-surface candidate exists. The only large flat panel in the batch carries a third-party baked brand graphic and was rejected on sight.",
    recommendedFallback: {
      kind: "procedural-primitive",
      primitive: "projection-grid",
      note: "Use the projection-grid primitive with projection-campaign-warm. Campaign media must be an assigned media ref, never baked geometry.",
    },
  },
  {
    role: "poster-archive-surface",
    status: "missing-suitable-candidate",
    reason: "No poster or frame candidate exists in the registry.",
    recommendedFallback: {
      kind: "procedural-primitive",
      primitive: "framed-media",
      note: "Use the framed-media primitive with poster-decal slots so archive imagery stays a swappable media ref.",
    },
  },
  {
    role: "wall-treatment",
    status: "missing-suitable-candidate",
    reason: "No standalone wall-treatment component is usable. The ribbed surface exists only inside the brutalist room kit, and the only extracted wall panels are franchise geometry or branded graphics.",
    recommendedFallback: {
      kind: "procedural-primitive",
      primitive: "ribbed-wall",
      note: "Use the ribbed-wall primitive with wall-charcoal, or mine the ribbed surface out of the brutalist room kit in a later pass.",
    },
  },
];
