import type {
  SpatialComponentDefinition,
  SpatialPlacement,
  SpatialRoomDefinition,
  SpatialTransform,
  SpatialValidationIssue,
  SpatialVec3,
} from "./model.ts";
import { requireSpatialComponent, spatialComponent } from "./registry.ts";

export type SpatialPlacementMutation =
  | { kind: "add"; placement: SpatialPlacement }
  | { kind: "replace"; placementId: string; placement: SpatialPlacement }
  | { kind: "remove"; placementId: string };

export type SpatialPlacementMutationResult =
  | { ok: true; room: SpatialRoomDefinition }
  | { ok: false; room: SpatialRoomDefinition; issues: readonly SpatialValidationIssue[] };

export interface SpatialSnapSettings {
  gridStep: number;
  rotationStepDegrees: number;
}

export const DEFAULT_SPATIAL_SNAP_SETTINGS: SpatialSnapSettings = {
  gridStep: 0.25,
  rotationStepDegrees: 15,
};

export function snapSpatialValue(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    throw new Error("Spatial snap values and steps must be finite, with a positive step.");
  }
  const ratio = value / step;
  if (!Number.isFinite(ratio)) {
    throw new Error("Spatial snap ratio exceeds the finite numeric range.");
  }
  const snapped = Math.round(ratio) * step;
  if (!Number.isFinite(snapped)) {
    throw new Error("Spatial snapped result exceeds the finite numeric range.");
  }
  return Object.is(snapped, -0) ? 0 : Number(snapped.toFixed(10));
}

