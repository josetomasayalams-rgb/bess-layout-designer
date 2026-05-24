import { polygonAreaFromLngLat } from "@/lib/geometry/area";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import type { LngLat, LocalPoint, ProjectAnchor } from "@/types/geometry";

export type ParametricTerrainShape = "rectangle" | "square" | "regular-polygon";
export type ParametricTerrainSizingMode = "dimensions" | "area-ratio";

export type ParametricTerrainInput = {
  shape: ParametricTerrainShape;
  sizingMode: ParametricTerrainSizingMode;
  center: LngLat;
  areaHa: number;
  lengthM: number;
  widthM: number;
  aspectRatio: number;
  vertexCount: number;
  rotationDeg: number;
};

export type ParametricTerrainPreview = {
  polygon: LngLat[];
  center: LngLat;
  shape: ParametricTerrainShape;
  sizingMode: ParametricTerrainSizingMode;
  areaHa: number;
  areaM2: number;
  lengthM: number;
  widthM: number;
  aspectRatio: number;
  vertexCount: number;
  rotationDeg: number;
};

const MIN_DIMENSION_M = 1;
const MIN_AREA_HA = 0.01;
const MIN_RATIO = 0.1;
const MIN_VERTICES = 3;
const MAX_VERTICES = 24;

export function hectaresToM2(areaHa: number): number {
  return Math.max(MIN_AREA_HA, areaHa) * 10_000;
}

export function dimensionsFromAreaRatio(areaHa: number, aspectRatio: number) {
  const areaM2 = hectaresToM2(areaHa);
  const ratio = Math.max(MIN_RATIO, aspectRatio);
  return {
    lengthM: Math.sqrt(areaM2 * ratio),
    widthM: Math.sqrt(areaM2 / ratio),
  };
}

function normalizeRotation(rotationDeg: number): number {
  return ((rotationDeg % 360) + 360) % 360;
}

function rotatePoint(point: LocalPoint, rotationDeg: number): LocalPoint {
  const theta = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x_m: point.x_m * cos - point.y_m * sin,
    y_m: point.x_m * sin + point.y_m * cos,
  };
}

function rotatePointAroundCenter(point: LngLat, center: LngLat, deltaDeg: number): LngLat {
  const anchor: ProjectAnchor = { lng0: center.lng, lat0: center.lat };
  return toLngLat(rotatePoint(toLocal(point, anchor), deltaDeg), anchor);
}

function rectangleLocal(lengthM: number, widthM: number, rotationDeg: number): LocalPoint[] {
  const halfL = Math.max(MIN_DIMENSION_M, lengthM) / 2;
  const halfW = Math.max(MIN_DIMENSION_M, widthM) / 2;
  return [
    { x_m: -halfL, y_m: -halfW },
    { x_m: halfL, y_m: -halfW },
    { x_m: halfL, y_m: halfW },
    { x_m: -halfL, y_m: halfW },
  ].map((point) => rotatePoint(point, rotationDeg));
}

function regularPolygonLocal(
  areaM2: number,
  vertexCount: number,
  rotationDeg: number
): LocalPoint[] {
  const n = Math.min(MAX_VERTICES, Math.max(MIN_VERTICES, Math.round(vertexCount)));
  const radiusM = Math.sqrt((2 * Math.max(1, areaM2)) / (n * Math.sin((2 * Math.PI) / n)));
  return Array.from({ length: n }, (_, index) => {
    const angleDeg = rotationDeg - 90 + (index * 360) / n;
    return {
      x_m: radiusM * Math.cos((angleDeg * Math.PI) / 180),
      y_m: radiusM * Math.sin((angleDeg * Math.PI) / 180),
    };
  });
}

function bboxDimensions(points: LocalPoint[]) {
  const xs = points.map((point) => point.x_m);
  const ys = points.map((point) => point.y_m);
  return {
    lengthM: Math.max(...xs) - Math.min(...xs),
    widthM: Math.max(...ys) - Math.min(...ys),
  };
}

