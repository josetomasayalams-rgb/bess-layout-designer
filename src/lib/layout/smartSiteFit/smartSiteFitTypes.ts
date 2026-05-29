import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

export type SmartSiteFitMode = "target" | "terrain";

export type SmartSiteFitStrategy = "max_capacity" | "balanced" | "conservative";

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
}

export type SmartSiteFitShapeKind =
  | "single_row"
  | "two_row_block"
  | "compact_grid"
  | "wide_grid"
  | "deep_grid"
  | "multi_block"
  | "split_blocks";

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

export interface SmartSiteFitOverrides {
  bessToBess_m?: number;
  bessToPcs_m?: number;
  boundaryMargin_m?: number;
  pcsToPcs_m?: number;
  preferredShapeKind?: SmartSiteFitShapeKind | "auto";
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