export function snapSpatialRotation(rotationRadians: number, stepDegrees: number): number {
  if (!Number.isFinite(rotationRadians) || !Number.isFinite(stepDegrees) || stepDegrees <= 0 || stepDegrees > 360) {
    throw new Error("Spatial rotation snapping requires a finite angle and a step in the range (0, 360].");
  }
  const stepRadians = stepDegrees * Math.PI / 180;
  const snapped = snapSpatialValue(rotationRadians, stepRadians);
  const normalized = ((snapped + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return Object.is(normalized, -0) ? 0 : Number(normalized.toFixed(10));
}

export function snapSpatialTransform(
  transform: SpatialTransform,
  settings: SpatialSnapSettings = DEFAULT_SPATIAL_SNAP_SETTINGS,
): SpatialTransform {
  return {
    position: [
      snapSpatialValue(transform.position[0], settings.gridStep),
      transform.position[1],
      snapSpatialValue(transform.position[2], settings.gridStep),
    ],
    rotation: [
      transform.rotation[0],
      snapSpatialRotation(transform.rotation[1], settings.rotationStepDegrees),
      transform.rotation[2],
    ],
    scale: transform.scale,
  };
}

export function resolveSpatialPlacementTransform(
  room: Pick<SpatialRoomDefinition, "placements">,
  placement: SpatialPlacement,
): SpatialTransform {
  const byId = new Map(room.placements.map((candidate) => [candidate.id, candidate]));
  const visiting = new Set<string>();

  function resolve(current: SpatialPlacement): SpatialTransform {
    if (!current.anchor.parentPlacementId) return current.transform;
    if (visiting.has(current.id)) return current.transform;
    visiting.add(current.id);
    const parent = byId.get(current.anchor.parentPlacementId);
    if (!parent) return current.transform;
    const parentTransform = resolve(parent);
    const parentDefinition = spatialComponent(parent);
    const anchor = parentDefinition?.anchors.find((candidate) => candidate.id === current.anchor.anchorId);
    const anchorTransform = anchor?.transform ?? IDENTITY_TRANSFORM;
    visiting.delete(current.id);
    return composeTransform(parentTransform, composeTransform(anchorTransform, current.transform));
  }

  return resolve(placement);
}

export function validateSpatialPlacementRules(room: SpatialRoomDefinition): SpatialValidationIssue[] {
  const issues: SpatialValidationIssue[] = [];
  const byId = new Map(room.placements.map((placement) => [placement.id, placement]));

  for (const placement of room.placements) {
    const path = `placements.${placement.id}`;
    const definition = spatialComponent(placement);
    if (!definition) {
      issues.push(issue(path, "unknown-component", `Unknown component ${placement.componentId}@${placement.version}.`));
      continue;
    }

    if (!definition.placement.allowedAnchorKinds.includes(placement.anchor.kind)) {
      issues.push(issue(path, "anchor-kind", `${definition.label} cannot use a ${placement.anchor.kind} anchor.`));
    }
    if (definition.placement.requiresParent && !placement.anchor.parentPlacementId) {
      issues.push(issue(path, "parent-required", `${definition.label} requires a parent fixture.`));
    }
    if (placement.anchor.parentPlacementId) {
      const parent = byId.get(placement.anchor.parentPlacementId);
      if (!parent) {
        issues.push(issue(path, "parent-missing", `Parent placement ${placement.anchor.parentPlacementId} does not exist.`));
      } else if (parent.id === placement.id || hasParentCycle(placement, byId)) {
        issues.push(issue(path, "parent-cycle", "Placement parent references must be acyclic."));
      } else {
        validateParentAnchor(room, placement, definition, parent, issues);
      }
    } else if (placement.anchor.anchorId) {
      issues.push(issue(path, "orphan-anchor", "An anchorId requires parentPlacementId."));
    }

    const resolved = resolveSpatialPlacementTransform(room, placement);
    if (!insideRoom(room, definition, resolved)) {
      issues.push(issue(path, "room-bounds", `${definition.label} exceeds the room boundary or floor/ceiling limits.`));
    }
  }

  validateSolidCollisions(room, issues);
  validateCameraPath(room, issues);
  return issues;
}

export function applySpatialPlacementMutation(
  room: SpatialRoomDefinition,
  mutation: SpatialPlacementMutation,
): SpatialPlacementMutationResult {
  let placements: readonly SpatialPlacement[] = room.placements;
  if (mutation.kind === "add") {
    if (placements.some((placement) => placement.id === mutation.placement.id)) {
      return { ok: false, room, issues: [issue(`placements.${mutation.placement.id}`, "duplicate-id", "Placement ID already exists.")] };
    }
    placements = [...placements, mutation.placement];
  } else if (mutation.kind === "replace") {
    if (mutation.placement.id !== mutation.placementId || !placements.some((placement) => placement.id === mutation.placementId)) {
      return { ok: false, room, issues: [issue(`placements.${mutation.placementId}`, "replace-missing", "Replacement must preserve an existing placement ID.")] };
    }
    placements = placements.map((placement) => placement.id === mutation.placementId ? mutation.placement : placement);
  } else {
    if (!placements.some((placement) => placement.id === mutation.placementId)) {
      return { ok: false, room, issues: [issue(`placements.${mutation.placementId}`, "remove-missing", "Placement does not exist.")] };
    }
    const references = removalReferences(room, mutation.placementId);
    if (references.length > 0) {
      return { ok: false, room, issues: references };
    }
    if (placements.some((placement) => placement.anchor.parentPlacementId === mutation.placementId)) {
      return { ok: false, room, issues: [issue(`placements.${mutation.placementId}`, "parent-in-use", "Remove anchored child placements first.")] };
    }
    placements = placements.filter((placement) => placement.id !== mutation.placementId);
  }
  const candidate = { ...room, placements };
  const issues = validateSpatialPlacementRules(candidate);
  return issues.length === 0 ? { ok: true, room: candidate } : { ok: false, room, issues };
}

function validateParentAnchor(
  room: SpatialRoomDefinition,
  placement: SpatialPlacement,
  definition: SpatialComponentDefinition,
  parent: SpatialPlacement,
  issues: SpatialValidationIssue[],
): void {
  const path = `placements.${placement.id}`;
  const parentDefinition = spatialComponent(parent);
  if (!parentDefinition) return;
  const anchor = parentDefinition.anchors.find((candidate) => candidate.id === placement.anchor.anchorId);
  if (!anchor) {
    issues.push(issue(path, "anchor-missing", `Anchor ${placement.anchor.anchorId ?? "(missing)"} is not registered on ${parentDefinition.label}.`));
    return;
  }
  if (anchor.kind !== placement.anchor.kind) {
    issues.push(issue(path, "anchor-mismatch", `Anchor ${anchor.id} is ${anchor.kind}, not ${placement.anchor.kind}.`));
  }
  if (!anchor.accepts.includes(definition.category)) {
    issues.push(issue(path, "anchor-type", `${anchor.id} does not accept ${definition.category} components.`));
  }
  const occupancy = room.placements.filter((candidate) => (
    candidate.anchor.parentPlacementId === parent.id && candidate.anchor.anchorId === anchor.id
  )).length;
  if (occupancy > anchor.capacity) {
    issues.push(issue(path, "anchor-capacity", `${anchor.id} capacity is ${anchor.capacity}.`));
  }
  if (wouldShearDescendant(room, placement, parent, anchor.transform)) {
    issues.push(issue(path, "shear-transform", "Rotated descendants beneath nonuniform scale cannot be represented without shear."));
  }
  if (definition.placement.collision === "parent-contained") {
    validateParentContainedPlane(placement, definition, parentDefinition, anchor.transform, issues);
  }
}

function removalReferences(room: SpatialRoomDefinition, placementId: string): SpatialValidationIssue[] {
  const issues: SpatialValidationIssue[] = [];
  for (const placement of room.placements) {
    if (placement.anchor.parentPlacementId === placementId) {
      issues.push(issue(`placements.${placementId}`, "parent-in-use", `Placement is still referenced by child ${placement.id}.`));
    }
  }
  for (const action of room.actions) {
    if (action.targetPlacementId === placementId) {
      issues.push(issue(`actions.${action.id}.targetPlacementId`, "action-reference", `Action ${action.id} still references placement ${placementId}.`));
    }
  }
  for (const state of room.states) {
    if (state.focusPlacementId === placementId || state.visiblePlacementIds?.includes(placementId)) {
      issues.push(issue(`states.${state.id}`, "state-reference", `State ${state.id} still references placement ${placementId}.`));
    }
  }
  for (const semantic of room.semanticFallback) {
    if (semantic.placementId === placementId) {
      issues.push(issue(`semanticFallback.${placementId}`, "semantic-reference", `Semantic fallback still references placement ${placementId}.`));
    }
  }
  return issues;
}

function wouldShearDescendant(
  room: SpatialRoomDefinition,
  placement: SpatialPlacement,
  parent: SpatialPlacement,
  anchorTransform: SpatialTransform,
): boolean {
  const parentTransform = resolveSpatialPlacementTransform(room, parent);
  if (!isNonuniformScale(parentTransform.scale)) return false;
  return hasRotation(anchorTransform.rotation) || hasRotation(placement.transform.rotation);
}

function validateParentContainedPlane(
  placement: SpatialPlacement,
  definition: SpatialComponentDefinition,
  parentDefinition: SpatialComponentDefinition,
  anchorTransform: SpatialTransform,
  issues: SpatialValidationIssue[],
): void {
  const planeAxes = placement.anchor.kind === "surface"
    ? [0, 2] as const
    : placement.anchor.kind === "wall" || placement.anchor.kind === "projection" || placement.anchor.kind === "rack"
      ? [0, 1] as const
      : undefined;
  if (!planeAxes) return;

  const relative = composeTransform(anchorTransform, placement.transform);
  const half = worldAxisHalfExtents(definition, relative);
  const parentHalf: SpatialVec3 = [
    parentDefinition.dimensions.width / 2,
    parentDefinition.dimensions.height / 2,
    parentDefinition.dimensions.depth / 2,
  ];
  if (planeAxes.some((axis) => (
    relative.position[axis] - half[axis] < -parentHalf[axis] - EPSILON
    || relative.position[axis] + half[axis] > parentHalf[axis] + EPSILON
  ))) {
    issues.push(issue(
      `placements.${placement.id}`,
      "parent-bounds",
      `${definition.label} must remain contained within the planar bounds of ${parentDefinition.label}.`,
    ));
  }
}

function isNonuniformScale(scale: SpatialVec3): boolean {
  return Math.abs(Math.abs(scale[0]) - Math.abs(scale[1])) > EPSILON
    || Math.abs(Math.abs(scale[1]) - Math.abs(scale[2])) > EPSILON;
}

function hasRotation(rotation: SpatialVec3): boolean {
  return rotation.some((value) => Math.abs(value) > EPSILON);
}

function validateSolidCollisions(room: SpatialRoomDefinition, issues: SpatialValidationIssue[]): void {
  const solids = room.placements.filter((placement) => {
    const definition = spatialComponent(placement);
    return definition?.placement.collision === "solid";
  });
  const byId = new Map(room.placements.map((placement) => [placement.id, placement]));
  for (let leftIndex = 0; leftIndex < solids.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < solids.length; rightIndex += 1) {
      const left = solids[leftIndex];
      const right = solids[rightIndex];
      if (isAncestor(left.id, right, byId) || isAncestor(right.id, left, byId)) continue;
      if (overlaps(aabb(room, left), aabb(room, right))) {
        issues.push(issue(`placements.${right.id}`, "collision", `${right.id} collides with ${left.id}.`));
      }
    }
  }
}

function validateCameraPath(room: SpatialRoomDefinition, issues: SpatialValidationIssue[]): void {
  for (const placement of room.placements) {
    const definition = spatialComponent(placement);
    if (!definition?.placement.blocksCameraPath) continue;
    const bounds = aabb(room, placement);
    const clearance = room.cameraPath.clearance;
    const expanded = {
      min: [bounds.min[0] - clearance, bounds.min[1] - clearance, bounds.min[2] - clearance] as SpatialVec3,
      max: [bounds.max[0] + clearance, bounds.max[1] + clearance, bounds.max[2] + clearance] as SpatialVec3,
    };
    const blocksPath = room.cameraPath.points.length === 1
      ? pointInsideAabb(room.cameraPath.points[0], expanded)
      : room.cameraPath.points.slice(1).some((point, index) => (
        segmentIntersectsAabb(room.cameraPath.points[index], point, expanded)
      ));
    if (blocksPath) {
      issues.push(issue(`placements.${placement.id}`, "camera-path", `${placement.id} blocks the declared camera path.`));
    }
  }
}

function pointInsideAabb(
  point: SpatialVec3,
  bounds: { min: SpatialVec3; max: SpatialVec3 },
): boolean {
  return point.every((value, axis) => value >= bounds.min[axis] - EPSILON && value <= bounds.max[axis] + EPSILON);
}

function segmentIntersectsAabb(
  start: SpatialVec3,
  end: SpatialVec3,
  bounds: { min: SpatialVec3; max: SpatialVec3 },
): boolean {
  let minimumTime = 0;
  let maximumTime = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) <= EPSILON) {
      if (start[axis] < bounds.min[axis] - EPSILON || start[axis] > bounds.max[axis] + EPSILON) return false;
      continue;
    }
    const inverse = 1 / delta;
    let near = (bounds.min[axis] - start[axis]) * inverse;
    let far = (bounds.max[axis] - start[axis]) * inverse;
    if (near > far) [near, far] = [far, near];
    minimumTime = Math.max(minimumTime, near);
    maximumTime = Math.min(maximumTime, far);
    if (minimumTime > maximumTime + EPSILON) return false;
  }
  return maximumTime >= -EPSILON && minimumTime <= 1 + EPSILON;
}

