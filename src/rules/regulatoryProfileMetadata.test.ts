/**
 * Fase 10 — invariantes del shim de perfiles regulatorios.
 *
 * Asegura que `regulatoryProfileMetadata.ts` no inline valores numéricos:
 * todo `RegulatoryProfile.rules` debe coincidir bit-a-bit con las
 * constantes exportadas por `defaultConstraints.ts`. Si una regla nueva
 * se agrega al ruleset, debe primero existir como constante nombrada en
 * `defaultConstraints.ts` y reflejarse aquí — este test falla si alguien
 * vuelve a duplicar literales.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGULATORY_CONTEXT,
  REGULATORY_PROFILES,
  getRegulatoryProfile,
} from "@/rules/regulatoryProfileMetadata";
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
import type {
  RegulatoryProfileId,
  RegulatoryRuleSet,
} from "@/types/bessLayoutTypes";

const EXPECTED_RULES: RegulatoryRuleSet = {
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

const EXPECTED_PROFILE_IDS: RegulatoryProfileId[] = [
  "ifc-2024-nfpa-855-conservative",
  "chile-sec-rgr-06-2024",
  "custom",
];

describe("regulatoryProfileMetadata — Fase 10 single source of truth", () => {
  it("exposes the three legacy profile ids in stable order", () => {
    expect(REGULATORY_PROFILES.map((p) => p.id)).toEqual(EXPECTED_PROFILE_IDS);
  });

  it("every profile's numeric ruleset comes from defaultConstraints", () => {
    for (const profile of REGULATORY_PROFILES) {
      expect(profile.rules, `profile ${profile.id} drifted from constants`)
        .toEqual(EXPECTED_RULES);
    }
  });

  it("getRegulatoryProfile returns the matching profile and falls back to the first one", () => {
    expect(getRegulatoryProfile("chile-sec-rgr-06-2024").id).toBe(
      "chile-sec-rgr-06-2024"
    );
    // Unknown ids degrade gracefully to the conservative international profile.
    expect(
      getRegulatoryProfile("not-a-real-id" as RegulatoryProfileId).id
    ).toBe("ifc-2024-nfpa-855-conservative");
  });

  it("default context is conservative (no UL 9540A, no AHJ, no manufacturer manual)", () => {
    expect(DEFAULT_REGULATORY_CONTEXT.designLevel).toBe("predesign");
    expect(DEFAULT_REGULATORY_CONTEXT.hasUl9540a).toBe(false);
    expect(DEFAULT_REGULATORY_CONTEXT.hasHma).toBe(false);
    expect(DEFAULT_REGULATORY_CONTEXT.hasLsft).toBe(false);
    expect(DEFAULT_REGULATORY_CONTEXT.hasAhjApproval).toBe(false);
    expect(DEFAULT_REGULATORY_CONTEXT.hasManufacturerManual).toBe(false);
  });

  it("ruleset spread is shallow-equal — overrides must not introduce inline literals", () => {
    // If Chile SEC RGR 06/2024 ever overrides a value, it must come from a
    // named constant. Today no field diverges; the explicit equality check
    // freezes the contract.
    const intl = getRegulatoryProfile("ifc-2024-nfpa-855-conservative");
    const chile = getRegulatoryProfile("chile-sec-rgr-06-2024");
    const custom = getRegulatoryProfile("custom");
    expect(chile.rules).toEqual(intl.rules);
    expect(custom.rules).toEqual(intl.rules);
  });
});
