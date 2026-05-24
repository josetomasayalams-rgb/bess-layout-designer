import { equipmentCatalog } from "@/data/equipmentCatalog";
import { pointInPolygon } from "@/lib/geometry/collision";
import { rectCorners } from "@/lib/geometry/rectangles";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

export function normalizeRotation(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function rotateSelectedEquipment(
  placed: PlacedEquipment[],
  selectedIds: string[],
  deltaDeg: number
): PlacedEquipment[] {
  const selected = new Set(selectedIds);
  return placed.map((item) =>
    selected.has(item.id) && !item.locked
      ? { ...item, rotation_deg: normalizeRotation(item.rotation_deg + deltaDeg) }
      : item
  );
}

export function orientSelectedEquipment(
  placed: PlacedEquipment[],
  selectedIds: string[],
  rotationDeg: number
): PlacedEquipment[] {
  const selected = new Set(selectedIds);
  const normalized = normalizeRotation(rotationDeg);
  return placed.map((item) =>
    selected.has(item.id) && !item.locked
      ? { ...item, rotation_deg: normalized }
      : item
  );
}

/**
 * Translates the selected equipment by a local-metre offset.
 * Locked equipment is left untouched.
 */
export function moveSelectedEquipment(
  placed: PlacedEquipment[],
  selectedIds: string[],
  anchor: ProjectAnchor | null,
  delta: { x_m: number; y_m: number }
): PlacedEquipment[] {
  if (!anchor) return placed;
  const selected = new Set(selectedIds);
  return placed.map((item) => {
    if (!selected.has(item.id) || item.locked) return item;
    const local = toLocal(item.anchor, anchor);
    return {
      ...item,
      anchor: toLngLat(
        { x_m: local.x_m + delta.x_m, y_m: local.y_m + delta.y_m },
        anchor
      ),
    };
  });
}

/** Sets the locked flag on every selected equipment. */
export function setEquipmentLock(
  placed: PlacedEquipment[],
  selectedIds: string[],
  locked: boolean
): PlacedEquipment[] {
  const selected = new Set(selectedIds);
  return placed.map((item) =>
    selected.has(item.id) ? { ...item, locked } : item
  );
}

export function selectionRectangle(start: LngLat, end: LngLat): LngLat[] {
  return [
    { lng: start.lng, lat: start.lat },
    { lng: end.lng, lat: start.lat },
    { lng: end.lng, lat: end.lat },
    { lng: start.lng, lat: end.lat },
  ];
}

function boundsOf(polygon: LngLat[]) {
  const lngs = polygon.map((point) => point.lng);
  const lats = polygon.map((point) => point.lat);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

function isInsideBounds(point: LngLat, bounds: ReturnType<typeof boundsOf>): boolean {
  return (
    point.lng >= bounds.minLng &&
    point.lng <= bounds.maxLng &&
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat
  );
}

export function selectEquipmentWithinRectangle(args: {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  rectangle: LngLat[];
}): string[] {
  const { placed, anchor, rectangle } = args;
  if (rectangle.length < 4) return [];
  const bounds = boundsOf(rectangle);

  return placed
    .filter((item) => {
      if (isInsideBounds(item.anchor, bounds)) return true;
      if (!anchor) return false;

      const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
      if (!spec) return false;

      const corners = rectCorners({
        center: toLocal(item.anchor, anchor),
        length_m: spec.footprint.length_m,
        width_m: spec.footprint.width_m,
        rotation_deg: item.rotation_deg,
      }).map((corner) => toLngLat(corner, anchor));

      return corners.some((corner) => isInsideBounds(corner, bounds));
    })
    .map((item) => item.id);
}

export function selectEquipmentWithinPolygon(args: {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
}): string[] {
  const { placed, anchor, polygon } = args;
  if (polygon.length < 3) return [];
  if (!anchor) {
    const bounds = boundsOf(polygon);
    return placed
      .filter((item) => isInsideBounds(item.anchor, bounds))
      .map((item) => item.id);
  }

  const localPolygon = polygon.map((point) => toLocal(point, anchor));

  return placed
    .filter((item) => {
      const center = toLocal(item.anchor, anchor);
      if (pointInPolygon(center, localPolygon)) return true;

      const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
      if (!spec) return false;

      const corners = rectCorners({
        center,
        length_m: spec.footprint.length_m,
        width_m: spec.footprint.width_m,
        rotation_deg: item.rotation_deg,
      });

      return corners.some((corner) => pointInPolygon(corner, localPolygon));
    })
    .map((item) => item.id);
}
