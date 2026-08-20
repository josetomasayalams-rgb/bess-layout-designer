import { nanoid } from "nanoid";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import {
  STATION_GAP_M,
  BLOCK_GAP_X_M,
  BLOCK_GAP_Y_M,
} from "@/data/defaultConstraints";
import { BESS_BLOCK_TEMPLATES } from "./blockTemplates";
import { allCornersInsidePolygon } from "@/lib/geometry/collision";
import {
  distanceBetweenRectangles,
  distanceRectToPolygonBoundary,
} from "@/lib/geometry/distance";
import { toLocal, toLngLat } from "@/lib/geometry/projection";
import { rectCorners } from "@/lib/geometry/rectangles";
import type { RegulatoryRuleSet } from "@/types/bessLayoutTypes";
import type { PlacedEquipment } from "@/types/equipment";
import type { SourceReliability } from "@/data/equipmentCatalog";
import type {
  LngLat,
  LocalPoint,
  ProjectAnchor,
  RotatedRectLocal,
} from "@/types/geometry";

export const PRELIMINARY_TOOL_GROUP_PREFIX = "preliminary-tools:";

export type GridShapeOption = {
  columns: number;
  rows: number;
  cells: number;
  emptyCells: number;
  shape: "square" | "rectangle";
};

export type PreliminaryLayoutRequest = {
  batteryContainerSpecId: string;
  pcsSpecId: string;
  batteryContainerCount: number;
  pcsCount: number;
  containersPerPcs: number;
  blockColumns?: number;
  anchor: ProjectAnchor;
  startPoint: LngLat;
  polygon?: LngLat[];
  rules: Pick<
    RegulatoryRuleSet,
    | "bessToBess_m"
    | "bessToPropertyLine_m"
    | "electricalFrontWorkingClearance_m"
    | "transformerToBessRecommended_m"
  >;
  fitInsidePolygon: boolean;
  templateId?: string;
};

export type PreliminaryLayoutResult = {
  status: "success" | "error";
  message: string;
  placed: PlacedEquipment[];
  diagnostics: {
    batteryContainerCount: number;
    pcsCount: number;
    blockCount: number;
    containersPerPcs: number;
    spacingM: number;
    boundarySetbackM: number;
    layoutAreaM2: number | null;
    candidateCount: number;
    gridColumns?: number;
    gridRows?: number;
    orientationDeg?: number;
    terrainFitApplied?: boolean;
    arrangementAdjusted?: boolean;
    templateId?: string;
    classification?: SourceReliability;
    warnings?: string[];
  };
};

type RelativeItem = {
  equipmentSpecId: string;
  type: "battery_container" | "pcs";
  center: LocalPoint;
  rect: RotatedRectLocal;
  groupId: string;
  blockId?: string;
  blockIndex?: number;
  templateId?: string;
  classification?: SourceReliability;
};

type RelativeLayout = {
  items: RelativeItem[];
  blockCount: number;
  blockColumns: number;
  blockRows: number;
  orientationDeg: number;
  areaM2: number;
};

function clampCount(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

/**
 * Candidate rectangular/square grids for arranging `blockCount` PCS blocks.
 * One option per distinct row count: the minimum number of columns that still
 * fits every block (redundant wider grids are skipped). Sorted from tall (few
 * columns) to wide (many columns), so callers can offer the full set of shapes.
 */
export function gridShapeOptions(blockCount: number): GridShapeOption[] {
  const count = Math.max(0, Math.floor(blockCount));
  if (count <= 0) return [];
  const options: GridShapeOption[] = [];
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    // Skip columns that do not reduce the row count (redundant grid shape).
    if (columns > 1 && (columns - 1) * rows >= count) continue;
    options.push({
      columns,
      rows,
      cells: columns * rows,
      emptyCells: columns * rows - count,
      shape: columns === rows ? "square" : "rectangle",
    });
  }
  return options;
}

