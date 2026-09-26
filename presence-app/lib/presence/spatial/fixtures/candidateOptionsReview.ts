import {
  addArrangerComponent,
  assignArrangerMaterialPreset,
  assignArrangerMedia,
  assignArrangerOpenLink,
  assignArrangerSkin,
  createBlankMobstarSpatialRoom,
} from "../arranger.ts";
import { CANDIDATE_COMPONENT_OPTIONS } from "../candidateOptions.ts";
import type { SpatialRoomDefinition } from "../model.ts";

export const CANDIDATE_OPTIONS_REVIEW_FIXTURE = createCandidateOptionsReviewFixture();

function createCandidateOptionsReviewFixture(): SpatialRoomDefinition {
  let room: SpatialRoomDefinition = {
    ...createBlankMobstarSpatialRoom(),
    id: "candidate-options-review",
    label: "Candidate options review fixture",
    fixtureKind: "generic-proof",
    revision: 1,
    seed: "candidate-options-review-v1",
    semanticFallback: [],
  };

  const add = (componentId: string) => {
    const result = addArrangerComponent(room, componentId);
    if (!result.ok) throw new Error(`Unable to add ${componentId}: ${result.issues[0]?.message ?? "unknown error"}`);
    room = result.room;
    return room.placements.find((placement) => placement.componentId === componentId);
  };

  const displayIsland = add("candidate.table.old-church-modeling-interior-sce-ffd7-017");
  add("candidate.chair.interior-7-3bc1-013");
  add("candidate.shelf.retopo-g-555780-0ae2-013");

  if (displayIsland) {
    room = must(
      assignArrangerMaterialPreset(room, displayIsland.id, "tabletop", "tabletop-gallery-white"),
      "candidate display island material",
    );
    room = must(assignArrangerSkin(room, displayIsland.id, room.skins[0]?.id ?? ""), "candidate display island skin");
    room = must(assignArrangerMedia(room, displayIsland.id, room.media[0]?.id ?? ""), "candidate display island media");
    room = must(
      assignArrangerOpenLink(room, displayIsland.id, "Open candidate evidence", "https://example.com/candidate-options-review"),
      "candidate display island action",
    );
  }

  return {
    ...room,
    id: "candidate-options-review",
    label: "Candidate options review fixture",
    fixtureKind: "generic-proof",
    seed: "candidate-options-review-v1",
  };
}

function must(
  result: ReturnType<typeof assignArrangerMaterialPreset>,
  label: string,
): SpatialRoomDefinition {
  if (!result.ok) throw new Error(`Unable to apply ${label}: ${result.issues[0]?.message ?? "unknown error"}`);
  return result.room;
}

export const CANDIDATE_OPTIONS_REVIEW_COMPONENT_REFS = CANDIDATE_COMPONENT_OPTIONS.map((option) => ({
  componentId: option.componentId,
  version: option.version,
}));
