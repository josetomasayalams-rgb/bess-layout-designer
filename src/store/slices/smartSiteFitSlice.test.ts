import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { resetProjectStore } from "./_testHelpers";
import type { LngLat } from "@/types/geometry";

beforeEach(resetProjectStore);

describe("smartSiteFitSlice — initial state", () => {
  it("should have correct empty baseline default values", () => {
    const s = useProjectStore.getState();
    expect(s.smartSiteFit.result).toBeNull();
    expect(s.smartSiteFit.selectedAlternativeId).toBeNull();
    expect(s.smartSiteFit.overrides).toEqual({});
    expect(s.smartSiteFit.dirty).toBe(false);
    expect(s.smartSiteFitApplied).toBeNull();
  });
});

describe("smartSiteFitSlice — run target mode", () => {
  it("generates distinct layout alternatives by target size and selects the best without mutating placedEquipment", () => {
    const polygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    useProjectStore.setState({ polygon, anchor: { lng0: -70, lat0: -33 } });

    useProjectStore.getState().runSmartSiteFitAnalysis({
      mode: "target",
      targetMW: 10,
      targetMWh: 80,
      durationHours: 8,
      strategy: "balanced",
    });

    const s = useProjectStore.getState();
    expect(s.smartSiteFit.result).not.toBeNull();
    expect(s.smartSiteFit.result?.success).toBe(true);
    expect(s.smartSiteFit.selectedAlternativeId).not.toBeNull();

    // R5-A: target mode now offers several distinct alternatives (was 1).
    const candidates = s.smartSiteFit.result!.candidates;
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.length).toBeLessThanOrEqual(8);
    // The best-scoring alternative leads and is the one pre-selected.
    expect(s.smartSiteFit.selectedAlternativeId).toBe(candidates[0].id);
    // Alternatives are genuinely distinct layout families.
    expect(new Set(candidates.map((c) => c.shape?.kind)).size).toBeGreaterThan(1);

    expect(s.smartSiteFit.dirty).toBe(false);
    expect(s.placedEquipment).toEqual([]); // Real layout remains untouched
  });
});

describe("smartSiteFitSlice — run terrain mode", () => {
  it("generates up to 3 alternatives and selects the first one without mutating layout", () => {
    const polygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    useProjectStore.setState({ polygon, anchor: { lng0: -70, lat0: -33 } });

    useProjectStore.getState().runSmartSiteFitAnalysis({
      mode: "terrain",
      durationHours: 4,
      strategy: "balanced",
    });

    const s = useProjectStore.getState();
    expect(s.smartSiteFit.result).not.toBeNull();
    expect(s.smartSiteFit.result?.success).toBe(true);
    expect(s.smartSiteFit.selectedAlternativeId).not.toBeNull();
    expect(s.smartSiteFit.result?.candidates.length).toBeGreaterThan(0);
    expect(s.smartSiteFit.result?.candidates.length).toBeLessThanOrEqual(3);
    expect(s.placedEquipment).toEqual([]);
  });
});

describe("smartSiteFitSlice — select alternative", () => {
  it("changes selectedAlternativeId if id exists, keeps it unchanged if id is invalid", () => {
    const polygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    useProjectStore.setState({ polygon, anchor: { lng0: -70, lat0: -33 } });

    const store = useProjectStore.getState();
    store.runSmartSiteFitAnalysis({
      mode: "terrain",
      durationHours: 4,
      strategy: "balanced",
    });

    const s1 = useProjectStore.getState();
    const candidates = s1.smartSiteFit.result?.candidates ?? [];
    expect(candidates.length).toBeGreaterThan(0);

    const firstId = candidates[0].id;
    // Try to select an invalid id
    useProjectStore.getState().selectSmartSiteFitAlternative("invalid-id");
    expect(useProjectStore.getState().smartSiteFit.selectedAlternativeId).toBe(firstId);

    // If there is a second candidate, select it
    if (candidates.length > 1) {
      const secondId = candidates[1].id;
      useProjectStore.getState().selectSmartSiteFitAlternative(secondId);
      expect(useProjectStore.getState().smartSiteFit.selectedAlternativeId).toBe(secondId);
    }
  });
});

describe("smartSiteFitSlice — update overrides", () => {
  it("merges overrides, sets dirty to true, and does not mutate real layout", () => {
    useProjectStore.getState().updateSmartSiteFitOverrides({
      bessToBess_m: 5,
    });

    const s1 = useProjectStore.getState();
    expect(s1.smartSiteFit.overrides.bessToBess_m).toBe(5);
    expect(s1.smartSiteFit.dirty).toBe(true);

    useProjectStore.getState().updateSmartSiteFitOverrides({
      boundaryMargin_m: 10,
    });

    const s2 = useProjectStore.getState();
    expect(s2.smartSiteFit.overrides.bessToBess_m).toBe(5);
    expect(s2.smartSiteFit.overrides.boundaryMargin_m).toBe(10);
    expect(s2.placedEquipment).toEqual([]);
  });
});

