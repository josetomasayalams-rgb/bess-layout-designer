import type { Feature, Polygon } from "geojson";
import type { LngLat } from "@/types/geometry";
import type { ValidationIssue } from "@/types/bessLayoutTypes";

export type BessDataConfidence =
  | "confirmed"
  | "calculated"
  | "estimated"
  | "requires_validation";

export type BessContainerFormat = "20ft" | "40ft" | "custom" | "unknown";

export type BessModel = {
  id: string;
  manufacturer: string;
  product: string;
  energyMWh: number | null;
  powerMW: number | null;
  durationHours: number | null;
  lengthM: number;
  widthM: number;
  heightM: number;
  weightT: number | null;
  chemistry: string | null;
  areaM2: number;
  volumeM3: number;
  energyDensityMWhPerM2: number | null;
  energyDensityMWhPerM3: number | null;
  powerDensityMWPerM2: number | null;
  weightPerMWh: number | null;
  areaPerMWh: number | null;
  containerFormat: BessContainerFormat;
  coolingType: string | null;
  protectionClass: string | null;
  certifications: string[];
  dataConfidence: BessDataConfidence;
  source: string;
  notes: string;
  warnings: string[];
};

export type BessRawModel = Omit<
  BessModel,
  | "durationHours"
  | "areaM2"
  | "volumeM3"
  | "energyDensityMWhPerM2"
  | "energyDensityMWhPerM3"
  | "powerDensityMWPerM2"
  | "weightPerMWh"
  | "areaPerMWh"
  | "warnings"
> & {
  declaredDurationHours?: number | null;
  declaredAreaM2?: number | null;
  declaredVolumeM3?: number | null;
};

export type BessUnitInstance = {
  id: string;
  modelId: string;
  manufacturer: string;
  product: string;
  x: number;
  y: number;
  anchor: LngLat;
  rotationDeg: number;
  lengthM: number;
  widthM: number;
  heightM: number;
  geometry: Feature<Polygon>;
  energyMWh: number;
  powerMW: number | null;
  weightT: number | null;
  chemistry: string | null;
  areaM2: number;
  volumeM3: number;
  maintenanceBufferM: number;
  regulatoryBufferM: number;
  frontAccessBufferM: number | null;
  status: "ok" | "warning" | "critical";
  validationIssues: ValidationIssue[];
};

export type BessParkSummary = {
  containerCount: number;
  energyTotalMWh: number;
  powerTotalMW: number;
  durationEquivalentHours: number | null;
  totalWeightT: number;
  footprintAreaM2: number;
  regulatoryAreaM2: number;
  maintenanceAreaM2: number;
  layoutEnergyDensityMWhPerHa: number | null;
  layoutPowerDensityMWPerHa: number | null;
  byManufacturer: Record<string, number>;
  byModel: Record<string, number>;
  predominantChemistry: string | null;
  topEnergyModel: string | null;
  topPowerModel: string | null;
  weightPerMWhProject: number | null;
  areaPerMWhProject: number | null;
  hasUnknownPower: boolean;
  hasUnknownWeight: boolean;
  warnings: string[];
};

export type BessArrayInput = {
  modelId: string;
  quantity: number;
  rows: number;
  columns: number;
  separationM: number;
  orientationDeg: number;
  startPoint: LngLat;
  rowSpacingM?: number;
  columnSpacingM?: number;
};

