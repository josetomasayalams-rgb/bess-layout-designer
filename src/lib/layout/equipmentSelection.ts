import type {
  LngLat,
  ProjectAnchor,
  RotatedRectLocal,
} from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { placedToRect } from "@/lib/layout/spacingRules";
import {
  allCornersInsidePolygon,
  rectanglesIntersect,
} from "@/lib/geometry/collision";
import { distanceBetweenRectangles } from "@/lib/geometry/distance";
import { toLocal } from "@/lib/geometry/projection";

/** Equipment type filter for area selection. */
export type SelectionTypeFilter = "all" | "battery_container" | "pcs_mv_station";

/** Axis-aligned rectangle in geographic coordinates. */
export type LngLatRect = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

/** Builds a normalized (min/max) rectangle from two opposite corners. */
export function normalizeRect(a: LngLat, b: LngLat): LngLatRect {
  return {
    minLng: Math.min(a.lng, b.lng),
    maxLng: Math.max(a.lng, b.lng),
    minLat: Math.min(a.lat, b.lat),
    maxLat: Math.max(a.lat, b.lat),
  };
}

/** True when the rectangle has a non-zero footprint (a real drag). */
export function rectHasArea(rect: LngLatRect): boolean {
  return rect.maxLng > rect.minLng && rect.maxLat > rect.minLat;
}

/** The four corners of the rectangle, counter-clockwise. */
export function rectCornersLngLat(rect: LngLatRect): LngLat[] {
  return [
    { lng: rect.minLng, lat: rect.minLat },
    { lng: rect.maxLng, lat: rect.minLat },
    { lng: rect.maxLng, lat: rect.maxLat },
    { lng: rect.minLng, lat: rect.maxLat },
  ];
}

function pointInRect(p: LngLat, rect: LngLatRect): boolean {
  return (
    p.lng >= rect.minLng &&
    p.lng <= rect.maxLng &&
    p.lat >= rect.minLat &&
    p.lat <= rect.maxLat
  );
}

/**
 * Ids of equipment whose center (anchor) falls inside the rectangle,
 * optionally narrowed to a single equipment type.
 */
export function equipmentIdsInRect(
  placed: PlacedEquipment[],
  rect: LngLatRect,
  typeFilter: SelectionTypeFilter
): string[] {
  const ids: string[] = [];
  for (const item of placed) {
    if (!pointInRect(item.anchor, rect)) continue;
    if (typeFilter !== "all") {
      const spec = equipmentCatalog.find((s) => s.id === item.equipmentSpecId);
      if (!spec || spec.type !== typeFilter) continue;
    }
    ids.push(item.id);
  }
  return ids;
}

export type SelectionStatus = "ok" | "warn" | "error";

export type SelectionValidation = {
  collisionCount: number;
  tooCloseCount: number;
  outOfBoundsCount: number;
  status: SelectionStatus;
};

const EMPTY_VALIDATION: SelectionValidation = {
  collisionCount: 0,
  tooCloseCount: 0,
  outOfBoundsCount: 0,
  status: "ok",
};

/**
 * Validates a selection after an edit: collisions and minimum-clearance
 * breaches for any pair touching the selection, plus selected equipment
 * that ended up outside the site polygon.
 *
 * Reuses the existing collision / distance / polygon primitives so the
 * geometry logic is not duplicated.
 */
export function selectionValidation(
  placed: PlacedEquipment[],
  selectedIds: ReadonlySet<string>,
  polygon: LngLat[],
  anchor: ProjectAnchor | null,
  minClearanceM: number
): SelectionValidation {
  if (!anchor || selectedIds.size === 0) return EMPTY_VALIDATION;

  const rects = placed
    .map((p) => ({ p, rect: placedToRect(p, anchor) }))
    .filter(
      (x): x is { p: PlacedEquipment; rect: RotatedRectLocal } =>
        x.rect !== null
    );

  let collisionCount = 0;
  let tooCloseCount = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (!selectedIds.has(rects[i].p.id) && !selectedIds.has(rects[j].p.id)) {
        continue;
      }
      if (rectanglesIntersect(rects[i].rect, rects[j].rect)) {
        collisionCount += 1;
      } else if (
        distanceBetweenRectangles(rects[i].rect, rects[j].rect) + 1e-6 <
        minClearanceM
      ) {
        tooCloseCount += 1;
      }
    }
  }

  let outOfBoundsCount = 0;
  if (polygon.length >= 3) {
    const localPolygon = polygon.map((vertex) => toLocal(vertex, anchor));
    for (const { p, rect } of rects) {
      if (!selectedIds.has(p.id)) continue;
      if (!allCornersInsidePolygon(rect, localPolygon)) outOfBoundsCount += 1;
    }
  }

  const status: SelectionStatus =
    collisionCount > 0 || outOfBoundsCount > 0
      ? "error"
      : tooCloseCount > 0
        ? "warn"
        : "ok";

  return { collisionCount, tooCloseCount, outOfBoundsCount, status };
}
