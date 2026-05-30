import { nanoid } from "nanoid";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import type {
  SmartSiteFitCandidate,
  SmartSiteFitPreset,
  SmartSiteFitShapeKind,
  SmartSiteFitStrategy,
  SmartSiteFitWarning,
  SmartSiteFitAssumption,
  SmartSiteFitOverrides,
} from "./smartSiteFitTypes";
import { resolveIntegratedUnitSpecId } from "./smartSiteFitPresets";
import { toLngLat } from "@/lib/geometry/projection";
import { analyzePolygon } from "./smartSiteFitGeometry";

const specById = new Map(equipmentCatalog.map((s) => [s.id, s]));

interface IntegratedGridShape {
  kind: SmartSiteFitShapeKind;
  label: string;
  description: string;
  columns: number;
  rows: number;
}

interface IntegratedPlacement {
  rotationDeg: number;
  cos: number;
  sin: number;
  dx: number;
  dy: number;
}

const EMPTY_SCORE = {
  total: 0,
  insidePolygon: 0,
  noCollisions: 0,
  boundaryMargin: 0,
  siteUtilization: 0,
  rowRegularity: 0,
  corridorEfficiency: 0,
  ratioCompliance: 0,
  shapeCompactness: 0,
};

/**
 * Candidate generation for an integrated-architecture preset (e.g. Tesla
 * Megapack 2 XL). Each placed item is a whole integrated unit that carries both
 * energy and power — there is no separate PCS/MV station and no BESS/PCS ratio,
 * so the layout is a single grid of identical units. No fictitious PCS or
 * step-up transformer is created here; the external MV transformer is surfaced
 * as a preliminary warning instead.
 *
 * The generator builds a handful of grid shapes (near-square / wide / deep /
 * single-row) at a few rotations and shifts, then returns unranked candidates
 * for the type-based scorer to evaluate.
 */