describe("smartSiteFitSlice — recalculate preview", () => {
  it("uses lastRunInput merged with overrides, clears dirty flag, and maintains or re-selects candidate", () => {
    const polygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    useProjectStore.setState({ polygon, anchor: { lng0: -70, lat0: -33 } });

    useProjectStore.getState().runSmartSiteFitAnalysis({
      mode: "target",
      targetMW: 5,
      targetMWh: 40,
      durationHours: 8,
      strategy: "balanced",
    });

    useProjectStore.getState().updateSmartSiteFitOverrides({
      bessToBess_m: 6.5,
    });

    expect(useProjectStore.getState().smartSiteFit.dirty).toBe(true);

    useProjectStore.getState().recalculateSmartSiteFitPreview();

    const s = useProjectStore.getState();
    expect(s.smartSiteFit.dirty).toBe(false);
    expect(s.smartSiteFit.lastRunInput?.overrides?.bessToBess_m).toBe(6.5);
    expect(s.smartSiteFit.selectedAlternativeId).not.toBeNull();
  });
});

describe("smartSiteFitSlice — apply alternative", () => {
  it("places the selected equipment in placedEquipment, saves applied metadata, preserves history, and clears preview state", () => {
    const polygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    useProjectStore.setState({ polygon, anchor: { lng0: -70, lat0: -33 } });

    useProjectStore.getState().runSmartSiteFitAnalysis({
      mode: "target",
      targetMW: 5,
      targetMWh: 40,
      durationHours: 8,
      strategy: "balanced",
    });

    const prevResult = useProjectStore.getState().smartSiteFit.result;
    const prevSelectedId = useProjectStore.getState().smartSiteFit.selectedAlternativeId;
    expect(prevSelectedId).not.toBeNull();

    const candidate = prevResult?.candidates.find((c) => c.id === prevSelectedId);
    expect(candidate).toBeDefined();

    const res = useProjectStore.getState().applySmartSiteFitAlternative();
    expect(res.success).toBe(true);
    expect(res.placedCount).toBe(candidate!.placedEquipment.length);

    const s = useProjectStore.getState();
    expect(s.placedEquipment.length).toBe(candidate!.placedEquipment.length);
    expect(s.smartSiteFitApplied).not.toBeNull();
    expect(s.smartSiteFitApplied?.score).toBe(candidate!.score.total);
    expect(s.smartSiteFitApplied?.strategy).toBe(candidate!.strategy);
    expect(s.smartSiteFitApplied?.mode).toBe("target");
    expect(s.smartSiteFitApplied?.bessCount).toBeGreaterThan(0);
    expect(s.smartSiteFitApplied?.pcsCount).toBeGreaterThan(0);

    // Verify history records the past snapshot
    expect(s.past.length).toBe(1);

    // Check preview is reset
    expect(s.smartSiteFit.result).toBeNull();
    expect(s.smartSiteFit.selectedAlternativeId).toBeNull();
  });
});

describe("smartSiteFitSlice — discard preview", () => {
  it("clears the preview result and overrides without touching existing placedEquipment or applied metadata", () => {
    const polygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    useProjectStore.setState({ polygon, anchor: { lng0: -70, lat0: -33 } });

    useProjectStore.getState().runSmartSiteFitAnalysis({
      mode: "target",
      targetMW: 5,
      targetMWh: 40,
      durationHours: 8,
      strategy: "balanced",
    });

    useProjectStore.getState().applySmartSiteFitAlternative();
    const beforeApplied = useProjectStore.getState().smartSiteFitApplied;
    const beforePlaced = useProjectStore.getState().placedEquipment;
    expect(beforeApplied).not.toBeNull();
    expect(beforePlaced.length).toBeGreaterThan(0);

    // Create a new preview
    useProjectStore.getState().runSmartSiteFitAnalysis({
      mode: "target",
      targetMW: 10,
      targetMWh: 80,
      durationHours: 8,
      strategy: "max_capacity",
    });

    expect(useProjectStore.getState().smartSiteFit.result).not.toBeNull();

    // Discard preview
    useProjectStore.getState().discardSmartSiteFit();

    const s = useProjectStore.getState();
    expect(s.smartSiteFit.result).toBeNull();
    expect(s.smartSiteFit.selectedAlternativeId).toBeNull();
    expect(s.placedEquipment).toEqual(beforePlaced); // Placed equipment remains unchanged
    expect(s.smartSiteFitApplied).toEqual(beforeApplied); // Metadata remains unchanged
  });
});