function isAncestor(
  placementId: string,
  candidate: SpatialPlacement,
  byId: ReadonlyMap<string, SpatialPlacement>,
): boolean {
  let parentId = candidate.anchor.parentPlacementId;
  const visited = new Set<string>();
  while (parentId) {
    if (parentId === placementId) return true;
    if (visited.has(parentId)) return false;
    visited.add(parentId);
    parentId = byId.get(parentId)?.anchor.parentPlacementId;
  }
  return false;
}

function insideRoom(room: SpatialRoomDefinition, definition: SpatialComponentDefinition, transform: SpatialTransform): boolean {
  const halfExtents = worldAxisHalfExtents(definition, transform);
  const roomHalfWidth = room.bounds.width / 2;
  const roomHalfDepth = room.bounds.depth / 2;
  return transform.position[0] - halfExtents[0] >= -roomHalfWidth - EPSILON
    && transform.position[0] + halfExtents[0] <= roomHalfWidth + EPSILON
    && transform.position[2] - halfExtents[2] >= -roomHalfDepth - EPSILON
    && transform.position[2] + halfExtents[2] <= roomHalfDepth + EPSILON
    && transform.position[1] - halfExtents[1] >= definition.placement.floorClearance - EPSILON
    && transform.position[1] + halfExtents[1] <= room.bounds.height + EPSILON;
}

