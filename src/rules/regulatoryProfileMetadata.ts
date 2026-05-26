/**
 * regulatoryProfileMetadata — Fase 10 single source of truth shim.
 *
 * This module replaces the retired `bessRegulatoryProfiles.ts`. It carries
 * only **profile metadata** (id, name, base standards, jurisdiction,
 * source attribution, notes) and assembles the legacy `RegulatoryProfile`
 * shape consumed by `validateBessLayout` on top of the named clearance
 * constants exported by `defaultConstraints.ts`.
 *
 * Rationale (see docs/phase8-electrical-scope.md §4 and the Fase 10 plan):
 *
 *   - Before Fase 10 there were two independent numeric sources for
 *     clearances — `CONSERVATIVE_RULES` inside `bessRegulatoryProfiles.ts`
 *     and the named constants in `defaultConstraints.ts`. A change in one
 *     could silently diverge from the other.
 *
 *   - After Fase 10, every numeric clearance lives in
 *     `defaultConstraints.ts` and is referenced from here. The catalog of
 *     evidenced rules (`regulatoryRulesCatalog.ts` + `severityCeiling.ts`)
 *     remains the authoritative regulatory layer; this metadata file only
 *     supplies a compatibility surface for the legacy validation engine
 *     until Fase 11 reorganises the panels.
 *
 * Do NOT add numeric values directly to this file. New clearance values
 * must be added in `defaultConstraints.ts` first and pulled in here.
 */

import type {
  RegulatoryDesignContext,
  RegulatoryProfile,
  RegulatoryProfileId,
  RegulatoryRuleSet,
} from "@/types/bessLayoutTypes";
import {
  BESS_TO_BESS_M,
  BESS_TO_BUILDING_M,
  BESS_TO_COMBUSTIBLE_MATERIAL_M,
  BESS_TO_ESCAPE_ROUTE_M,
  BESS_TO_PROPERTY_LINE_M,
  BESS_TO_PUBLIC_WAY_M,
  COMBUSTIBLE_VEGETATION_CLEARANCE_M,
  ELECTRICAL_FRONT_WORKING_CLEARANCE_M,
  FIRE_AREA_REFERENCE_LIMIT_KWH,
  INTERNAL_BATTERY_GROUP_SEPARATION_M,
  MAINTENANCE_AISLE_M,
  MAX_ENERGY_PER_GROUP_KWH,
  TRANSFORMER_TO_BESS_MINIMUM_M,
  TRANSFORMER_TO_BESS_RECOMMENDED_M,
} from "@/data/defaultConstraints";

export const DEFAULT_REGULATORY_CONTEXT: RegulatoryDesignContext = {
  jurisdiction: "international",
  batteryChemistry: "lfp",
  installationType: "outdoor",
  designLevel: "predesign",
  hasUl9540a: false,
  hasHma: false,
  hasLsft: false,
  hasAhjApproval: false,
  hasManufacturerManual: false,
  fireSuppression: "undefined",
  ventilation: "undefined",
  fireBarrier: "none",
};

/**
 * Conservative ruleset built from `defaultConstraints.ts`. All three
 * profiles share this set today; jurisdiction-specific overrides should
 * be added as named constants in `defaultConstraints.ts` and spread on
 * top of this base, never inlined as literals here.
 */
const CONSERVATIVE_RULES: RegulatoryRuleSet = {
  bessToBess_m: BESS_TO_BESS_M,
  bessToBuilding_m: BESS_TO_BUILDING_M,
  bessToPropertyLine_m: BESS_TO_PROPERTY_LINE_M,
  bessToPublicWay_m: BESS_TO_PUBLIC_WAY_M,
  bessToCombustibleMaterial_m: BESS_TO_COMBUSTIBLE_MATERIAL_M,
  bessToEscapeRoute_m: BESS_TO_ESCAPE_ROUTE_M,
  combustibleVegetationClearance_m: COMBUSTIBLE_VEGETATION_CLEARANCE_M,
  maintenanceAisle_m: MAINTENANCE_AISLE_M,
  electricalFrontWorkingClearance_m: ELECTRICAL_FRONT_WORKING_CLEARANCE_M,
  internalBatteryGroupSeparation_m: INTERNAL_BATTERY_GROUP_SEPARATION_M,
  maxEnergyPerGroup_kwh: MAX_ENERGY_PER_GROUP_KWH,
  fireAreaReferenceLimit_kwh: FIRE_AREA_REFERENCE_LIMIT_KWH,
  transformerToBessMinimum_m: TRANSFORMER_TO_BESS_MINIMUM_M,
  transformerToBessRecommended_m: TRANSFORMER_TO_BESS_RECOMMENDED_M,
};

export const REGULATORY_PROFILES: RegulatoryProfile[] = [
  {
    id: "ifc-2024-nfpa-855-conservative",
    name: "IFC 2024 / NFPA 855 - Conservative predesign",
    jurisdiction: "international",
    baseStandards: ["IFC 2024", "NFPA 855", "UL 9540A reference"],
    rules: CONSERVATIVE_RULES,
    basis: "conservative_criterion",
    source:
      "Conservative predesign profile based on IFC/NFPA-style BESS screening criteria. Reductions require UL 9540A, HMA, LSFT, AHJ or manufacturer validation.",
    notes:
      "This profile is a conservative engineering screening baseline, not a universal legal distance for every BESS.",
  },
  {
    id: "chile-sec-rgr-06-2024",
    name: "Chile - SEC RGR 06/2024 (BESS)",
    jurisdiction: "chile",
    baseStandards: ["SEC RGR 06/2024"],
    rules: {
      ...CONSERVATIVE_RULES,
      // Jurisdiction-specific override slot. Currently SEC RGR 06/2024 does
      // not redefine numeric clearances vs the conservative baseline; any
      // future override must come from a `defaultConstraints.ts` constant.
    },
    basis: "normative",
    source:
      "Chile SEC RGR 06/2024 local reference (bound to documentRegistry entry SEC-RGR-06-2024). International separation criteria remain conservative references when outdoor utility-scale details are not explicitly defined in the local pliego.",
    notes:
      "For Chile, SEC RGR 06/2024 is the local reference. Manufacturer manuals, fire design and AHJ/insurer review remain required before promoting any clearance to a hard rule. Numeric thresholds in this profile are still conservative criteria, not pliego-extracted values.",
  },
  {
    id: "custom",
    name: "Custom profile",
    jurisdiction: "custom",
    baseStandards: ["User-defined"],
    rules: CONSERVATIVE_RULES,
    basis: "user_defined",
    source:
      "User-defined criteria. Values must be justified with manufacturer, engineering, UL 9540A/HMA/LSFT/AHJ or project-specific documentation.",
    notes:
      "Custom values keep visible validation warnings unless supporting basis is declared.",
  },
];

export function getRegulatoryProfile(id: RegulatoryProfileId): RegulatoryProfile {
  return (
    REGULATORY_PROFILES.find((profile) => profile.id === id) ??
    REGULATORY_PROFILES[0]
  );
}
