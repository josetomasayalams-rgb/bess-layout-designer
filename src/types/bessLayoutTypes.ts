import type { LocalPoint, ProjectAnchor, RotatedRectLocal } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

export type RegulatoryProfileId =
  | "ifc-2024-nfpa-855-conservative"
  | "chile-sec-rgr-06-2024"
  | "custom";

export type RegulatoryBasis =
  | "normative"
  | "manufacturer_recommendation"
  | "conservative_criterion"
  | "user_defined"
  | "requires_validation";

export type Jurisdiction = "international" | "chile" | "custom";
export type BatteryChemistry = "lfp" | "nmc" | "sodium_ion" | "other";
export type InstallationType = "outdoor" | "indoor" | "cabinet" | "integrated_container";
export type DesignLevel = "predesign" | "basic_engineering" | "detailed_engineering";
export type FireSuppressionType =
  | "water_mist"
  | "clean_agent"
  | "aerosol"
  | "inert_gas"
  | "other"
  | "undefined";
export type VentilationType =
  | "natural"
  | "forced"
  | "hvac"
  | "liquid_cooling"
  | "undefined";
export type FireBarrierType = "none" | "rf60" | "rf120" | "two_hour" | "custom";

export type RegulatoryDesignContext = {
  jurisdiction: Jurisdiction;
  batteryChemistry: BatteryChemistry;
  installationType: InstallationType;
  designLevel: DesignLevel;
  hasUl9540a: boolean;
  hasHma: boolean;
  hasLsft: boolean;
  hasAhjApproval: boolean;
  hasManufacturerManual: boolean;
  fireSuppression: FireSuppressionType;
  ventilation: VentilationType;
  fireBarrier: FireBarrierType;
};

export type RegulatoryRuleSet = {
  bessToBess_m: number;
  bessToBuilding_m: number;
  bessToPropertyLine_m: number;
  bessToPublicWay_m: number;
  bessToCombustibleMaterial_m: number;
  bessToEscapeRoute_m: number;
  combustibleVegetationClearance_m: number;
  maintenanceAisle_m: number;
  electricalFrontWorkingClearance_m: number;
  internalBatteryGroupSeparation_m: number;
  maxEnergyPerGroup_kwh: number;
  fireAreaReferenceLimit_kwh: number;
  transformerToBessMinimum_m: number;
  transformerToBessRecommended_m: number;
};

export type RegulatoryProfile = {
  id: RegulatoryProfileId;
  name: string;
  jurisdiction: Jurisdiction;
  baseStandards: string[];
  rules: RegulatoryRuleSet;
  basis: RegulatoryBasis;
  source: string;
  notes: string;
};

export type TechnicalObjectType =
  | "bess_container"
  | "pcs"
  | "transformer"
  | "switchgear"
  | "unknown";

export type TechnicalLayoutObject = {
  id: string;
  type: TechnicalObjectType;
  placed: PlacedEquipment;
  rect: RotatedRectLocal;
  sourceReliability: PlacedEquipment["sourceReliability"];
};

export type ValidationSeverity = "compliant" | "warning" | "critical";

export type ValidationIssue = {
  id: string;
  severity: ValidationSeverity;
  ruleId: string;
  ruleLabel: string;
  objectAId: string;
  objectBId?: string;
  measured_m?: number;
  required_m?: number;
  source: string;
  basis: RegulatoryBasis;
  message: string;
  recommendation: string;
  conflictPoint?: LocalPoint;
};

export type RegulatoryProjectStatus =
  | "compliant"
  | "compliant_with_warnings"
  | "non_compliant"
  | "not_evaluated";

export type ValidationResult = {
  profile: RegulatoryProfile;
  context: RegulatoryDesignContext;
  projectStatus: RegulatoryProjectStatus;
  checkedRules: number;
  compliantCount: number;
  warningCount: number;
  criticalCount: number;
  issues: ValidationIssue[];
  compliantItems: ValidationIssue[];
  objects: TechnicalLayoutObject[];
  anchor: ProjectAnchor | null;
};
