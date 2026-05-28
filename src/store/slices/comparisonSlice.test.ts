/**
 * Phase 14.2 — comparisonSlice.
 *
 * Covers the capture / clear / restore lifecycle of the A/B layout
 * comparator. Pre-Phase 14 coverage was 10 %.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { resetProjectStore } from "./_testHelpers";

const SPEC_ID = equipmentCatalog[0].id;

beforeEach(resetProjectStore);

function placeAt(lng: number, lat: number) {
  useProjectStore.getState().setPlacementSpec(SPEC_ID);
  useProjectStore.getState().placeEquipmentAt({ lng, lat });
}

describe("comparisonSlice — captureAlternative", () => {
  it("snapshots current anchor + polygon + placedEquipment into the slot", () => {
    placeAt(-70, -33);
    useProjectStore.getState().captureAlternative("A");

    const slotA = useProjectStore.getState().comparison.A;
    expect(slotA).not.toBeNull();
    expect(slotA?.placedEquipment).toHaveLength(1);
    expect(typeof slotA?.id).toBe("string");
    expect(typeof slotA?.capturedAt).toBe("string");
  });

  it("supports independent A and B slots", () => {
    placeAt(-70, -33);
    useProjectStore.getState().captureAlternative("A");
    placeAt(-70.001, -33);
    useProjectStore.getState().captureAlternative("B");

    const c = useProjectStore.getState().comparison;
    expect(c.A?.placedEquipment).toHaveLength(1);
    expect(c.B?.placedEquipment).toHaveLength(2);
  });
});

describe("comparisonSlice — clearAlternative", () => {
  it("nulls a specific slot without touching the other", () => {
    placeAt(-70, -33);
    useProjectStore.getState().captureAlternative("A");
    useProjectStore.getState().captureAlternative("B");

    useProjectStore.getState().clearAlternative("A");
    const c = useProjectStore.getState().comparison;
    expect(c.A).toBeNull();
    expect(c.B).not.toBeNull();
  });
});

describe("comparisonSlice — restoreAlternative", () => {
  it("restores the captured layout and records history", () => {
    placeAt(-70, -33);
    useProjectStore.getState().captureAlternative("A");
    const captured = useProjectStore
      .getState()
      .comparison.A!.placedEquipment.slice();

    // Now mutate live state
    placeAt(-70.001, -33);
    expect(useProjectStore.getState().placedEquipment).toHaveLength(2);

    useProjectStore.getState().restoreAlternative("A");

    const s = useProjectStore.getState();
    expect(s.placedEquipment).toEqual(captured);
    expect(s.past.length).toBeGreaterThan(0);
    expect(s.cableRoutes).toEqual([]);
    expect(s.accessRoads).toEqual([]);
    expect(s.interactionMode).toBe("select");
  });

  it("no-ops when the slot is empty", () => {
    const before = useProjectStore.getState().placedEquipment;
    useProjectStore.getState().restoreAlternative("A");
    expect(useProjectStore.getState().placedEquipment).toEqual(before);
  });
});
