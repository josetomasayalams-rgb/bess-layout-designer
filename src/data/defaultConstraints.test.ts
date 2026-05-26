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
    it("should contain exactly the 11 mandatory exclusions", () => {
      const expectedIds = [
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

      expect(exclusionRegistry.length).toBe(11);
      const registryIds = exclusionRegistry.map((e) => e.id);
      expect(registryIds).toEqual(expect.arrayContaining(expectedIds));
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
      expect(data.disclaimers.length).toBe(9);
      expect(data.metadata.disclaimer).toBe(disclaimerTexts.generalMvp);

      const generalDisc = data.disclaimers.find((d) => d.id === "DISC-GEN");
      expect(generalDisc).toBeDefined();
      expect(generalDisc!.title).toBe("Advertencia General del MVP");
      expect(generalDisc!.text).toBe(disclaimerTexts.generalMvp);
    });

    it("should correctly populate and translate disclaimers in English", () => {
      const data = buildReportData(minimalArgs("en"));
      expect(data.disclaimers.length).toBe(9);
      
      const generalDisc = data.disclaimers.find((d) => d.id === "DISC-GEN");
      expect(generalDisc).toBeDefined();
      expect(generalDisc!.title).toBe("General MVP Disclaimer");
      expect(generalDisc!.text).toContain("preliminary BESS predesign");
    });

    it("should map exactly the 11 exclusions from registry", () => {
      const dataEs = buildReportData(minimalArgs("es"));
      const dataEn = buildReportData(minimalArgs("en"));

      expect(dataEs.exclusions.length).toBe(11);
      expect(dataEn.exclusions.length).toBe(11);

      // Verify ID transformation (ex-load-flow -> EXC-LOAD-FLOW)
      const loadFlowEs = dataEs.exclusions.find((e) => e.id === "EXC-LOAD-FLOW");
      expect(loadFlowEs).toBeDefined();
      expect(loadFlowEs!.scope).toBe("Flujo de carga");
      expect(loadFlowEs!.reason).toContain("No calculado por la app");
      expect(loadFlowEs!.reason).toContain("Estudio electrico con modelo red");

      const loadFlowEn = dataEn.exclusions.find((e) => e.id === "EXC-LOAD-FLOW");
      expect(loadFlowEn).toBeDefined();
      expect(loadFlowEn!.scope).toBe("Load flow study");
      expect(loadFlowEn!.reason).toContain("Not calculated by the app");
      expect(loadFlowEn!.reason).toContain("Power flow study");
    });
  });
});

