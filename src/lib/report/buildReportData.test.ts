import { describe, expect, it } from "vitest";
import { toLngLat } from "@/lib/geometry/projection";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";
import { buildReportData } from "./buildReportData";

const anchor: ProjectAnchor = { lng0: -70.2, lat0: -24.1 };

function point(x_m: number, y_m: number) {
  return toLngLat({ x_m, y_m }, anchor);
}

function makePlacedEquipment(): PlacedEquipment[] {
  const containers: PlacedEquipment[] = Array.from({ length: 320 }, (_, index) => ({
    id: `bess-${index + 1}`,
    equipmentSpecId: "sungrow-st2752ux-us",
    anchor: point((index % 32) * 14, Math.floor(index / 32) * 8),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  }));

  const stations: PlacedEquipment[] = Array.from({ length: 40 }, (_, index) => ({
    id: `pcs-${index + 1}`,
    equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
    anchor: point((index % 10) * 48, 120 + Math.floor(index / 10) * 18),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  }));

  return [...containers, ...stations];
}

function baseReportArgs() {
  return {
    projectName: "BESS del Desierto",
    appVersion: "test",
    locale: "es" as const,
    polygon: [
      point(-80, -80),
      point(540, -80),
      point(540, 260),
      point(-80, 260),
    ],
    anchor,
    placed: makePlacedEquipment(),
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
  };
}

describe("buildReportData — report KPI synchronization", () => {
  it("derives non-zero executive KPIs from physical layout inventory", () => {
    const data = buildReportData(baseReportArgs());

    expect(data.reportKpis.source).toBe("layout_inventory");
    expect(data.reportKpis.containers).toBe(320);
    expect(data.reportKpis.stations).toBe(40);
    expect(data.reportKpis.feeders).toBe(10);
    expect(data.reportKpis.blocks).toBe(40);
    expect(data.reportKpis.installedPowerMVA).toBe(200);
    expect(data.reportKpis.grossEnergyMWh).toBeCloseTo(880.64, 3);
    expect(data.reportKpis.usableEnergyMWh).toBeGreaterThan(790);
    expect(data.reportKpis.durationHours).toBeGreaterThan(3.9);
    expect(data.sizingFromTargets.containers).toBe(320);
    expect(data.sizingFromTargets.stations).toBe(40);
    expect(data.sizingFromTargets.feeders).toBe(10);
  });

  it("adds explicit alerts when layout exists but electrical architecture is not persisted", () => {
    const data = buildReportData(baseReportArgs());
    const ids = data.consistencyAlerts.map((alert) => alert.id);

    expect(ids).toContain("RPT-SYNC-001");
    expect(ids).toContain("RPT-SYNC-003");
    expect(ids).toContain("RPT-SYNC-004");
    expect(data.consistencyAlerts.some((alert) => alert.severity === "critical")).toBe(true);
  });

  it("keeps the equipment inventory aligned with the report KPIs", () => {
    const data = buildReportData(baseReportArgs());
    const bess = data.equipmentInventory.find((row) => row.type === "battery_container");
    const pcs = data.equipmentInventory.find((row) => row.type === "pcs_mv_station");

    expect(bess?.count).toBe(data.reportKpis.containers);
    expect(pcs?.count).toBe(data.reportKpis.stations);
    expect(data.electrical.stationRows[0]?.ratedMVA).toBeCloseTo(5, 3);
    expect(data.electrical.stationRows[0]?.containerCount).toBe(8);
  });
});