/** Squarest grid: the default block-column count when none is chosen. */
export function defaultBlockColumns(blockCount: number): number {
  if (blockCount <= 1) return 1;
  return Math.max(1, Math.round(Math.sqrt(blockCount)));
}

function bboxOfRects(rects: RotatedRectLocal[]) {
  const corners = rects.flatMap(rectCorners);
  return {
    minX: Math.min(...corners.map((corner) => corner.x_m)),
    maxX: Math.max(...corners.map((corner) => corner.x_m)),
    minY: Math.min(...corners.map((corner) => corner.y_m)),
    maxY: Math.max(...corners.map((corner) => corner.y_m)),
  };
}

function bboxOfPolygon(polygon: LocalPoint[]) {
  return {
    minX: Math.min(...polygon.map((point) => point.x_m)),
    maxX: Math.max(...polygon.map((point) => point.x_m)),
    minY: Math.min(...polygon.map((point) => point.y_m)),
    maxY: Math.max(...polygon.map((point) => point.y_m)),
  };
}

function translatePoint(point: LocalPoint, dx: number, dy: number): LocalPoint {
  return { x_m: point.x_m + dx, y_m: point.y_m + dy };
}

function translateRect(rect: RotatedRectLocal, dx: number, dy: number): RotatedRectLocal {
  return {
    ...rect,
    center: translatePoint(rect.center, dx, dy),
  };
}

function rotatePoint(xM: number, yM: number, orientationDeg: number): LocalPoint {
  const radians = (orientationDeg * Math.PI) / 180;
  return {
    x_m: xM * Math.cos(radians) - yM * Math.sin(radians),
    y_m: xM * Math.sin(radians) + yM * Math.cos(radians),
  };
}

function sampleBetween(min: number, max: number): number[] {
  if (min > max) return [];
  if (Math.abs(max - min) < 1e-6) return [min];
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => min + (max - min) * fraction);
}

function centroid(points: LocalPoint[]): LocalPoint {
  if (points.length === 0) return { x_m: 0, y_m: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x_m: acc.x_m + p.x_m, y_m: acc.y_m + p.y_m }),
    { x_m: 0, y_m: 0 }
  );
  return { x_m: sum.x_m / points.length, y_m: sum.y_m / points.length };
}

/** Area-weighted polygon centroid in the local ENU coordinate system. */
function polygonCentroid(points: LocalPoint[]): LocalPoint {
  if (points.length < 3) return centroid(points);

  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x_m * next.y_m - next.x_m * current.y_m;
    twiceArea += cross;
    x += (current.x_m + next.x_m) * cross;
    y += (current.y_m + next.y_m) * cross;
  }

  if (Math.abs(twiceArea) < 1e-6) return centroid(points);
  return {
    x_m: x / (3 * twiceArea),
    y_m: y / (3 * twiceArea),
  };
}

/**
 * Score a candidate placement: lower is better.
 * Prioritizes proximity of layout centroid to polygon centroid,
 * then terrain/layout aspect match and a small area tiebreaker.
 */
function candidatePlacementScore(
  shiftedItems: RelativeItem[],
  polygonCentroid: LocalPoint,
  areaM2: number,
  layoutBBox: ReturnType<typeof bboxOfRects>,
  polygonBBox: ReturnType<typeof bboxOfPolygon>
): number {
  const layoutCentroid = centroid(shiftedItems.map((item) => item.center));
  const distToCenter = Math.hypot(
    layoutCentroid.x_m - polygonCentroid.x_m,
    layoutCentroid.y_m - polygonCentroid.y_m
  );
  const layoutWidth = Math.max(1, layoutBBox.maxX - layoutBBox.minX);
  const layoutHeight = Math.max(1, layoutBBox.maxY - layoutBBox.minY);
  const polygonWidth = Math.max(1, polygonBBox.maxX - polygonBBox.minX);
  const polygonHeight = Math.max(1, polygonBBox.maxY - polygonBBox.minY);
  const aspectMismatch = Math.abs(
    Math.log((layoutWidth / layoutHeight) / (polygonWidth / polygonHeight))
  );
  const terrainScale = Math.max(1, Math.min(polygonWidth, polygonHeight));

  // Center first, then prefer the grid shape that uses the terrain's aspect
  // ratio. This only influences fallback candidates; the requested shape is
  // still honoured whenever it fits.
  return distToCenter + aspectMismatch * terrainScale * 0.08 + areaM2 * 1e-5;
}

