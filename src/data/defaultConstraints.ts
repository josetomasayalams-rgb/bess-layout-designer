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
