import { describe, expect, it } from "vitest";
import { strategyLabel, explainScore, explainAlternative } from "./smartSiteFitExplain";
import type { SmartSiteFitCandidate } from "./smartSiteFitTypes";

describe("SmartSiteFit Explain", () => {
  it("should output correct labels for strategies in both languages", () => {
    expect(strategyLabel("max_capacity", "es")).toBe("Capacidad Máxima");
    expect(strategyLabel("max_capacity", "en")).toBe("Maximum Capacity");
    expect(strategyLabel("balanced", "es")).toBe("Balanceado");
    expect(strategyLabel("balanced", "en")).toBe("Balanced");
    expect(strategyLabel("conservative", "es")).toBe("Conservador");
    expect(strategyLabel("conservative", "en")).toBe("Conservative");
  });

  it("should explain scores without forbidden words", () => {
    const score = {
      total: 85.5,
      insidePolygon: 25,
      noCollisions: 25,
      boundaryMargin: 10,
      siteUtilization: 8,
      rowRegularity: 5,
      corridorEfficiency: 7.5,
      ratioCompliance: 5,
    };

    const explanationEs = explainScore(score, "es");
    const explanationEn = explainScore(score, "en");

    expect(explanationEs).toContain("Evaluación de distribución");
    expect(explanationEs).toContain("85.5/100");
    expect(explanationEn).toContain("Layout evaluation");
    expect(explanationEn).toContain("85.5/100");

    // Check for forbidden terms
    const forbiddenWords = ["perfecto", "óptimo", "garantizado", "ingeniería de detalle"];
    for (const word of forbiddenWords) {
      expect(explanationEs.toLowerCase()).not.toContain(word);
      expect(explanationEn.toLowerCase()).not.toContain(word);
    }
  });

  it("should explain alternative configurations", () => {
    const candidate: SmartSiteFitCandidate = {
      id: "alt1",
      strategy: "balanced",
      placedEquipment: [
        {
          id: "item1",
          equipmentSpecId: "sungrow-st2752ux-us",
          anchor: { lng: -70, lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption",
        },
        {
          id: "item2",
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
          anchor: { lng: -70, lat: -33 },
          rotation_deg: 0,
          sourceReliability: "preliminary_assumption",
        },
      ],
      score: {
        total: 80,
        insidePolygon: 20,
        noCollisions: 20,
        boundaryMargin: 10,
        siteUtilization: 10,
        rowRegularity: 10,
        corridorEfficiency: 5,
        ratioCompliance: 5,
      },
      warnings: [],
      assumptions: [],
    };

    const explanationEs = explainAlternative(candidate, "es");
    expect(explanationEs).toContain("sugerida");
    expect(explanationEs).toContain("1 contenedores de batería BESS");
    expect(explanationEs).toContain("1 estaciones de conversión de potencia PCS");

    // Check for forbidden terms
    const forbiddenWords = ["perfecto", "óptimo", "garantizado", "ingeniería de detalle"];
    for (const word of forbiddenWords) {
      expect(explanationEs.toLowerCase()).not.toContain(word);
    }
  });
});