function validateCandidate(args: {
  items: RelativeItem[];
  polygon: LocalPoint[];
  rules: PreliminaryLayoutRequest["rules"];
}): boolean {
  const { items, polygon, rules } = args;

  for (const item of items) {
    if (!allCornersInsidePolygon(item.rect, polygon)) return false;
    if (distanceRectToPolygonBoundary(item.rect, polygon) < rules.bessToPropertyLine_m) {
      return false;
    }
  }

  return true;
}

/**
 * Equipment-to-equipment spacing is invariant under translation. Validate it
 * once per grid/orientation rather than once per candidate position.
 */
function validateEquipmentSpacing(
  items: RelativeItem[],
  rules: PreliminaryLayoutRequest["rules"]
): boolean {
  const bounds = items.map((item) => {
    const corners = rectCorners(item.rect);
    return {
      minX: Math.min(...corners.map((corner) => corner.x_m)),
      maxX: Math.max(...corners.map((corner) => corner.x_m)),
      minY: Math.min(...corners.map((corner) => corner.y_m)),
      maxY: Math.max(...corners.map((corner) => corner.y_m)),
    };
  });

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const requiredDistance =
        items[i].type === "battery_container" &&
        items[j].type === "battery_container"
          ? rules.bessToBess_m
          : rules.electricalFrontWorkingClearance_m;
      const xGap = Math.max(
        0,
        bounds[i].minX - bounds[j].maxX,
        bounds[j].minX - bounds[i].maxX
      );
      const yGap = Math.max(
        0,
        bounds[i].minY - bounds[j].maxY,
        bounds[j].minY - bounds[i].maxY
      );

      // AABB broad-phase: if either axis is already farther apart than the
      // required clearance, the exact rectangle distance cannot violate it.
      if (xGap >= requiredDistance || yGap >= requiredDistance) continue;

      const distance = distanceBetweenRectangles(items[i].rect, items[j].rect);
      if (distance <= 0) return false;
      if (
        items[i].type === "battery_container" &&
        items[j].type === "battery_container" &&
        distance + 1e-6 < rules.bessToBess_m
      ) {
        return false;
      }
      if (
        (items[i].type === "pcs" || items[j].type === "pcs") &&
        distance + 1e-6 < rules.electricalFrontWorkingClearance_m
      ) {
        return false;
      }
    }
  }

  return true;
}

