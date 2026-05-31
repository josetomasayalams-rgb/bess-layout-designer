import { describe, expect, it } from "vitest";
import { strategyLabel, explainScore, explainAlternative } from "./smartSiteFitExplain";
import type { SmartSiteFitCandidate } from "./smartSiteFitTypes";

describe("SmartSiteFit Explain", () => {
  it("should output correct labels for strategies in both languages", () => {
    expect(strategyLabel("max_capacity", "es")).toBe("Compacta");
    expect(strategyLabel("max_capacity", "en")).toBe("Compact");
    expect(strategyLabel("balanced", "es")).toBe("Balanceada");
    expect(strategyLabel("balanced", "en")).toBe("Balanced");
    expect(strategyLabel("conservative", "es")).toBe("Conservadora");
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

  it("explains an integrated (Tesla) alternative without separate-PCS language", () => {
    // Integrated units resolve to battery_container in the catalog with no
    // separate PCS, so summarizePlacedEquipment yields pcsCount === 0.
    const candidate: SmartSiteFitCandidate = {
      id: "alt-integrated",
      strategy: "balanced",
      placedEquipment: [1, 2, 3].map((n) => ({
        id: `unit-${n}`,
        equipmentSpecId: "bess-tesla-megapack-2xl-4h",
        anchor: { lng: -70, lat: -33 },
        rotation_deg: 0,
        sourceReliability: "preliminary_assumption" as const,
      })),
      score: {
        total: 78,
        insidePolygon: 24,
        noCollisions: 24,
        boundaryMargin: 10,
        siteUtilization: 8,
        rowRegularity: 8,
        corridorEfficiency: 4,
        ratioCompliance: 0,
      },
      warnings: [],
      assumptions: [],
    };

    const es = explainAlternative(candidate, "es");
    const en = explainAlternative(candidate, "en");

    // Integrated narrative: units + integrated conversion, no separate PCS.
    expect(es).toContain("3 unidades integradas");
    expect(es).toContain("conversión de potencia integrada");
    expect(es).toContain("No se modelan estaciones PCS/MV");
    expect(en).toContain("3 integrated units");
    expect(en.toLowerCase()).toContain("integrated power conversion");

    // Must NOT carry the misleading separate-PCS narrative for integrated.
    expect(es).not.toContain("0 PCS");
    expect(es).not.toContain("0 estaciones");
    expect(es).not.toContain("cada PCS/MV asociado");
    expect(en).not.toContain("0 PCS");
    expect(en).not.toContain("tied to its BESS group");

    // Tone: preliminary, no forbidden words, in both languages.
    const forbiddenWords = ["perfecto", "óptimo", "garantizado", "ingeniería de detalle"];
    for (const word of forbiddenWords) {
      expect(es.toLowerCase()).not.toContain(word);
      expect(en.toLowerCase()).not.toContain(word);
    }
  });

  it("omits BESS/PCS ratio and PCS-integration lines from explainScore when integrated", () => {
    const score = {
      total: 80,
      insidePolygon: 25,
      noCollisions: 25,
      boundaryMargin: 10,
      siteUtilization: 8,
      rowRegularity: 8,
      corridorEfficiency: 7,
      ratioCompliance: 5,
    };

    const separateEs = explainScore(score, "es");
    const integratedEs = explainScore(score, "es", { isIntegrated: true });
    const integratedEn = explainScore(score, "en", { isIntegrated: true });

    // Separate-PCS (default) keeps the ratio / PCS-integration lines.
    expect(separateEs).toContain("Proporción BESS / PCS");
    expect(separateEs).toContain("Integración de PCS");

    // Integrated drops them but keeps the architecture-neutral criteria.
    expect(integratedEs).not.toContain("Proporción BESS / PCS");
    expect(integratedEs).not.toContain("Integración de PCS");
    expect(integratedEs).toContain("Ausencia de colisiones");
    expect(integratedEn).not.toContain("BESS / PCS spec ratio");
    expect(integratedEn).not.toContain("PCS integration with its BESS cluster");
    expect(integratedEn).toContain("Collision check");
  });
});
