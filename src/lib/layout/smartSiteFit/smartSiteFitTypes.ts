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
}

export interface SmartSiteFitOverrides {
  bessToBess_m?: number;
  bessToPcs_m?: number;
  boundaryMargin_m?: number;
  pcsToPcs_m?: number;
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
