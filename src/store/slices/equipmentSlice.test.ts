/**
 * Phase 14.2 — equipmentSlice.
 *
 * Covers actions outside the placement happy path already exercised by
 * `projectStore.test.ts`: removeEquipment (with selection / layoutEdit
 * housekeeping), rotateEquipment (modulo wrap), selectEquipment /
 * selectCaseStudy, and the setPlacementSpec mode toggle.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { resetProjectStore } from "./_testHelpers";

const SPEC_ID = equipmentCatalog[0].id;

beforeEach(resetProjectStore);

function placeOne() {
  useProjectStore.getState().setPlacementSpec(SPEC_ID);
  useProjectStore.getState().placeEquipmentAt({ lng: -70, lat: -33 });
  return useProjectStore.getState().placedEquipment[0];
}

describe("equipmentSlice — setPlacementSpec", () => {
  it("enters place-equipment mode when given a non-null id", () => {
    useProjectStore.getState().setPlacementSpec(SPEC_ID);
    const s = useProjectStore.getState();
    expect(s.pendingPlacementSpecId).toBe(SPEC_ID);
    expect(s.interactionMode).toBe("place-equipment");
  });

  it("returns to select mode when given null", () => {
    useProjectStore.getState().setPlacementSpec(SPEC_ID);
    useProjectStore.getState().setPlacementSpec(null);
    const s = useProjectStore.getState();
    expect(s.pendingPlacementSpecId).toBeNull();
    expect(s.interactionMode).toBe("select");
  });
});

describe("equipmentSlice — removeEquipment", () => {
  it("removes the equipment and clears selection if it was selected", () => {
    const placed = placeOne();
    useProjectStore.getState().selectEquipment(placed.id);
    expect(useProjectStore.getState().selectedEquipmentId).toBe(placed.id);

    useProjectStore.getState().removeEquipment(placed.id);

    const s = useProjectStore.getState();
    expect(s.placedEquipment).toHaveLength(0);
    expect(s.selectedEquipmentId).toBeNull();
    expect(s.cableRoutes).toEqual([]);
    expect(s.accessRoads).toEqual([]);
    expect(s.past).toHaveLength(2); // place + remove
  });

  it("leaves unrelated selection alone", () => {
    const first = placeOne();
    useProjectStore.getState().setPlacementSpec(SPEC_ID);
    useProjectStore.getState().placeEquipmentAt({ lng: -70.001, lat: -33 });
    const second = useProjectStore.getState().placedEquipment[1];

    useProjectStore.getState().selectEquipment(second.id);
    useProjectStore.getState().removeEquipment(first.id);

    expect(useProjectStore.getState().selectedEquipmentId).toBe(second.id);
    expect(useProjectStore.getState().placedEquipment).toHaveLength(1);
  });
});

describe("equipmentSlice — rotateEquipment", () => {
  it("rotates by delta and wraps modulo 360", () => {
    const placed = placeOne();
    useProjectStore.getState().rotateEquipment(placed.id, 90);
    useProjectStore.getState().rotateEquipment(placed.id, 280);
    const after = useProjectStore.getState().placedEquipment[0];
    expect(after.rotation_deg).toBe(10);
  });

  it("ignores ids that do not match any equipment", () => {
    const placed = placeOne();
    useProjectStore.getState().rotateEquipment("does-not-exist", 90);
    expect(useProjectStore.getState().placedEquipment[0].rotation_deg).toBe(
      placed.rotation_deg
    );
  });
});

describe("equipmentSlice — selectCaseStudy", () => {
  it("stores and clears the selected case study id", () => {
    useProjectStore.getState().selectCaseStudy("bess-del-desierto");
    expect(useProjectStore.getState().selectedCaseStudyId).toBe(
      "bess-del-desierto"
    );
    useProjectStore.getState().selectCaseStudy(null);
    expect(useProjectStore.getState().selectedCaseStudyId).toBeNull();
  });
});