function aabb(room: SpatialRoomDefinition, placement: SpatialPlacement) {
  const definition = requireSpatialComponent(placement);
  const transform = resolveSpatialPlacementTransform(room, placement);
  const half = worldAxisHalfExtents(definition, transform);
  return {
    min: [transform.position[0] - half[0], transform.position[1] - half[1], transform.position[2] - half[2]] as SpatialVec3,
    max: [transform.position[0] + half[0], transform.position[1] + half[1], transform.position[2] + half[2]] as SpatialVec3,
  };
}

function overlaps(left: ReturnType<typeof aabb>, right: ReturnType<typeof aabb>): boolean {
  return left.min[0] < right.max[0] - EPSILON && left.max[0] > right.min[0] + EPSILON
    && left.min[1] < right.max[1] - EPSILON && left.max[1] > right.min[1] + EPSILON
    && left.min[2] < right.max[2] - EPSILON && left.max[2] > right.min[2] + EPSILON;
}

function hasParentCycle(placement: SpatialPlacement, byId: ReadonlyMap<string, SpatialPlacement>): boolean {
  const seen = new Set([placement.id]);
  let parentId = placement.anchor.parentPlacementId;
  while (parentId) {
    if (seen.has(parentId)) return true;
    seen.add(parentId);
    parentId = byId.get(parentId)?.anchor.parentPlacementId;
  }
  return false;
}

