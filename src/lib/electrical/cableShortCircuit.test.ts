import { describe, expect, it } from "vitest";
import {
  conductorShortCircuitWithstandA,
  MV_CABLE_SHORT_CIRCUIT_WITHSTAND_KA,
  NEXANS_NA2XS2Y_630_SC,
  SC_K_FACTOR,
  mvCableShortCircuit,
} from "@/lib/electrical/cableShortCircuit";

describe("cableShortCircuit - adiabatic conductor screening", () => {
  it("computes I = k*S/sqrt(t)", () => {
    expect(
      conductorShortCircuitWithstandA({
        sectionMm2: 630,
        kFactor: 94,
        clearingTimeS: 1,
      })
    ).toBe(59_220);
  });

  it("scales with the inverse square root of clearing time", () => {
    const atOneSecond = conductorShortCircuitWithstandA({
      sectionMm2: 630,
      kFactor: 94,
      clearingTimeS: 1,
    });
    const atQuarterSecond = conductorShortCircuitWithstandA({
      sectionMm2: 630,
      kFactor: 94,
      clearingTimeS: 0.25,
    });

    expect(atQuarterSecond).toBeCloseTo(atOneSecond * 2, 8);
  });

  it("returns zero for a non-positive clearing time", () => {
    expect(
      conductorShortCircuitWithstandA({
        sectionMm2: 630,
        kFactor: 94,
        clearingTimeS: 0,
      })
    ).toBe(0);
  });

  it("keeps the reference cable result tied to the documented section", () => {
    expect(NEXANS_NA2XS2Y_630_SC.sectionMm2).toBe(630);
    expect(SC_K_FACTOR.aluminiumXlpe).toBe(94);
    expect(MV_CABLE_SHORT_CIRCUIT_WITHSTAND_KA).toBe(59.2);
  });

  it("classifies the screen value as documented and conductor result as derived", () => {
    expect(mvCableShortCircuit.screenWithstandKa.value).toBe(4.5);
    expect(mvCableShortCircuit.screenWithstandKa.evidence[0].confidence).toBe("documented");
    expect(mvCableShortCircuit.screenWithstandKa.evidence[0].documentId).toBe(
      "NEXANS-NA2XS2Y-19-33"
    );
    expect(mvCableShortCircuit.conductorWithstandKa.value).toBe(59.2);
    expect(mvCableShortCircuit.conductorWithstandKa.evidence[0].confidence).toBe("derived");
  });
});
