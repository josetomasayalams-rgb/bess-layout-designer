import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

export type SmartSiteFitMode = "target" | "terrain";

export type SmartSiteFitStrategy = "max_capacity" | "balanced" | "conservative";

/**
 * Physical/electrical architecture a preset models.
 *
 * - `bess_plus_pcs`: separate battery containers + separate PCS/MV stations
 *   sized by a BESS-per-PCS ratio (e.g. Sungrow ST2752UX + SC5000UD-MV).
 * - `integrated`: a single AC-coupled enclosure that bundles battery, inverter
 *   (PCS) and thermal management (e.g. Tesla Megapack 2 XL). There is no
 *   separate PCS and no BESS/PCS ratio. Connection to medium voltage requires
 *   an external step-up transformer that is NOT modeled here (requires review).
 */
export type SmartSiteFitArchitecture = "bess_plus_pcs" | "integrated";

export interface SmartSiteFitPreset {
  id: string;
  name: string;
  bessSpecId: string;
  pcsSpecId: string;
  bessPerPcs2h: number;
  bessPerPcs4h: number;
  defaultDurationHours: number;
  dataClassification: "certified_data" | "preliminary_assumption" | "pending_validation";
  notes: string;
  supportedDurations?: number[];
  ratioByDuration?: Record<number, number>;
  /**
   * For separate-PCS presets whose PCS integrates its own LV/MV transformer
   * (e.g. Sungrow SC5000UD-MV): an informational note explaining that no
   * separate transformer is created. The engine surfaces it as an info warning.
   * Omit when not applicable so other presets do not inherit a Sungrow-specific
   * message.
   */
  separatePcsTransformerNote?: string;
  /** Defaults to `bess_plus_pcs` when omitted (legacy Sungrow behavior). */
  architecture?: SmartSiteFitArchitecture;
  /**
   * For `integrated` presets: maps a design duration (h) to the catalog spec id
   * of the integrated unit configured for that duration. The integrated unit
   * carries both energy and power, so no separate PCS is created.
   */
  integratedUnitSpecByDuration?: Record<number, string>;
}

export type SmartSiteFitShapeKind =
  | "single_row"
  | "two_row_block"
  | "compact_grid"
  | "wide_grid"
  | "deep_grid"
  | "multi_block"
  | "split_blocks"
  // Market-representative families (R5-C). `spine_ribs` is the classic
  // utility-scale "fishbone": a central access road (spine) with PCS on the
  // centerline and BESS rows branching off as ribs. `perimeter_ring` hugs the
  // site boundary with an open central yard for a substation, pond or future
  // expansion.
  | "spine_ribs"
  | "perimeter_ring";

export interface SmartSiteFitShapeCandidate {
  id: string;
  kind: SmartSiteFitShapeKind;
  label: string;
  description: string;
  rows: number;
  columns: number;
  blocks: number;
  bessPerBlock: number;
  pcsPlacement: "end" | "side" | "centerline" | "distributed";
  targetAspectRatio?: number;
}

export type SmartSiteFitLayoutMode = "auto" | "manual";

export interface SmartSiteFitManualLayoutSpec {
  shapeKind?: SmartSiteFitShapeKind;
  containersWide?: number;
  containersLong?: number;
  rowsPerGroup?: number;
  groupCount?: number;
  groupSeparation_m?: number;
  rowSeparation_m?: number;
  orientationDeg?: number;
}

export interface SmartSiteFitOverrides {
  bessToBess_m?: number;
  bessToPcs_m?: number;
  boundaryMargin_m?: number;
  pcsToPcs_m?: number;
  preferredShapeKind?: SmartSiteFitShapeKind | "auto";
  // Capacity micro-adjustments applied after selecting an alternative.
  // When set, they pin the size of the recalculated layout instead of
  // letting the strategy derive it from the terrain.
  bessCount?: number;
  pcsCount?: number;
  durationHours?: number;
  orientationDeg?: number;
  // Approximate power/energy targets the user edits in the UI. The engine
  // still consumes bessCount/pcsCount; these are derived from them via
  // deriveEquipmentCountsFromPowerEnergy and kept for display/state.
  targetPowerMW?: number;
  targetEnergyMWh?: number;
  // Manual layout mode overrides
  layoutMode?: SmartSiteFitLayoutMode;
  manualShapeKind?: SmartSiteFitShapeKind;
  containersWide?: number;
  containersLong?: number;
  rowsPerGroup?: number;
  groupCount?: number;
  groupSeparation_m?: number;
  rowSeparation_m?: number;
}