function composeTransform(parent: SpatialTransform, child: SpatialTransform): SpatialTransform {
  const parentRotation = quaternionFromEulerXYZ(parent.rotation);
  const childRotation = quaternionFromEulerXYZ(child.rotation);
  const scaledChildPosition: SpatialVec3 = [
    child.position[0] * parent.scale[0],
    child.position[1] * parent.scale[1],
    child.position[2] * parent.scale[2],
  ];
  const rotatedChildPosition = rotateVectorByQuaternion(scaledChildPosition, parentRotation);
  return {
    position: [
      stableNumber(parent.position[0] + rotatedChildPosition[0]),
      stableNumber(parent.position[1] + rotatedChildPosition[1]),
      stableNumber(parent.position[2] + rotatedChildPosition[2]),
    ],
    rotation: eulerXYZFromQuaternion(multiplyQuaternions(parentRotation, childRotation)),
    scale: [
      parent.scale[0] * child.scale[0],
      parent.scale[1] * child.scale[1],
      parent.scale[2] * child.scale[2],
    ],
  };
}

/**
 * Returns the world-axis half extents for a local box transformed with Three's
 * default intrinsic XYZ Euler convention. Taking the absolute rotation matrix
 * produces the tight AABB for the oriented box without importing the renderer.
 */
function worldAxisHalfExtents(
  definition: SpatialComponentDefinition,
  transform: SpatialTransform,
): SpatialVec3 {
  const localHalf: SpatialVec3 = [
    definition.dimensions.width * Math.abs(transform.scale[0]) / 2,
    definition.dimensions.height * Math.abs(transform.scale[1]) / 2,
    definition.dimensions.depth * Math.abs(transform.scale[2]) / 2,
  ];
  const matrix = rotationMatrixFromQuaternion(quaternionFromEulerXYZ(transform.rotation));
  return [
    Math.abs(matrix[0][0]) * localHalf[0] + Math.abs(matrix[0][1]) * localHalf[1] + Math.abs(matrix[0][2]) * localHalf[2],
    Math.abs(matrix[1][0]) * localHalf[0] + Math.abs(matrix[1][1]) * localHalf[1] + Math.abs(matrix[1][2]) * localHalf[2],
    Math.abs(matrix[2][0]) * localHalf[0] + Math.abs(matrix[2][1]) * localHalf[1] + Math.abs(matrix[2][2]) * localHalf[2],
  ];
}