export function generateParametricTerrain(
  input: ParametricTerrainInput
): ParametricTerrainPreview {
  const rotationDeg = normalizeRotation(input.rotationDeg);
  const anchor: ProjectAnchor = { lng0: input.center.lng, lat0: input.center.lat };
  const safeRatio = Math.max(MIN_RATIO, input.aspectRatio);
  const safeAreaHa = Math.max(MIN_AREA_HA, input.areaHa);
  const areaBased = dimensionsFromAreaRatio(safeAreaHa, safeRatio);

  let lengthM =
    input.sizingMode === "dimensions"
      ? Math.max(MIN_DIMENSION_M, input.lengthM)
      : areaBased.lengthM;
  let widthM =
    input.sizingMode === "dimensions"
      ? Math.max(MIN_DIMENSION_M, input.widthM)
      : areaBased.widthM;
  let areaM2 = lengthM * widthM;
  let vertexCount = 4;
  let localPoints: LocalPoint[];

  if (input.shape === "square") {
    const sideM =
      input.sizingMode === "dimensions"
        ? Math.max(MIN_DIMENSION_M, input.lengthM)
        : Math.sqrt(hectaresToM2(safeAreaHa));
    lengthM = sideM;
    widthM = sideM;
    areaM2 = sideM * sideM;
    localPoints = rectangleLocal(sideM, sideM, rotationDeg);
  } else if (input.shape === "regular-polygon") {
    areaM2 =
      input.sizingMode === "dimensions"
        ? Math.max(MIN_DIMENSION_M, input.lengthM) *
          Math.max(MIN_DIMENSION_M, input.widthM)
        : hectaresToM2(safeAreaHa);
    vertexCount = Math.min(
      MAX_VERTICES,
      Math.max(MIN_VERTICES, Math.round(input.vertexCount))
    );
    localPoints = regularPolygonLocal(areaM2, vertexCount, rotationDeg);
    const bbox = bboxDimensions(localPoints);
    lengthM = bbox.lengthM;
    widthM = bbox.widthM;
  } else {
    localPoints = rectangleLocal(lengthM, widthM, rotationDeg);
  }

  const polygon = localPoints.map((point) => toLngLat(point, anchor));
  const turfArea = polygonAreaFromLngLat(polygon)?.area_m2;
  const resolvedAreaM2 = turfArea ?? areaM2;

  return {
    polygon,
    center: input.center,
    shape: input.shape,
    sizingMode: input.sizingMode,
    areaHa: resolvedAreaM2 / 10_000,
    areaM2: resolvedAreaM2,
    lengthM,
    widthM,
    aspectRatio: safeRatio,
    vertexCount,
    rotationDeg,
  };
}

export function translateParametricTerrainPreview(
  preview: ParametricTerrainPreview,
  delta: LocalPoint
): ParametricTerrainPreview {
  const anchor: ProjectAnchor = {
    lng0: preview.center.lng,
    lat0: preview.center.lat,
  };
  const translatePoint = (point: LngLat) => {
    const local = toLocal(point, anchor);
    return toLngLat(
      {
        x_m: local.x_m + delta.x_m,
        y_m: local.y_m + delta.y_m,
      },
      anchor
    );
  };

  return {
    ...preview,
    center: translatePoint(preview.center),
    polygon: preview.polygon.map(translatePoint),
  };
}

export function rotateParametricTerrainPreview(
  preview: ParametricTerrainPreview,
  rotationDeg: number
): ParametricTerrainPreview {
  const nextRotationDeg = normalizeRotation(rotationDeg);
  const deltaDeg = nextRotationDeg - preview.rotationDeg;

  return {
    ...preview,
    polygon: preview.polygon.map((point) =>
      rotatePointAroundCenter(point, preview.center, deltaDeg)
    ),
    rotationDeg: nextRotationDeg,
  };
}
