import { describe, it, expect } from "vitest";
import {
  buildExportedProject,
  importExportedProject,
} from "./exportJson";

const baseArgs = {
  anchor: null,
  polygon: [],
  placed: [],
  summary: {
    battery_container_count: 0,
    pcs_count: 0,
    total_apparent_power_mva: 0,
    total_energy_mwh_dc_bol: 0,
    duration_hours_gross: null,
    site_area: null,
    occupied_area_m2: 0,
    occupation_ratio: null,
  },
  warnings: [],
};

describe("buildExportedProject — schema v1.2", () => {
  it("returns schema_version 1.2 by default", () => {
    const out = buildExportedProject(baseArgs);
    expect(out.schema_version).toBe("1.2");
  });

  it("omits v1.2 optional fields when no v12 extras are passed", () => {
    const out = buildExportedProject(baseArgs);
    expect(out.design_targets).toBeUndefined();
    expect(out.electrical_architecture).toBeUndefined();
    expect(out.physical_layout).toBeUndefined();
    expect(out.assumptions_v2).toBeUndefined();
    expect(out.inconsistencies).toBeUndefined();
    expect(out.document_registry_refs).toBeUndefined();
  });

  it("includes v1.2 fields when extras are passed", () => {
    const out = buildExportedProject({
      ...baseArgs,
      v12: {
        designTargets: {
          powerMW: {
            value: 200,
            unit: "MW",
            evidence: [
              {
                documentId: "PROJ-BESS-DESIERTO-1129",
                page: 6,
                confidence: "documented",
              },
            ],
          },
        },
        assumptionsV2: [
          {
            id: "SUP-007",
            description: "Ancho de camino interno",
            value: 6,
            unit: "m",
            risk: "medium",
            mustVerifyBeforeIFC: false,
            evidence: [{ documentId: "__none__", confidence: "assumption" }],
          },
        ],
        inconsistencies: [
          {
            id: "INC-001",
            topic: "Modelo container",
            conflictingValues: [
              {
                value: "ST2752UX",
                evidence: {
                  documentId: "PROJ-BESS-DESIERTO-1129",
                  page: 6,
                  confidence: "documented",
                },
              },
              {
                value: "ST2725UX",
                evidence: {
                  documentId: "PROJ-BESS-DESIERTO-1129",
                  page: 14,
                  confidence: "documented",
                },
              },
            ],
            recommendation: "Confirmar con fabricante",
            resolvedValue: "ST2752UX",
          },
        ],
        documentRegistryRefs: ["PROJ-BESS-DESIERTO-1129"],
      },
    });

    expect(out.design_targets?.powerMW?.value).toBe(200);
    expect(out.assumptions_v2).toHaveLength(1);
    expect(out.assumptions_v2?.[0].id).toBe("SUP-007");
    expect(out.inconsistencies).toHaveLength(1);
    expect(out.inconsistencies?.[0].id).toBe("INC-001");
    expect(out.document_registry_refs).toEqual(["PROJ-BESS-DESIERTO-1129"]);
  });

  it("omits empty arrays for v1.2 fields to keep payload clean", () => {
    const out = buildExportedProject({
      ...baseArgs,
      v12: {
        assumptionsV2: [],
        inconsistencies: [],
        documentRegistryRefs: [],
      },
    });
    expect(out.assumptions_v2).toBeUndefined();
    expect(out.inconsistencies).toBeUndefined();
    expect(out.document_registry_refs).toBeUndefined();
  });
});

describe("importExportedProject — backward compatibility", () => {
  it("loads a synthetic v1.1 export and leaves v1.2 fields undefined", () => {
    const v11 = {
      schema_version: "1.1",
      exported_at: "2025-01-01T00:00:00.000Z",
      unit_system: "metric_si",
      anchor: null,
      polygon: [],
      placed_equipment: [],
      summary: {
        battery_container_count: 0,
        pcs_count: 0,
        total_apparent_power_mva: 0,
        total_energy_mwh_dc_bol: 0,
        duration_hours_gross: null,
        site_area: null,
        occupied_area_m2: 0,
        occupation_ratio: null,
      },
      summary_quantities: {
        site_area_m2: null,
        site_area_ha: null,
        occupied_area_m2: { value: 0, unit: "m²", data_classification: "preliminary_assumption" },
        total_apparent_power_mva: { value: 0, unit: "MVA", data_classification: "preliminary_assumption" },
        total_energy_mwh_dc_bol: { value: 0, unit: "MWh", data_classification: "preliminary_assumption" },
        duration_hours_gross: null,
        occupation_ratio_pct: null,
      },
      placed_equipment_quantities: [],
      warnings: [],
    };

    const loaded = importExportedProject(v11);
    expect(loaded.schema_version).toBe("1.1");
    expect(loaded.polygon).toEqual([]);
    // Los campos v1.2 no existen — siguen undefined.
    expect(loaded.design_targets).toBeUndefined();
    expect(loaded.electrical_architecture).toBeUndefined();
    expect(loaded.physical_layout).toBeUndefined();
  });

  it("loads a v1.2 export with full v12 payload", () => {
    const v12 = {
      schema_version: "1.2",
      exported_at: "2026-01-01T00:00:00.000Z",
      unit_system: "metric_si",
      anchor: null,
      polygon: [],
      placed_equipment: [],
      summary: {
        battery_container_count: 0,
        pcs_count: 0,
        total_apparent_power_mva: 0,
        total_energy_mwh_dc_bol: 0,
        duration_hours_gross: null,
        site_area: null,
        occupied_area_m2: 0,
        occupation_ratio: null,
      },
      summary_quantities: {
        site_area_m2: null,
        site_area_ha: null,
        occupied_area_m2: { value: 0, unit: "m²", data_classification: "preliminary_assumption" },
        total_apparent_power_mva: { value: 0, unit: "MVA", data_classification: "preliminary_assumption" },
        total_energy_mwh_dc_bol: { value: 0, unit: "MWh", data_classification: "preliminary_assumption" },
        duration_hours_gross: null,
        occupation_ratio_pct: null,
      },
      placed_equipment_quantities: [],
      warnings: [],
      design_targets: { powerMW: { value: 200, evidence: [] } },
    };

    const loaded = importExportedProject(v12);
    expect(loaded.schema_version).toBe("1.2");
    expect(loaded.design_targets?.powerMW?.value).toBe(200);
  });

  it("throws on unsupported schema_version", () => {
    expect(() =>
      importExportedProject({ schema_version: "2.0", polygon: [], placed_equipment: [] })
    ).toThrow(/unsupported schema_version/);
  });

  it("throws when polygon or placed_equipment are missing", () => {
    expect(() =>
      importExportedProject({ schema_version: "1.2" })
    ).toThrow(/missing required fields/);
  });

  it("throws on non-object input", () => {
    expect(() => importExportedProject(null)).toThrow();
    expect(() => importExportedProject("oops")).toThrow();
  });
});

describe("buildExportedProject — round trip", () => {
  it("export → import gives back an equivalent shape", () => {
    const exported = buildExportedProject(baseArgs);
    const reimported = importExportedProject(exported);
    expect(reimported.schema_version).toBe("1.2");
    expect(reimported.polygon).toEqual(exported.polygon);
    expect(reimported.placed_equipment).toEqual(exported.placed_equipment);
  });
});
