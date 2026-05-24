/**
 * Fase 10 — tests sobre las acciones del store que pueblan los slices v1.2
 * a partir del preset BESS del Desierto.
 */

import { beforeEach, describe, it, expect } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { bessDelDesiertoPresetV12 } from "@/data/projectCaseStudies/bessDelDesiertoPresetV12";

function reset() {
  useProjectStore.getState().clearProjectV12Slices();
}

describe("loadBessDelDesiertoPresetV12", () => {
  beforeEach(reset);

  it("populates conversion stations, feeders, buses and POI", () => {
    useProjectStore.getState().loadBessDelDesiertoPresetV12();
    const s = useProjectStore.getState();
    expect(s.conversionStations).toHaveLength(40);
    expect(s.mvFeeders).toHaveLength(10);
    expect(s.mvBuses).toHaveLength(2);
    expect(s.poi).not.toBeNull();
    expect(s.poi?.voltageKv).toBe(33);
  });

  it("populates inconsistencies INC-001..INC-004", () => {
    useProjectStore.getState().loadBessDelDesiertoPresetV12();
    const s = useProjectStore.getState();
    const ids = s.inconsistencies.map((i) => i.id).sort();
    expect(ids).toEqual(["INC-001", "INC-002", "INC-003", "INC-004"]);
  });

  it("populates assumptionsV2 from pendingDataV12 (15 items)", () => {
    useProjectStore.getState().loadBessDelDesiertoPresetV12();
    const s = useProjectStore.getState();
    expect(s.assumptionsV2).toHaveLength(15);
    // Severity mapping: critical -> high
    const d001 = s.assumptionsV2.find((a) => a.id === "PEND-D001");
    expect(d001?.risk).toBe("high");
    expect(d001?.mustVerifyBeforeIFC).toBe(true);
    // desirable -> low + mustVerifyBeforeIFC: false
    const d015 = s.assumptionsV2.find((a) => a.id === "PEND-D015");
    expect(d015?.risk).toBe("low");
    expect(d015?.mustVerifyBeforeIFC).toBe(false);
  });

  it("populates design targets with documented evidence", () => {
    useProjectStore.getState().loadBessDelDesiertoPresetV12();
    const s = useProjectStore.getState();
    expect(s.designTargets.powerMW?.value).toBe(200);
    expect(s.designTargets.usableEnergyCommercialMWh?.value).toBe(800);
  });

  it("matches the preset bundle exactly for the populated keys", () => {
    useProjectStore.getState().loadBessDelDesiertoPresetV12();
    const s = useProjectStore.getState();
    expect(s.blocks).toBe(bessDelDesiertoPresetV12.blocks);
    expect(s.conversionStations).toBe(bessDelDesiertoPresetV12.conversionStations);
    expect(s.mvFeeders).toBe(bessDelDesiertoPresetV12.mvFeeders);
    expect(s.poi).toBe(bessDelDesiertoPresetV12.poi);
  });
});

describe("clearProjectV12Slices", () => {
  it("empties all v1.2 slices", () => {
    useProjectStore.getState().loadBessDelDesiertoPresetV12();
    useProjectStore.getState().clearProjectV12Slices();
    const s = useProjectStore.getState();
    expect(s.conversionStations).toEqual([]);
    expect(s.mvFeeders).toEqual([]);
    expect(s.mvBuses).toEqual([]);
    expect(s.poi).toBeNull();
    expect(s.mainTransformer).toBeNull();
    expect(s.inconsistencies).toEqual([]);
    expect(s.assumptionsV2).toEqual([]);
  });

  it("does not touch the placed equipment or polygon", () => {
    const state = useProjectStore.getState();
    const polygonBefore = state.polygon;
    const placedBefore = state.placedEquipment;
    state.loadBessDelDesiertoPresetV12();
    state.clearProjectV12Slices();
    expect(useProjectStore.getState().polygon).toBe(polygonBefore);
    expect(useProjectStore.getState().placedEquipment).toBe(placedBefore);
  });
});
