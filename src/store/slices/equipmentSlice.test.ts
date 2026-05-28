/**
 * Phase 14.2 — equipmentSlice.
 *
 * Covers actions outside the placement happy path already exercised by
 * `projectStore.test.ts`: removeEquipment (with selection / layoutEdit
 * housekeeping), rotateEquipment (modulo wrap), selectEquipment /
 * selectCaseStudy, setPlacementSpec mode toggle, shiftLayout and
 * centerLayoutInSite.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLocal } from "@/lib/geometry/projection";
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

describe("equipmentSlice — shiftLayout", () => {
  it("shifts all non-locked equipment by the given delta", () => {
    const placed = placeOne();
    const anchor = useProjectStore.getState().anchor!;
    const before = toLocal(placed.anchor, anchor);

    useProjectStore.getState().shiftLayout(10, 20);

    const after = toLocal(
      useProjectStore.getState().placedEquipment[0].anchor,
      anchor
    );
    expect(after.x_m).toBeCloseTo(before.x_m + 10, 3);
    expect(after.y_m).toBeCloseTo(before.y_m + 20, 3);
  });

  it("records history so the shift can be undone", () => {
    placeOne();
    const pastBefore = useProjectStore.getState().past.length;
    useProjectStore.getState().shiftLayout(5, 5);
    expect(useProjectStore.getState().past.length).toBe(pastBefore + 1);
  });

  it("does not shift locked equipment", () => {
    const placed = placeOne();
    const anchor = useProjectStore.getState().anchor!;
    // Lock the item
    useProjectStore.setState((s) => ({
      placedEquipment: s.placedEquipment.map((item) =>
        item.id === placed.id ? { ...item, locked: true } : item
      ),
    }));
    useProjectStore.getState().shiftLayout(100, 100);
    const after = toLocal(
      useProjectStore.getState().placedEquipment[0].anchor,
      anchor
    );
    const before = toLocal(placed.anchor, anchor);
    expect(after.x_m).toBeCloseTo(before.x_m, 3);
    expect(after.y_m).toBeCloseTo(before.y_m, 3);
  });

  it("clears cable routes and access roads after shift", () => {
    placeOne();
    useProjectStore.setState({
      cableRoutes: [{ id: "r1", voltageLevel: "MT", fromEntityId: "a", toEntityId: "b", path: [], corridorWidth_m: 1 }],
      accessRoads: [],
    });
    useProjectStore.getState().shiftLayout(5, 5);
    expect(useProjectStore.getState().cableRoutes).toEqual([]);
  });

  it("does nothing if no equipment is placed", () => {
    expect(() => useProjectStore.getState().shiftLayout(10, 10)).not.toThrow();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(0);
  });
});

describe("equipmentSlice — centerLayoutInSite", () => {
  it("moves equipment so layout centroid aligns with polygon centroid", () => {
    placeOne();
    const anchor = { lng0: -70, lat0: -23 };
    useProjectStore.setState({
      anchor,
      polygon: [
        { lng: -70 - 0.002, lat: -23 - 0.002 },
        { lng: -70 + 0.002, lat: -23 - 0.002 },
        { lng: -70 + 0.002, lat: -23 + 0.002 },
        { lng: -70 - 0.002, lat: -23 + 0.002 },
      ],
    });

    useProjectStore.getState().centerLayoutInSite();

    const placed = useProjectStore.getState().placedEquipment;
    const localPos = toLocal(placed[0].anchor, anchor);
    // Polygon centroid is at (0, 0) in local coords; equipment should be near that
    expect(Math.hypot(localPos.x_m, localPos.y_m)).toBeLessThan(50);
  });

  it("does nothing if polygon has fewer than 3 vertices", () => {
    placeOne();
    const before = [...useProjectStore.getState().placedEquipment];
    useProjectStore.setState({ polygon: [{ lng: -70, lat: -23 }, { lng: -70.001, lat: -23 }] });
    useProjectStore.getState().centerLayoutInSite();
    expect(useProjectStore.getState().placedEquipment[0].anchor).toEqual(
      before[0].anchor
    );
  });
});
