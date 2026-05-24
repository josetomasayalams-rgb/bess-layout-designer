export type DataClassification =
  | "certified_data"
  | "reported_project_data"
  | "calculated"
  | "inferred_not_certified"
  | "preliminary_assumption"
  | "pending_validation"
  | "engineering_judgement";

export type TechnicalSource = {
  classification: DataClassification;
  title: string;
  document?: string;
  page?: number;
  url?: string;
  notes?: string;
  extractedAt?: string;
};

export type NumericRange = {
  min: number;
  max: number;
  unit: string;
  source: TechnicalSource;
};

export type TechnicalValue<T> = {
  value: T;
  unit?: string;
  source: TechnicalSource;
};

export type ProjectDesignIntent = {
  targetPowerMW: number;
  targetEnergyMWh: number;
  targetDurationHours: number;
  designMode: "design_from_target" | "validate_existing_project";
  projectType: "standalone" | "hybrid" | "unknown";
  gridConnectionScope: "excluded" | "conceptual_boundary" | "included_future";
  notes: string[];
};

export type BessContainerSpec = {
  id: string;
  manufacturer: string;
  model: string;
  aliases: string[];
  chemistry?: TechnicalValue<string>;
  nominalEnergyMWhDcBol?: TechnicalValue<number>;
  usableEnergyMWhAc?: TechnicalValue<number>;
  dcVoltageRange?: NumericRange;
  footprint: {
    lengthM: TechnicalValue<number>;
    widthM: TechnicalValue<number>;
    heightM?: TechnicalValue<number>;
  };
  weightKg?: TechnicalValue<number>;
  cooling?: TechnicalValue<string>;
  protection?: TechnicalValue<string>;
  certifications: TechnicalValue<string[]>;
  clearances: {
    maintenanceM?: TechnicalValue<number>;
    fireSeparationM?: TechnicalValue<number>;
    status: DataClassification;
    notes: string;
  };
  sources: TechnicalSource[];
};

export type PcsSpec = {
  id: string;
  manufacturer: string;
  model: string;
  aliases: string[];
  type: "central_inverter" | "mv_power_converter" | "pcs" | "unknown";
  apparentPowerMva?: TechnicalValue<number>;
  activePowerMw?: TechnicalValue<number>;
  dcVoltageRange?: NumericRange;
  acLvVoltageKv?: TechnicalValue<number>;
  acMvVoltageKv?: TechnicalValue<number>;
  frequencyHz?: TechnicalValue<number>;
  powerFactor?: TechnicalValue<string>;
  efficiencyConverterPct?: TechnicalValue<number>;
  efficiencyIncludingTransformerPct?: TechnicalValue<number>;
  footprint?: {
    lengthM: TechnicalValue<number>;
    widthM: TechnicalValue<number>;
    heightM?: TechnicalValue<number>;
  };
  weightKg?: TechnicalValue<number>;
  cooling?: TechnicalValue<string>;
  certifications: TechnicalValue<string[]>;
  knownVoltageContradictions?: {
    datasheetLvKv?: number;
    datasheetMvKv?: number;
    projectReportedLvKv?: number;
    projectReportedMvKv?: number;
    notes: string;
  };
  sources: TechnicalSource[];
};

export type MvSkidSpec = {
  id: string;
  manufacturer: string;
  model: string;
  aliases: string[];
  role: "pcs_transformer_station" | "mv_collection_station" | "unknown";
  apparentPowerMva?: TechnicalValue<number>;
  pcsSpecId?: string;
  transformerSpecId?: string;
  lvVoltageKv?: TechnicalValue<number>;
  mvVoltageKv?: TechnicalValue<number>;
  collectorVoltageKv?: TechnicalValue<number>;
  footprint?: {
    lengthM: TechnicalValue<number>;
    widthM: TechnicalValue<number>;
    heightM?: TechnicalValue<number>;
  };
  weightKg?: TechnicalValue<number>;
  sources: TechnicalSource[];
};