interface SpatialQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Matches THREE.Euler's default intrinsic XYZ order. */
function quaternionFromEulerXYZ([x, y, z]: SpatialVec3): SpatialQuaternion {
  const halfX = x / 2;
  const halfY = y / 2;
  const halfZ = z / 2;
  const cosineX = Math.cos(halfX);
  const cosineY = Math.cos(halfY);
  const cosineZ = Math.cos(halfZ);
  const sineX = Math.sin(halfX);
  const sineY = Math.sin(halfY);
  const sineZ = Math.sin(halfZ);
  return {
    x: sineX * cosineY * cosineZ + cosineX * sineY * sineZ,
    y: cosineX * sineY * cosineZ - sineX * cosineY * sineZ,
    z: cosineX * cosineY * sineZ + sineX * sineY * cosineZ,
    w: cosineX * cosineY * cosineZ - sineX * sineY * sineZ,
  };
}

function multiplyQuaternions(left: SpatialQuaternion, right: SpatialQuaternion): SpatialQuaternion {
  return {
    x: left.x * right.w + left.w * right.x + left.y * right.z - left.z * right.y,
    y: left.y * right.w + left.w * right.y + left.z * right.x - left.x * right.z,
    z: left.z * right.w + left.w * right.z + left.x * right.y - left.y * right.x,
    w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
  };
}

function rotateVectorByQuaternion(vector: SpatialVec3, quaternion: SpatialQuaternion): SpatialVec3 {
  const tx = 2 * (quaternion.y * vector[2] - quaternion.z * vector[1]);
  const ty = 2 * (quaternion.z * vector[0] - quaternion.x * vector[2]);
  const tz = 2 * (quaternion.x * vector[1] - quaternion.y * vector[0]);
  return [
    vector[0] + quaternion.w * tx + quaternion.y * tz - quaternion.z * ty,
    vector[1] + quaternion.w * ty + quaternion.z * tx - quaternion.x * tz,
    vector[2] + quaternion.w * tz + quaternion.x * ty - quaternion.y * tx,
  ];
}

function rotationMatrixFromQuaternion(quaternion: SpatialQuaternion): readonly [SpatialVec3, SpatialVec3, SpatialVec3] {
  const { x, y, z, w } = quaternion;
  const xx = x * x;
  const xy = x * y;
  const xz = x * z;
  const xw = x * w;
  const yy = y * y;
  const yz = y * z;
  const yw = y * w;
  const zz = z * z;
  const zw = z * w;
  return [
    [1 - 2 * (yy + zz), 2 * (xy - zw), 2 * (xz + yw)],
    [2 * (xy + zw), 1 - 2 * (xx + zz), 2 * (yz - xw)],
    [2 * (xz - yw), 2 * (yz + xw), 1 - 2 * (xx + yy)],
  ];
}

function eulerXYZFromQuaternion(quaternion: SpatialQuaternion): SpatialVec3 {
  const matrix = rotationMatrixFromQuaternion(quaternion);
  const sineY = clamp(matrix[0][2], -1, 1);
  const y = Math.asin(sineY);
  if (Math.abs(sineY) < 0.9999999) {
    return [
      stableNumber(Math.atan2(-matrix[1][2], matrix[2][2])),
      stableNumber(y),
      stableNumber(Math.atan2(-matrix[0][1], matrix[0][0])),
    ];
  }
  return [
    stableNumber(Math.atan2(matrix[2][1], matrix[1][1])),
    stableNumber(y),
    0,
  ];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function stableNumber(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(12));
}

function issue(path: string, code: string, message: string): SpatialValidationIssue {
  return { path, code, message };
}

const IDENTITY_TRANSFORM: SpatialTransform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
const EPSILON = 0.0001;