export interface SmartSiteFitInput {
  mode: SmartSiteFitMode;
  polygon?: LngLat[];
  anchor?: ProjectAnchor;
  targetMW?: number;
  targetMWh?: number;
  durationHours?: number;
  strategy?: SmartSiteFitStrategy;
  overrides?: SmartSiteFitOverrides;
  /**
   * Selected BESS-system preset id (e.g. Sungrow vs Tesla). When omitted the
   * default Sungrow preset is used, so existing callers keep their behavior.
   */
  presetId?: string;
}

export interface SmartSiteFitScore {
  total: number;
  insidePolygon: number;
  noCollisions: number;
  boundaryMargin: number;
  siteUtilization: number;
  rowRegularity: number;
  corridorEfficiency: number;
  ratioCompliance: number;
  shapeCompactness?: number; // Compacidad de la forma del bloque
  siteUtilizationPct?: number; // Ocupación del terreno en % (huella equipo / área polígono)
  terrainFit?: number; // Coincidencia forma vs. relación ancho/largo del terreno
  pcsIntegration?: number; // Cercanía de cada PCS/MV a su clúster BESS
  capacityIntent?: number; // Ocupación acorde a la estrategia (max/balanced/conservative)
  layoutAesthetics?: number; // Orden geométrico, centrado y simetría razonable
}

export interface SmartSiteFitWarning {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface SmartSiteFitAssumption {
  id: string;
  description: string;
  value: string | number | boolean;
  classification: "certified_data" | "preliminary_assumption" | "pending_validation";
}

export interface SmartSiteFitCandidate {
  id: string;
  strategy: SmartSiteFitStrategy;
  placedEquipment: PlacedEquipment[];
  score: SmartSiteFitScore;
  warnings: SmartSiteFitWarning[];
  assumptions: SmartSiteFitAssumption[];
  shape?: {
    id: string;
    kind: SmartSiteFitShapeKind;
    label: string;
    description: string;
    rows: number;
    columns: number;
    blocks: number;
    pcsPlacement: string;
  };
}

export interface SmartSiteFitResult {
  success: boolean;
  candidates: SmartSiteFitCandidate[];
  selected: SmartSiteFitCandidate | null;
  warnings: SmartSiteFitWarning[];
  assumptions: SmartSiteFitAssumption[];
  fallbackUsed: boolean;
  message: string;
}

/**
 * Lightweight, render-ready schematic of an alternative's block layout. It is a
 * pure projection of `candidate.placedEquipment` into a normalized 2D frame so
 * the UI can draw a small SVG preview of the block ordering and separation
 * without resolving the catalog or the map. Coordinates live in a viewbox whose
 * longer axis is `viewSize` (see `buildSmartSiteFitPreview`); `y` grows downward
 * (SVG convention) with geographic north rendered upward.
 */
export interface SmartSiteFitPreviewBlock {
  /** Battery enclosure (also integrated all-in-one units) vs separate PCS/MV. */
  kind: "bess" | "pcs";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Source block grouping (PlacedEquipment.blockIndex) or aggregation bucket. */
  blockIndex: number;
}

export interface SmartSiteFitPreview {
  /** Normalized viewbox width (aspect-preserving). */
  width: number;
  /** Normalized viewbox height (aspect-preserving). */
  height: number;
  /** Site outline in the same normalized frame, when a polygon is supplied. */
  site?: { points: Array<{ x: number; y: number }> };
  blocks: SmartSiteFitPreviewBlock[];
  /** Number of equipment items represented (before any aggregation). */
  itemCount: number;
  /** True when blocks were spatially aggregated to keep the SVG light. */
  simplified: boolean;
}

