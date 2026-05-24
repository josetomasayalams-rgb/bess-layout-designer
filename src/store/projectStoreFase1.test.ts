/**
 * Fase 1 — smoke tests sobre los slices nuevos del projectStore.
 *
 * Verifica que los slices arrancan vacíos y no rompen el shape del store.
 * No hay acciones todavía: las acciones llegan en fases siguientes cuando
 * exista UI que las dispare.
 */

import { describe, it, expect } from "vitest";
import { useProjectStore } from "@/store/projectStore";

describe("projectStore — Fase 1 slices (read-only)", () => {
  it("initial designTargets is an empty object", () => {
    const state = useProjectStore.getState();
    expect(state.designTargets).toEqual({});
  });

  it("electrical-architecture slices start empty", () => {
    const s = useProjectStore.getState();
    expect(s.blocks).toEqual([]);
    expect(s.conversionStations).toEqual([]);
    expect(s.mvFeeders).toEqual([]);
    expect(s.mvBuses).toEqual([]);
    expect(s.poi).toBeNull();
    expect(s.mainTransformer).toBeNull();
    expect(s.auxiliaryServices).toBeNull();
    expect(s.ppc).toBeNull();
    expect(s.operationalLimits).toBeNull();
    expect(s.lossEstimates).toEqual([]);
  });

  it("physical-layout slices start empty", () => {
    const s = useProjectStore.getState();
    expect(s.cableRoutes).toEqual([]);
    expect(s.accessRoads).toEqual([]);
    expect(s.fireSafetyZones).toEqual([]);
  });

  it("traceability slices start empty", () => {
    const s = useProjectStore.getState();
    expect(s.assumptionsV2).toEqual([]);
    expect(s.inconsistencies).toEqual([]);
  });

  it("legacy slices are still present and intact", () => {
    const s = useProjectStore.getState();
    expect(s.polygon).toBeDefined();
    expect(s.placedEquipment).toBeDefined();
    expect(s.interactionMode).toBeDefined();
    expect(s.layoutEdit).toBeDefined();
  });
});