export function generateIntegratedCandidates(
  polygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  strategy: SmartSiteFitStrategy,
  preset: SmartSiteFitPreset,
  overrides?: SmartSiteFitOverrides,
  targetMW?: number,
  targetMWh?: number,
  maxCandidates: number = 60,
  deadlineAt?: number
): SmartSiteFitCandidate[] {
  if (polygon.length < 3) return [];

  const unitSpecId = resolveIntegratedUnitSpecId(preset, durationHours);
  const unitSpec = specById.get(unitSpecId);
  const unitL = unitSpec?.footprint.length_m ?? 8.8;
  const unitW = unitSpec?.footprint.width_m ?? 1.65;
  const unitEnergyMWh = unitSpec?.electrical?.energy_mwh_dc_bol ?? 3.916;
  const unitPowerMW = unitSpec?.electrical?.apparent_power_mva ?? 0.979;

  const analysis = analyzePolygon(polygon);
  const centroid = analysis.centroid;
  const dominantAngle = analysis.orientationDeg;

  // Strategy-based unit-to-unit spacing (overridable).
  let spacing = 3.0;
  if (strategy === "max_capacity") spacing = 2.5;
  else if (strategy === "conservative") spacing = 4.0;
  if (overrides?.bessToBess_m !== undefined) spacing = overrides.bessToBess_m;

  const cellL = unitL + spacing; // along a row (x)
  const cellW = unitW + spacing; // between rows (y)

  // --- Determine target unit count ---
  const isTargetMode = targetMW !== undefined || targetMWh !== undefined;
  // For integrated systems a forced size pins the number of units directly.
  const forcedUnits =
    overrides?.bessCount !== undefined && overrides.bessCount > 0
      ? Math.max(1, Math.floor(overrides.bessCount))
      : undefined;

  let targetUnits: number;
  if (forcedUnits !== undefined) {
    targetUnits = forcedUnits;
  } else if (isTargetMode) {
    const unitsFromPower = targetMW ? Math.ceil(targetMW / unitPowerMW) : 0;
    const unitsFromEnergy = targetMWh ? Math.ceil(targetMWh / unitEnergyMWh) : 0;
    targetUnits = Math.max(1, unitsFromPower, unitsFromEnergy);
  } else {
    // Terrain mode: derive from area with a per-strategy occupancy intent so the
    // three strategies yield genuinely distinct sizes.
    const unitArea = cellL * cellW;
    const maxUnits = Math.max(1, Math.floor(analysis.area_m2 / unitArea));
    const intentByStrategy: Record<SmartSiteFitStrategy, number> = {
      max_capacity: 0.9,
      balanced: 0.62,
      conservative: 0.42,
    };
    targetUnits = Math.max(1, Math.min(4000, Math.floor(maxUnits * intentByStrategy[strategy])));
  }

  // --- Grid shapes: column counts derived from a near-square footprint goal ---
  // cols*cellL ≈ rows*cellW with rows = ceil(N/cols) → cols ≈ sqrt(N*cellW/cellL).
  const squareCols = Math.max(1, Math.round(Math.sqrt((targetUnits * cellW) / cellL)));
  const colVariants = new Set<number>();
  const pushCols = (c: number) => {
    const v = Math.max(1, Math.min(targetUnits, Math.round(c)));
    colVariants.add(v);
  };

  // Honor an explicit layout-shape preference when it is one the integrated grid
  // can actually express; "auto" / unsupported kinds fall back to the diverse
  // default set so the scorer still gets variety to choose from.
  const preferredKind = overrides?.preferredShapeKind;
  const integratedSupportsKind =
    preferredKind === "single_row" ||
    preferredKind === "compact_grid" ||
    preferredKind === "wide_grid" ||
    preferredKind === "deep_grid";
  if (integratedSupportsKind) {
    if (preferredKind === "single_row") pushCols(targetUnits);
    else if (preferredKind === "wide_grid") pushCols(squareCols * 1.6);
    else if (preferredKind === "deep_grid") pushCols(squareCols * 0.6);
    else pushCols(squareCols); // compact_grid
  } else {
    pushCols(squareCols);
    pushCols(squareCols * 1.6); // wider
    pushCols(squareCols * 0.6); // deeper
    if (targetUnits <= 8) pushCols(targetUnits); // single row option for small sizes
  }

  const shapes: IntegratedGridShape[] = [];
  for (const columns of colVariants) {
    const rows = Math.max(1, Math.ceil(targetUnits / columns));
    let kind: SmartSiteFitShapeKind = "compact_grid";
    let label = "Cuadrícula compacta";
    let description = "Unidades integradas en cuadrícula aproximadamente cuadrada.";
    if (rows === 1) {
      kind = "single_row";
      label = "Fila única";
      description = "Unidades integradas en una sola fila.";
    } else if (columns >= rows * 1.5) {
      kind = "wide_grid";
      label = "Cuadrícula ancha";
      description = "Unidades integradas en cuadrícula más ancha que profunda.";
    } else if (rows >= columns * 1.5) {
      kind = "deep_grid";
      label = "Cuadrícula profunda";
      description = "Unidades integradas en cuadrícula más profunda que ancha.";
    }
    shapes.push({ kind, label, description, columns, rows });
  }

  // --- Placements: rotations × shifts ---
  const orientationOverride = overrides?.orientationDeg;
  const rotationDegs =
    orientationOverride !== undefined
      ? [orientationOverride]
      : [dominantAngle, dominantAngle + 90, 0, 90];
  const shifts = [0, cellL / 2, -cellL / 2];
  const placements: IntegratedPlacement[] = [];
  for (const rotationDeg of rotationDegs) {
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (const dx of shifts) {
      for (const dy of shifts) {
        placements.push({ rotationDeg, cos, sin, dx, dy });
      }
    }
  }
  // Natural placement first (first rotation, no shift), cheaper shifts before larger.
  placements.sort((a, b) => {
    const ra = rotationDegs.indexOf(a.rotationDeg);
    const rb = rotationDegs.indexOf(b.rotationDeg);
    if (ra !== rb) return ra - rb;
    return Math.abs(a.dx) + Math.abs(a.dy) - (Math.abs(b.dx) + Math.abs(b.dy));
  });

  const warnings: SmartSiteFitWarning[] = [
    {
      id: "integrated-external-transformer",
      severity: "info",
      message:
        "Bloque AC integrado: salida en baja tensión. La conexión a media tensión requiere un transformador elevador externo no incluido (requiere revisión técnica).",
    },
    {
      id: "integrated-no-separate-pcs",
      severity: "info",
      message:
        "Arquitectura integrada: cada unidad incluye su propio inversor/PCS; no se crea PCS/MV separado ni se aplica relación BESS/PCS.",
    },
  ];

  const assumptions: SmartSiteFitAssumption[] = [
    {
      id: "integrated-unit-model",
      description: "Modelo de unidad integrada utilizada",
      value: unitSpecId,
      classification: "preliminary_assumption",
    },
    {
      id: "integrated-architecture",
      description: "Arquitectura del sistema BESS",
      value: "integrada (batería + inversor en un solo bloque)",
      classification: "preliminary_assumption",
    },
  ];

  // --- Expand: interleave placements across shapes (diversity first) ---
  const expandLimit = Math.max(1, Math.min(maxCandidates, shapes.length * placements.length));
  const candidates: SmartSiteFitCandidate[] = [];
  let deadlineHit = false;

  outer: for (let p = 0; p < placements.length; p++) {
    for (let s = 0; s < shapes.length; s++) {
      if (candidates.length >= expandLimit) break outer;
      if (
        deadlineAt !== undefined &&
        candidates.length >= 1 &&
        Date.now() > deadlineAt
      ) {
        deadlineHit = true;
        break outer;
      }

      const shape = shapes[s];
      const placement = placements[p];
      const placedEquipment = buildUnitGrid(
        shape,
        targetUnits,
        cellL,
        cellW,
        centroid,
        placement,
        unitSpecId,
        anchor
      );
      if (placedEquipment.length === 0) continue;

      candidates.push({
        id: nanoid(8),
        strategy,
        placedEquipment,
        score: { ...EMPTY_SCORE },
        warnings,
        assumptions,
        shape: {
          id: nanoid(6),
          kind: shape.kind,
          label: shape.label,
          description: shape.description,
          rows: shape.rows,
          columns: shape.columns,
          blocks: 1,
          pcsPlacement: "distributed",
        },
      });
    }
  }

  if (deadlineHit) {
    const budgetWarning: SmartSiteFitWarning = {
      id: "performance_budget_reached",
      severity: "info",
      message:
        "Se alcanzó el presupuesto de cómputo; se muestra el mejor resultado preliminar encontrado.",
    };
    for (const c of candidates) {
      c.warnings = [...warnings, budgetWarning];
    }
  }

  return candidates;
}

