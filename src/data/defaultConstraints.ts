import type { SourceReliability } from "./equipmentCatalog";

export type LayoutConstraint = {
  id: string;
  label: string;
  value_m: number;
  reliability: SourceReliability;
  notes: string;
};

export const defaultConstraints: LayoutConstraint[] = [
  {
    id: "battery_container_spacing",
    label: "Battery container spacing",
    value_m: 3,
    reliability: "preliminary_assumption",
    notes:
      "Editable preliminary assumption for conceptual utility-scale layout. Must be validated with manufacturer installation manual, UL 9540A test results, NFPA 855, fire protection engineer, insurer and local AHJ.",
  },
  {
    id: "pcs_spacing",
    label: "PCS spacing",
    value_m: 3,
    reliability: "preliminary_assumption",
    notes:
      "Editable preliminary assumption. Must be validated with manufacturer installation requirements, thermal clearance, maintenance access and electrical safety.",
  },
  {
    id: "access_road_width",
    label: "Internal access road width",
    value_m: 6,
    reliability: "preliminary_assumption",
    notes:
      "Editable conceptual value for internal circulation. Must be validated with civil design, emergency access, construction logistics and local requirements.",
  },
  {
    id: "service_corridor_width",
    label: "Service corridor width",
    value_m: 4,
    reliability: "preliminary_assumption",
    notes:
      "Editable conceptual value for maintenance access.",
  },
  {
    id: "cable_trench_width",
    label: "Cable trench width",
    value_m: 1,
    reliability: "preliminary_assumption",
    notes:
      "Editable conceptual value. Final trench dimensions depend on cable sizing, ampacity, thermal backfill, segregation, voltage level and construction standard.",
  },
  {
    id: "fence_setback",
    label: "Fence setback",
    value_m: 5,
    reliability: "preliminary_assumption",
    notes:
      "Editable conceptual value. Final setback depends on site security, access, drainage, fire protection and local permitting.",
  },
];

export const VEHICLE_ACCESS_MAX_DISTANCE_M = 30;
export const CABLE_TO_EQUIPMENT_CLEARANCE_M = 1;
export const STATION_GAP_M = 6;
export const BLOCK_GAP_X_M = 8;
export const BLOCK_GAP_Y_M = 8;
export const MARGIN_M = 24;

/**
 * Fase 10 — physical-clearance preliminary assumptions.
 *
 * These constants are the **single source of truth** for the numeric
 * clearances consumed by `validateBessLayout` and by the conservative
 * predesign quick-sizing / repair helpers. They used to live inline as a
 * `CONSERVATIVE_RULES` object inside `bessRegulatoryProfiles.ts`; that
 * module is retired in Fase 10 and replaced by `regulatoryProfileMetadata`
 * which builds the legacy `RegulatoryProfile.rules` shape on top of these
 * constants.
 *
 * Every value here is a `preliminary_assumption` — a conservative
 * predesign screening criterion. Reductions require UL 9540A, HMA, LSFT,
 * AHJ or manufacturer validation. See the matrix in
 * `severityCeiling.ts` for how rule severity gets bounded by the actual
 * evidence chain in `regulatoryRulesCatalog.ts`.
 */
export const BESS_TO_BESS_M = 3;
export const BESS_TO_BUILDING_M = 3;
export const BESS_TO_PROPERTY_LINE_M = 3;
export const BESS_TO_PUBLIC_WAY_M = 3;
export const BESS_TO_COMBUSTIBLE_MATERIAL_M = 3;
export const BESS_TO_ESCAPE_ROUTE_M = 3;
export const COMBUSTIBLE_VEGETATION_CLEARANCE_M = 3;
export const MAINTENANCE_AISLE_M = 1;
export const ELECTRICAL_FRONT_WORKING_CLEARANCE_M = 0.9;
export const INTERNAL_BATTERY_GROUP_SEPARATION_M = 0.9;
export const MAX_ENERGY_PER_GROUP_KWH = 50;
export const FIRE_AREA_REFERENCE_LIMIT_KWH = 600;
export const TRANSFORMER_TO_BESS_MINIMUM_M = 1;
export const TRANSFORMER_TO_BESS_RECOMMENDED_M = 3;

/**
 * Fase 8 — umbrales editables para validaciones eléctricas preliminares.
 *
 * Todos son `preliminary_assumption`. Se usan para comparar estimaciones
 * conceptuales del motor eléctrico contra un "presupuesto" o utilización
 * objetivo. Ningún umbral aquí es una norma; pueden ajustarse por
 * proyecto. Ver docs/phase8-electrical-scope.md §1 para el origen.
 */
export const LOSS_BUDGET_PCT = 0.03;
export const SSAA_BUDGET_PCT = 0.02;
export const BUSBAR_UTILIZATION_THRESHOLD_PCT = 0.8;
export const CABLE_AMPACITY_UTILIZATION_THRESHOLD_PCT = 0.9;

/**
 * Reference ampacity used for the RULE-ELEC-008 screening when the
 * project has not chosen a specific cable. Conservative value typical
 * for Al XLPE 240 mm² 33 kV in air at 30 °C. NOT a design value; the
 * final ampacity depends on installation, grouping, soil thermal
 * resistivity and ambient temperature.
 */
export const MV_REFERENCE_CABLE_AMPACITY_A = 460;

/**
 * Minimum mandatory PPC control modes per CEN NTSyCS for utility-scale
 * BESS at the POI. Used by RULE-ELEC-016 as a declarative checklist
 * (not a runtime test of the controls themselves).
 */
export const PPC_REQUIRED_CONTROL_MODES = [
  "activePower",
  "reactivePower",
  "voltage",
  "frequency",
] as const;