export type TransformerSpec = {
  id: string;
  manufacturer?: string;
  model?: string;
  role: "inverter_duty_bt_mt" | "main_step_up" | "auxiliary" | "unknown";
  apparentPowerMva?: TechnicalValue<number>;
  lvVoltageKv?: TechnicalValue<number>;
  mvVoltageKv?: TechnicalValue<number>;
  hvVoltageKv?: TechnicalValue<number>;
  windingConfiguration?: TechnicalValue<string>;
  cooling?: TechnicalValue<string>;
  positiveSequenceReactancePct?: TechnicalValue<number>;
  positiveSequenceResistancePct?: TechnicalValue<number>;
  loadLossesKw?: TechnicalValue<number>;
  tapRange?: TechnicalValue<string>;
  footprint?: {
    lengthM?: TechnicalValue<number>;
    widthM?: TechnicalValue<number>;
    heightM?: TechnicalValue<number>;
  };
  weightKg?: TechnicalValue<number>;
  sources: TechnicalSource[];
};

export type PowerEnergyBlock = {
  id: string;
  name: string;
  bessContainerSpecId: string;
  bessContainerQuantity: number;
  pcsSpecId?: string;
  pcsQuantity: number;
  mvSkidSpecId?: string;
  transformerSpecId?: string;
  nominalPowerMva: TechnicalValue<number>;
  nominalEnergyMWhDc?: TechnicalValue<number>;
  declaredEnergyMWhAc?: TechnicalValue<number>;
  collectorVoltageKv?: TechnicalValue<number>;
  sourceRefs: string[];
  confidence: DataClassification;
};

export type LayoutAssumption = {
  id: string;
  appliesTo: "bess" | "pcs" | "mv_skid" | "transformer" | "road" | "fence" | "substation_boundary";
  parameter: string;
  value: number | string | null;
  unit?: string;
  source: TechnicalSource;
  notes: string;
};

export type ValidationStatus = {
  id: string;
  check: string;
  status: "pass" | "warning" | "fail" | "not_evaluable";
  message: string;
  affectedEquipmentIds: string[];
  requiredAction?: string;
};

export type PendingDataItem = {
  id: string;
  topic: string;
  reason: string;
  requiredFor: "conceptual" | "basic_engineering" | "detail_engineering";
  suggestedSource: string;
  priority: "critical" | "important" | "desirable";
};

export type ProjectExclusion = {
  id: string;
  scope: string;
  reason: string;
  futureStage: "basic_engineering" | "detail_engineering";
};

export type ProjectCaseStudy = {
  id: string;
  projectName: string;
  projectType: "standalone" | "hybrid" | "unknown";
  country: "Chile";
  designStage: "conceptual_validation_case";
  sourceFolder: string;
  designIntent: ProjectDesignIntent;
  equipmentSet: {
    bessContainers: BessContainerSpec[];
    pcsUnits: PcsSpec[];
    mvSkids: MvSkidSpec[];
    transformers: TransformerSpec[];
  };
  blockArchitecture: PowerEnergyBlock[];
  layoutAssumptions: LayoutAssumption[];
  validationStatus: ValidationStatus[];
  exclusions: ProjectExclusion[];
  pendingData: PendingDataItem[];
};

export type PreliminarySizingMode = ProjectDesignIntent["designMode"];

export type PreliminarySizingResult = {
  mode: PreliminarySizingMode;
  totalBessContainers: number;
  totalPcsOrMvCenters: number;
  totalNominalEnergyMWhDc: number;
  declaredProjectEnergyMWh: number;
  installedApparentPowerMva: number;
  targetPowerMW: number;
  declaredDurationHours: number;
  calculatedDurationFromDeclaredEnergyHours: number | null;
  calculatedDurationFromDcEnergyHours: number | null;
  approximateCRateFromDeclaredEnergy: number | null;
  energyOversizeVsDeclaredPct: number | null;
  powerOversizeVsTargetPct: number | null;
  requiredBessContainersByTarget?: number;
  requiredPowerBlocksByTarget?: number;
  warnings: string[];
};

export type ElectricalCompatibilityIssue = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  recommendation: string;
  basis:
    | "datasheet"
    | "reported_project_data"
    | "calculated"
    | "pending_validation"
    | "engineering_judgement";
  affectedIds: string[];
};