/**
 * Build a centered grid of integrated units. Units are laid out row-major,
 * centered on the polygon centroid, then rotated by the placement angle. A
 * partial final row is centered on its own width so the block stays symmetric.
 */
function buildUnitGrid(
  shape: IntegratedGridShape,
  totalUnits: number,
  cellL: number,
  cellW: number,
  centroid: LocalPoint,
  placement: IntegratedPlacement,
  unitSpecId: string,
  anchor: ProjectAnchor
): PlacedEquipment[] {
  const { columns, rows } = shape;
  const { cos, sin, dx, dy, rotationDeg } = placement;
  const startCenterX = centroid.x_m + dx;
  const startCenterY = centroid.y_m + dy;

  const gridWidth = columns * cellL;
  const gridHeight = rows * cellW;
  const x0 = -gridWidth / 2 + cellL / 2;
  const y0 = -gridHeight / 2 + cellW / 2;

  const placed: PlacedEquipment[] = [];
  let count = 0;
  for (let r = 0; r < rows && count < totalUnits; r++) {
    const unitsThisRow = Math.min(columns, totalUnits - count);
    // Center a partial final row.
    const rowOffset = ((columns - unitsThisRow) * cellL) / 2;
    for (let c = 0; c < unitsThisRow; c++) {
      const localX = x0 + rowOffset + c * cellL;
      const localY = y0 + r * cellW;
      const rx = startCenterX + localX * cos - localY * sin;
      const ry = startCenterY + localX * sin + localY * cos;
      const lngLat = toLngLat({ x_m: rx, y_m: ry }, anchor);
      placed.push({
        id: nanoid(8),
        equipmentSpecId: unitSpecId,
        anchor: lngLat,
        rotation_deg: rotationDeg,
        groupId: `integrated-row-${r}`,
        blockId: `integrated-row-${r}`,
        blockIndex: r,
        classification: "preliminary_assumption",
        sourceReliability: "preliminary_assumption",
      });
      count++;
    }
  }
  return placed;
}
