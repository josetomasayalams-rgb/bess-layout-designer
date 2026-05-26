/**
 * Fase 8 — tests dedicados para los 8 checks eléctricos preliminares.
 *
 * Cada describe cubre `pasa` y `falla` para una regla. Los fixtures
 * usan el preset BESS del Desierto como base y mutan sólo el dato
 * mínimo necesario para forzar el resultado, para no acoplar a otros
 * checks.
 */

import { describe, expect, it } from "vitest";
import {
  bessDelDesiertoAuxiliaryServices,
  bessDelDesiertoBlocks,
  bessDelDesiertoConversionStations,
  bessDelDesiertoMVBuses,
  bessDelDesiertoMVFeeders,
  bessDelDesiertoOperationalLimits,
  bessDelDesiertoPOI,
  bessDelDesiertoPPC,
} from "@/data/projectCaseStudies";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fullPresetInput() {
  return {
    blocks: clone(bessDelDesiertoBlocks),
    conversionStations: clone(bessDelDesiertoConversionStations),
    mvFeeders: clone(bessDelDesiertoMVFeeders),
    mvBuses: clone(bessDelDesiertoMVBuses),
    poi: clone(bessDelDesiertoPOI),
    auxiliaryServices: clone(bessDelDesiertoAuxiliaryServices),
    operationalLimits: clone(bessDelDesiertoOperationalLimits),
    ppc: clone(bessDelDesiertoPPC),
  };
}

function hasIssue(
  result: ReturnType<typeof validateElectricalTopology>,
  prefix: string
): boolean {
  return result.issues.some((i) => i.id.startsWith(prefix));
}

describe("Fase 8 — RULE-ELEC-007 busbar capacity screening", () => {
  it("does not fire when aggregated MVA is below the busbar threshold", () => {
    // Preset BP5/BP6 at 2500 A × √3 × 33 kV ≈ 142 MVA per bus; the
    // preset aggregates 5 feeders × 20 MVA = 100 MVA, so 100/142 ≈
    // 70% < 80% threshold → no warning.
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-007-busbar-utilization-")).toBe(false);
  });

  it("fires when aggregated MVA exceeds the busbar threshold", () => {
    const input = fullPresetInput();
    // Lower the busbar rating dramatically so 100 MVA aggregated
    // exceeds 80% of the rating.
    for (const bus of input.mvBuses) {
      if (bus.switchgear?.busbarCurrentA) {
        bus.switchgear.busbarCurrentA.value = 800; // ≈ 45 MVA at 33 kV
      }
    }
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-007-busbar-utilization-")).toBe(true);
  });
});

describe("Fase 8 — RULE-ELEC-008 cable ampacity screening", () => {
  it("does not fire when conceptual current is below the ampacity threshold", () => {
    // Preset feeders at 20 MVA / 33 kV ≈ 350 A; 350/460 ≈ 76% < 90% threshold.
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-008-cable-ampacity-")).toBe(false);
  });

  it("fires when conceptual current exceeds the ampacity threshold", () => {
    const input = fullPresetInput();
    for (const feeder of input.mvFeeders) {
      feeder.ratedPowerMVA = 30; // ≈ 525 A > 90% of 460 A
    }
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-008-cable-ampacity-")).toBe(true);
  });
});

describe("Fase 8 — RULE-ELEC-009 conceptual loss budget", () => {
  it("does not fire when total losses are within the 3% budget", () => {
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-009-loss-budget")).toBe(false);
  });

  it("fires when transformer losses are inflated above the budget", () => {
    const input = fullPresetInput();
    for (const station of input.conversionStations) {
      if (station.blockTransformer.loadLossKw) {
        station.blockTransformer.loadLossKw.value = 200000;
      } else {
        station.blockTransformer.loadLossKw = {
          value: 200000,
          unit: "kW",
          evidence: [
            { documentId: "__none__", confidence: "assumption", note: "test" },
          ],
        };
      }
    }
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-009-loss-budget")).toBe(true);
  });
});

describe("Fase 8 — RULE-ELEC-013 POI capacity fit", () => {
  it("does not fire when plant MVA is below the declared POI capacity", () => {
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-013-poi-capacity-exceeded")).toBe(false);
  });

  it("fires when plant MVA exceeds the declared POI capacity", () => {
    const input = fullPresetInput();
    if (input.poi?.declaredCapacityMVA) {
      input.poi.declaredCapacityMVA.value = 50; // <<< 200 MVA preset
    }
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-013-poi-capacity-exceeded")).toBe(true);
  });

  it("fires the missing variant when POI carries no declared capacity", () => {
    const input = fullPresetInput();
    if (input.poi) input.poi.declaredCapacityMVA = undefined;
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-013-poi-capacity-missing")).toBe(true);
  });
});

describe("Fase 8 — RULE-ELEC-014 auxiliary services budget", () => {
  it("does not fire when SSAA fits the 2% budget", () => {
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-014-ssaa-budget")).toBe(false);
  });

  it("fires when SSAA exceed the budget", () => {
    const input = fullPresetInput();
    if (input.auxiliaryServices?.plantFixedKw) {
      input.auxiliaryServices.plantFixedKw.value = 10_000; // 10 MW SSAA vs 200 MVA plant
    } else if (input.auxiliaryServices) {
      input.auxiliaryServices.plantFixedKw = {
        value: 10_000,
        unit: "kW",
        evidence: [
          { documentId: "__none__", confidence: "assumption", note: "test" },
        ],
      };
    }
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-014-ssaa-budget")).toBe(true);
  });
});

describe("Fase 8 — RULE-ELEC-015 ramp rate declared", () => {
  it("does not fire when ramp rate is declared", () => {
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-015-ramp-rate-missing")).toBe(false);
  });

  it("fires when neither PPC nor OperationalLimits declare a ramp rate", () => {
    const input = fullPresetInput();
    if (input.operationalLimits) input.operationalLimits.plantRampUpMWperMin = undefined;
    if (input.ppc) input.ppc.rampRateLimit_mw_per_min = undefined;
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-015-ramp-rate-missing")).toBe(true);
  });
});

describe("Fase 8 — RULE-ELEC-016 PPC control modes coverage", () => {
  it("does not fire when P/Q/V/f are all declared", () => {
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-016-ppc-control-coverage")).toBe(false);
  });

  it("fires when a required mode is missing", () => {
    const input = fullPresetInput();
    if (input.ppc) input.ppc.controlModes.frequency = false;
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-016-ppc-control-coverage")).toBe(true);
  });
});

describe("Fase 8 — RULE-ELEC-017 transformer no-load losses annual", () => {
  it("does not fire when the threshold is not exceeded", () => {
    // Preset is missing noLoadLossKw, so totalNoLoadKw = 0 → no issue.
    const result = validateElectricalTopology(fullPresetInput());
    expect(hasIssue(result, "rule-elec-017-no-load-losses-annual")).toBe(false);
  });

  it("fires when annual no-load losses exceed 1000 MWh/year", () => {
    const input = fullPresetInput();
    for (const station of input.conversionStations) {
      station.blockTransformer.noLoadLossKw = {
        value: 50, // 50 kW × 8760 h × 40 stations / 1000 = 17 520 MWh/year
        unit: "kW",
        evidence: [
          { documentId: "__none__", confidence: "assumption", note: "test" },
        ],
      };
    }
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-017-no-load-losses-annual")).toBe(true);
  });
});
