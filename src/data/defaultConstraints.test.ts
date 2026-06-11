import { describe, it, expect } from "vitest";
import { disclaimerTexts } from "./disclaimerTexts";
import { exclusionRegistry } from "./exclusionRegistry";
import {
  VEHICLE_ACCESS_MAX_DISTANCE_M,
  CABLE_TO_EQUIPMENT_CLEARANCE_M,
  STATION_GAP_M,
  BLOCK_GAP_X_M,
  BLOCK_GAP_Y_M,
  MARGIN_M,
  LOSS_BUDGET_PCT,
  SSAA_BUDGET_PCT,
  BUSBAR_UTILIZATION_THRESHOLD_PCT,
  CABLE_AMPACITY_UTILIZATION_THRESHOLD_PCT,
} from "./defaultConstraints";
import { buildReportData } from "../lib/report/buildReportData";


describe("Phase 3 - Warnings, Exclusions, and Spacing Constants", () => {
  describe("disclaimerTexts", () => {
    it("should export the expected text blocks", () => {
      const keys = [
        "generalMvp",
        "conceptualSizing",
        "documentTraceability",
        "uncertifiedRules",
        "fireSafetyPending",
        "electricalCompatibility",
        "conceptualLayout",
        "conceptualInfrastructure",
        "internationalReferenceOnly",
        "shortInterface",
      ];
      for (const key of keys) {
        const text = disclaimerTexts[key as keyof typeof disclaimerTexts];
        expect(text).toBeDefined();
        expect(typeof text).toBe("string");
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });

  describe("exclusionRegistry", () => {
    it("should contain the mandatory exclusions (11 baseline + Phase 8 additions)", () => {
      const baselineIds = [
        "ex-load-flow",
        "ex-short-circuit",
        "ex-protections-coordination",
        "ex-rms-emt-stability",
        "ex-harmonics",
        "ex-grounding-grid",
        "ex-geotechnical-civil",
        "ex-hydrology-drainage",
        "ex-detailed-fire-safety",
        "ex-environmental-permitting",
        "ex-detailed-interconnection-hv",
      ];
      const phase8AddedIds = [
        "ex-arc-flash",
        "ex-insulation-coordination",
        "ex-power-quality-pcc",
      ];

      expect(exclusionRegistry.length).toBe(
        baselineIds.length + phase8AddedIds.length
      );
      const registryIds = exclusionRegistry.map((e) => e.id);
      expect(registryIds).toEqual(
        expect.arrayContaining([...baselineIds, ...phase8AddedIds])
      );
    });

    it("should classify all exclusions as engineering_detail_exclusion", () => {
      for (const exclusion of exclusionRegistry) {
        expect(exclusion.classification).toBe("engineering_detail_exclusion");
        expect(exclusion.id).toBeDefined();
        expect(exclusion.label).toBeDefined();
        expect(exclusion.category).toBeDefined();
        expect(exclusion.reason).toBeDefined();
        expect(exclusion.reportText).toBeDefined();
      }
    });
  });

  describe("centralized constants values", () => {
    it("should preserve original spacing and limit values", () => {
      expect(VEHICLE_ACCESS_MAX_DISTANCE_M).toBe(30);
      expect(CABLE_TO_EQUIPMENT_CLEARANCE_M).toBe(1);
      expect(STATION_GAP_M).toBe(6);
      expect(BLOCK_GAP_X_M).toBe(8);
      expect(BLOCK_GAP_Y_M).toBe(8);
      expect(MARGIN_M).toBe(24);
    });

    it("Phase 8 electrical thresholds are editable preliminary assumptions", () => {
      // These are budget percentages, not norms. The test pins the
      // documented defaults; if they ever change, update the design
      // doc docs/phase8-electrical-scope.md too.
      expect(LOSS_BUDGET_PCT).toBe(0.03);
      expect(SSAA_BUDGET_PCT).toBe(0.02);
      expect(BUSBAR_UTILIZATION_THRESHOLD_PCT).toBe(0.8);
      expect(CABLE_AMPACITY_UTILIZATION_THRESHOLD_PCT).toBe(0.9);
    });
  });

  describe("buildReportData integration", () => {
    const minimalArgs = (locale: "en" | "es") => ({
      projectName: "Test Project",
      appVersion: "1.0.0",
      locale,
      polygon: [],
      anchor: null,
      placed: [],
      designTargets: {},
      blocks: [],
      conversionStations: [],
      mvFeeders: [],
      mvBuses: [],
      poi: null,
      mainTransformer: null,
      auxiliaryServices: null,
      ppc: null,
      operationalLimits: null,
      lossEstimates: [],
      assumptions: [],
      inconsistencies: [],
      pendingData: [],
      regulatoryEvaluation: null,
      caseStudy: null,
      mapCapture: null,
      geocode: null,
    });

    it("should correctly populate and translate disclaimers in Spanish", () => {
      const data = buildReportData(minimalArgs("es"));
      expect(data.disclaimers.length).toBe(17);
      expect(data.metadata.disclaimer).toBe(disclaimerTexts.generalMvp);

      const generalDisc = data.disclaimers.find((d) => d.id === "DISC-GEN");
      expect(generalDisc).toBeDefined();
      expect(generalDisc!.title).toBe("Advertencia General del MVP");
      expect(generalDisc!.text).toBe(disclaimerTexts.generalMvp);
    });

    it("should correctly populate and translate disclaimers in English", () => {
      const data = buildReportData(minimalArgs("en"));
      expect(data.disclaimers.length).toBe(17);
      
      const generalDisc = data.disclaimers.find((d) => d.id === "DISC-GEN");
      expect(generalDisc).toBeDefined();
      expect(generalDisc!.title).toBe("General MVP Disclaimer");
      expect(generalDisc!.text).toContain("preliminary BESS predesign");
    });

    it("should map every exclusion from the registry", () => {
      const dataEs = buildReportData(minimalArgs("es"));
      const dataEn = buildReportData(minimalArgs("en"));

      expect(dataEs.exclusions.length).toBe(exclusionRegistry.length);
      expect(dataEn.exclusions.length).toBe(exclusionRegistry.length);

      // Verify ID transformation (ex-load-flow -> EXC-LOAD-FLOW)
      const loadFlowEs = dataEs.exclusions.find((e) => e.id === "EXC-LOAD-FLOW");
      expect(loadFlowEs).toBeDefined();
      expect(loadFlowEs!.scope).toBe("Flujo de carga");
      expect(loadFlowEs!.reason).toContain("No calculado por la app");
      expect(loadFlowEs!.reason).toContain("Estudio eléctrico con modelo de red");

      const loadFlowEn = dataEn.exclusions.find((e) => e.id === "EXC-LOAD-FLOW");
      expect(loadFlowEn).toBeDefined();
      expect(loadFlowEn!.scope).toBe("Load flow study");
      expect(loadFlowEn!.reason).toContain("Not calculated by the app");
      expect(loadFlowEn!.reason).toContain("Power flow study");
    });
  });
});