function buildRelativeLayout(args: {
  batteryContainerSpecId: string;
  pcsSpecId: string;
  batteryContainerCount: number;
  pcsCount: number;
  containersPerPcs: number;
  blockColumns: number;
  orientationDeg: number;
  rules: PreliminaryLayoutRequest["rules"];
  templateId?: string;
}): RelativeLayout | null {
  const bessSpec = equipmentCatalog.find((spec) => spec.id === args.batteryContainerSpecId);
  const pcsSpec = equipmentCatalog.find((spec) => spec.id === args.pcsSpecId);
  if (!bessSpec || !pcsSpec) return null;

  const batteryContainerCount = clampCount(args.batteryContainerCount, 0);
  const pcsCount = clampCount(args.pcsCount, 0);

  const template = args.templateId ? BESS_BLOCK_TEMPLATES[args.templateId] : undefined;

  let blockCount = 0;
  const items: RelativeItem[] = [];

  if (template) {
    const templateContainers = template.ratio.containers;
    blockCount = Math.max(pcsCount, Math.ceil(batteryContainerCount / templateContainers));
    if (blockCount === 0) return null;

    const blockGapXM = template.spacing.blockGapXM;
    const blockGapYM = template.spacing.blockGapYM;

    const blockWidth = template.widthM;
    const blockHeight = template.heightM;

    const blockPitchXM = blockWidth + blockGapXM;
    const blockPitchYM = blockHeight + blockGapYM;

    const blockColumns = Math.max(1, Math.min(args.blockColumns, blockCount));
    let remainingBess = batteryContainerCount;

    for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
      const blockColumn = blockIndex % blockColumns;
      const blockRow = Math.floor(blockIndex / blockColumns);
      const blockOriginXM = blockColumn * blockPitchXM;
      const blockOriginYM = blockRow * blockPitchYM;
      const blockBessCount = Math.min(templateContainers, remainingBess);
      const groupId = `${PRELIMINARY_TOOL_GROUP_PREFIX}block-${String(blockIndex + 1).padStart(2, "0")}`;

      // Place BESS containers up to blockBessCount
      let placedBess = 0;
      for (const item of template.items) {
        if (item.role === "battery_container") {
          if (placedBess >= blockBessCount) {
            continue;
          }
          placedBess++;

          const rotated = rotatePoint(
            blockOriginXM + item.center.x_m,
            blockOriginYM + item.center.y_m,
            args.orientationDeg
          );
          const rect = {
            center: rotated,
            length_m: item.footprint.length_m,
            width_m: item.footprint.width_m,
            rotation_deg: (args.orientationDeg + item.rotation_deg) % 360,
          };
          items.push({
            equipmentSpecId: bessSpec.id,
            type: "battery_container",
            center: rotated,
            rect,
            groupId,
            blockId: groupId,
            blockIndex,
            templateId: template.id,
            classification: template.ratio.classification,
          });
        }
      }
      remainingBess -= blockBessCount;

      // Place PCS if blockIndex < pcsCount
      if (blockIndex < pcsCount) {
        for (const item of template.items) {
          if (item.role === "conversion_station") {
            const rotated = rotatePoint(
              blockOriginXM + item.center.x_m,
              blockOriginYM + item.center.y_m,
              args.orientationDeg
            );
            const rect = {
              center: rotated,
              length_m: item.footprint.length_m,
              width_m: item.footprint.width_m,
              rotation_deg: (args.orientationDeg + item.rotation_deg) % 360,
            };
            items.push({
              equipmentSpecId: pcsSpec.id,
              type: "pcs",
              center: rotated,
              rect,
              groupId,
              blockId: groupId,
              blockIndex,
              templateId: template.id,
              classification: template.ratio.classification,
            });
          }
        }
      }
    }
  } else {
    // FALLBACK MANUAL MATHEMATICAL GRID BUILDER
    const containersPerPcs = Math.max(1, clampCount(args.containersPerPcs, 1));
    blockCount = Math.max(pcsCount, Math.ceil(batteryContainerCount / containersPerPcs));
    if (blockCount === 0) return null;

    const bessColumns = Math.min(4, containersPerPcs);
    const bessRows = Math.max(1, Math.ceil(containersPerPcs / bessColumns));
    const bessSpacingM = args.rules.bessToBess_m;
    const stationGapM = Math.max(
      STATION_GAP_M,
      args.rules.electricalFrontWorkingClearance_m,
      args.rules.transformerToBessRecommended_m
    );
    const blockGapXM = Math.max(BLOCK_GAP_X_M, bessSpacingM * 2);
    const blockGapYM = Math.max(BLOCK_GAP_Y_M, bessSpacingM * 2);
    const matrixLengthM =
      bessColumns * bessSpec.footprint.length_m + (bessColumns - 1) * bessSpacingM;
    const matrixWidthM =
      bessRows * bessSpec.footprint.width_m + (bessRows - 1) * bessSpacingM;
    const stationCenterXM =
      matrixLengthM - bessSpec.footprint.length_m / 2 + stationGapM + pcsSpec.footprint.length_m / 2;
    const stationCenterYM = matrixWidthM / 2 - bessSpec.footprint.width_m / 2;
    const blockPitchXM =
      stationCenterXM + pcsSpec.footprint.length_m / 2 + bessSpec.footprint.length_m / 2 + blockGapXM;
    const blockPitchYM = Math.max(matrixWidthM, pcsSpec.footprint.width_m) + blockGapYM;
    const blockColumns = Math.max(1, Math.min(args.blockColumns, blockCount));
    let remainingBess = batteryContainerCount;

    for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
      const blockColumn = blockIndex % blockColumns;
      const blockRow = Math.floor(blockIndex / blockColumns);
      const blockOriginXM = blockColumn * blockPitchXM;
      const blockOriginYM = blockRow * blockPitchYM;
      const blockBessCount = Math.min(containersPerPcs, remainingBess);
      const groupId = `${PRELIMINARY_TOOL_GROUP_PREFIX}block-${String(blockIndex + 1).padStart(2, "0")}`;

      for (let index = 0; index < blockBessCount; index++) {
        const row = Math.floor(index / bessColumns);
        const column = index % bessColumns;
        const rotated = rotatePoint(
          blockOriginXM + column * (bessSpec.footprint.length_m + bessSpacingM),
          blockOriginYM + row * (bessSpec.footprint.width_m + bessSpacingM),
          args.orientationDeg
        );
        const rect = {
          center: rotated,
          length_m: bessSpec.footprint.length_m,
          width_m: bessSpec.footprint.width_m,
          rotation_deg: args.orientationDeg,
        };
        items.push({
          equipmentSpecId: bessSpec.id,
          type: "battery_container",
          center: rotated,
          rect,
          groupId,
          blockId: groupId,
          blockIndex,
        });
      }

      remainingBess -= blockBessCount;

      if (blockIndex < pcsCount) {
        const rotated = rotatePoint(
          blockOriginXM + stationCenterXM,
          blockOriginYM + stationCenterYM,
          args.orientationDeg
        );
        const rect = {
          center: rotated,
          length_m: pcsSpec.footprint.length_m,
          width_m: pcsSpec.footprint.width_m,
          rotation_deg: args.orientationDeg,
        };
        items.push({
          equipmentSpecId: pcsSpec.id,
          type: "pcs",
          center: rotated,
          rect,
          groupId,
          blockId: groupId,
          blockIndex,
        });
      }
    }
  }

  const bbox = bboxOfRects(items.map((item) => item.rect));

  return {
    items,
    blockCount,
    blockColumns: Math.max(1, Math.min(args.blockColumns, blockCount)),
    blockRows: Math.ceil(
      blockCount / Math.max(1, Math.min(args.blockColumns, blockCount))
    ),
    orientationDeg: args.orientationDeg,
    areaM2: (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY),
  };
}

function toPlacedEquipment(
  items: RelativeItem[],
  anchor: ProjectAnchor,
  dx: number,
  dy: number
): PlacedEquipment[] {
  return items.map((item) => {
    const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
    const center = translatePoint(item.center, dx, dy);
    return {
      id: nanoid(8),
      equipmentSpecId: item.equipmentSpecId,
      anchor: toLngLat(center, anchor),
      rotation_deg: item.rect.rotation_deg,
      groupId: item.groupId,
      sourceReliability: spec?.source.reliability ?? "pending_validation",
      blockId: item.blockId,
      blockIndex: item.blockIndex,
      templateId: item.templateId,
      classification: item.classification,
    };
  });
}

export function generatePreliminaryLayout(
  request: PreliminaryLayoutRequest
): PreliminaryLayoutResult {
  const batteryContainerCount = clampCount(request.batteryContainerCount, 0);
  const pcsCount = clampCount(request.pcsCount, 0);
  const containersPerPcs = Math.max(1, clampCount(request.containersPerPcs, 1));

  const template = request.templateId ? BESS_BLOCK_TEMPLATES[request.templateId] : undefined;
  const effectiveContainersPerPcs = template ? template.ratio.containers : containersPerPcs;
  const blockCount = Math.max(pcsCount, Math.ceil(batteryContainerCount / effectiveContainersPerPcs));
  let candidateCount = 0;

  const warnings: string[] = [];
  if (template) {
    if (batteryContainerCount % template.ratio.containers !== 0) {
      warnings.push(
        `La cantidad de contenedores solicitada (${batteryContainerCount}) no es múltiplo de la cantidad del bloque (${template.ratio.containers}). Algunos bloques quedarán incompletos.`
      );
    }
    if (pcsCount < blockCount) {
      warnings.push(
        `La cantidad de PCS solicitada (${pcsCount}) es menor que el número de bloques requeridos (${blockCount}). Algunos bloques no tendrán PCS.`
      );
    }
    if (template.warnings) {
      warnings.push(...template.warnings);
    }
  }

  const baseDiagnostics = {
    batteryContainerCount,
    pcsCount,
    blockCount,
    containersPerPcs: effectiveContainersPerPcs,
    spacingM: template ? template.spacing.bessSpacingM : request.rules.bessToBess_m,
    boundarySetbackM: request.rules.bessToPropertyLine_m,
    layoutAreaM2: null as number | null,
    candidateCount,
    templateId: template?.id,
    classification: template?.ratio.classification,
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  if (batteryContainerCount === 0 && pcsCount === 0) {
    return {
      status: "error",
      message: "Enter at least one BESS container or PCS/MV center.",
      placed: [],
      diagnostics: baseDiagnostics,
    };
  }

  const startLocal = toLocal(request.startPoint, request.anchor);
  const candidateColumns = Array.from({ length: blockCount }, (_, index) => index + 1);
  const orientations = [0, 90];
  const preferredColumns =
    request.blockColumns != null && Number.isFinite(request.blockColumns)
      ? Math.min(
          Math.max(1, Math.floor(request.blockColumns)),
          Math.max(1, blockCount)
        )
      : defaultBlockColumns(blockCount);

  if (!request.fitInsidePolygon || !request.polygon || request.polygon.length < 3) {
    const freeLayout = buildRelativeLayout({
      ...request,
      batteryContainerCount,
      pcsCount,
      containersPerPcs,
      blockColumns: preferredColumns,
      orientationDeg: 0,
      templateId: request.templateId,
    });

    if (!freeLayout) {
      return {
        status: "error",
        message: "Could not generate a conceptual layout with the selected equipment.",
        placed: [],
        diagnostics: baseDiagnostics,
      };
    }

    const bbox = bboxOfRects(freeLayout.items.map((item) => item.rect));
    const dx = startLocal.x_m - bbox.minX - request.rules.bessToPropertyLine_m;
    const dy = startLocal.y_m - bbox.minY - request.rules.bessToPropertyLine_m;
    return {
      status: "success",
      message:
        "Conceptual layout inserted without polygon fitting. Draw a site and use regularization to enforce boundary setbacks.",
      placed: toPlacedEquipment(freeLayout.items, request.anchor, dx, dy),
      diagnostics: {
        ...baseDiagnostics,
        candidateCount: 1,
        layoutAreaM2: freeLayout.areaM2,
        gridColumns: freeLayout.blockColumns,
        gridRows: freeLayout.blockRows,
        orientationDeg: freeLayout.orientationDeg,
        terrainFitApplied: false,
        arrangementAdjusted: false,
      },
    };
  }

  const localPolygon = request.polygon.map((point) => toLocal(point, request.anchor));
  const polygonBBox = bboxOfPolygon(localPolygon);
  const polygonCentroidLocal = polygonCentroid(localPolygon);
  const setbackM = request.rules.bessToPropertyLine_m;

  const searchPlacement = (
    columnsList: number[],
    orientationDegList: number[]
  ): RelativeLayout | null => {
    let found: RelativeLayout | null = null;
    let foundScore = Infinity;
    for (const orientationDeg of orientationDegList) {
      for (const blockColumns of columnsList) {
        const layout = buildRelativeLayout({
          ...request,
          batteryContainerCount,
          pcsCount,
          containersPerPcs,
          blockColumns,
          orientationDeg,
          templateId: request.templateId,
        });
        if (!layout) continue;
        candidateCount += 1;
        if (!validateEquipmentSpacing(layout.items, request.rules)) continue;
        const layoutBBox = bboxOfRects(layout.items.map((item) => item.rect));
        const minDx = polygonBBox.minX + setbackM - layoutBBox.minX;
        const maxDx = polygonBBox.maxX - setbackM - layoutBBox.maxX;
        const minDy = polygonBBox.minY + setbackM - layoutBBox.minY;
        const maxDy = polygonBBox.maxY - setbackM - layoutBBox.maxY;

        // Compute centroid-targeting dx/dy from the equipment centers, so the
        // generated layout—not only its outer bounding box—is centered.
        const layoutCenter = centroid(layout.items.map((item) => item.center));
        const centroidDx = polygonCentroidLocal.x_m - layoutCenter.x_m;
        const centroidDy = polygonCentroidLocal.y_m - layoutCenter.y_m;

        const clamp = (v: number, lo: number, hi: number) =>
          Math.max(lo, Math.min(hi, v));

        // Build dx candidates: uniform samples + clamped centroid target.
        const baseDxSamples = sampleBetween(minDx, maxDx);
        const dxCandidates =
          minDx <= maxDx
            ? [
                ...baseDxSamples,
                clamp(centroidDx, minDx, maxDx),
              ].filter((v, i, arr) => arr.indexOf(v) === i)
            : baseDxSamples;

        const baseDySamples = sampleBetween(minDy, maxDy);
        const dyCandidates =
          minDy <= maxDy
            ? [
                ...baseDySamples,
                clamp(centroidDy, minDy, maxDy),
              ].filter((v, i, arr) => arr.indexOf(v) === i)
            : baseDySamples;

        for (const dx of dxCandidates) {
          for (const dy of dyCandidates) {
            const shifted = layout.items.map((item) => ({
              ...item,
              center: translatePoint(item.center, dx, dy),
              rect: translateRect(item.rect, dx, dy),
            }));
            if (
              validateCandidate({
                items: shifted,
                polygon: localPolygon,
                rules: request.rules,
              })
            ) {
              const score = candidatePlacementScore(
                shifted,
                polygonCentroidLocal,
                layout.areaM2,
                layoutBBox,
                polygonBBox
              );
              if (score < foundScore) {
                found = { ...layout, items: shifted };
                foundScore = score;
              }
            }
          }
        }
      }
    }
    return found;
  };

  // Honour the requested arrangement first; only fall back to a free search
  // over every grid shape if the requested one does not fit the terrain.
  let best = searchPlacement([preferredColumns], [0, 90]);
  let arrangementAdjusted =
    best !== null &&
    (best.blockColumns !== preferredColumns || best.orientationDeg !== 0);
  if (!best) {
    best = searchPlacement(candidateColumns, orientations);
    arrangementAdjusted =
      best !== null &&
      (best.blockColumns !== preferredColumns || best.orientationDeg !== 0);
  }

  if (!best) {
    return {
      status: "error",
      message:
        "No feasible arrangement was found inside the selected terrain with the active setbacks and spacing. Reduce quantities, change the arrangement or orientation, use a larger polygon, or review spacing assumptions.",
      placed: [],
      diagnostics: {
        ...baseDiagnostics,
        candidateCount,
      },
    };
  }

  return {
    status: "success",
    message: arrangementAdjusted
      ? "Layout generated and centered inside the site polygon. The requested grid or orientation did not fit, so the closest feasible arrangement was used."
      : "Layout generated and centered inside the site polygon using the requested grid and active preliminary spacing and setback rules.",
    placed: toPlacedEquipment(best.items, request.anchor, 0, 0),
    diagnostics: {
      ...baseDiagnostics,
      candidateCount,
      layoutAreaM2: best.areaM2,
      gridColumns: best.blockColumns,
      gridRows: best.blockRows,
      orientationDeg: best.orientationDeg,
      terrainFitApplied: true,
      arrangementAdjusted,
    },
  };
}
