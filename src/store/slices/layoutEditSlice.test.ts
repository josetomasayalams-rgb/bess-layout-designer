/**
 * Phase 14.2 — layoutEditSlice.
 *
 * Targets the previewMove + clearSelection + setSelectionLocked +
 * markLayoutEditValidated paths that the existing `projectStore.test.ts`
 * does not cover. Preview rotate/orient + applyLayoutEdit are already
 * covered there.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { resetProjectStore } from "./_testHelpers";

const SPEC_ID = equipmentCatalog[0].id;

beforeEach(resetProjectStore);

function placeOne(): string {
  useProjectStore.getState().setPlacementSpec(SPEC_ID);
  useProjectStore.getState().placeEquipmentAt({ lng: -70, lat: -33 });
  return useProjectStore.getState().placedEquipment[0].id;
}

describe("layoutEditSlice — cancelLayoutEdit", () => {
  it("returns to select mode and clears layoutEdit", () => {
    placeOne();
    useProjectStore.getState().startLayoutEdit();
    expect(useProjectStore.getState().interactionMode).toBe("edit-layout");

    useProjectStore.getState().cancelLayoutEdit();
    const s = useProjectStore.getState();
    expect(s.interactionMode).toBe("select");
    expect(s.layoutEdit.selectedIds).toEqual([]);
  });
});

describe("layoutEditSlice — clearLayoutEditSelection", () => {
  it("clears selectedIds + selectionPolygon but keeps the draft", () => {
    const id = placeOne();
    useProjectStore.getState().startLayoutEdit();
    useProjectStore.getState().setLayoutEditSelection([id], [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
    ]);
    useProjectStore.getState().previewOrientSelection(45);
    expect(
      useProjectStore.getState().layoutEdit.draftPlacedEquipment
    ).not.toBeNull();

    useProjectStore.getState().clearLayoutEditSelection();

    const s = useProjectStore.getState();
    expect(s.layoutEdit.selectedIds).toEqual([]);
    expect(s.layoutEdit.selectionPolygon).toEqual([]);
    // Draft preserved per slice contract
    expect(s.layoutEdit.draftPlacedEquipment).not.toBeNull();
    expect(s.selectedEquipmentId).toBeNull();
  });
});

describe("layoutEditSlice — previewMoveSelection", () => {
  it("no-ops when no items are selected", () => {
    placeOne();
    useProjectStore.getState().startLayoutEdit();
    useProjectStore.getState().previewMoveSelection({ x_m: 10, y_m: 10 });
    expect(
      useProjectStore.getState().layoutEdit.draftPlacedEquipment
    ).toBeNull();
  });

  it("produces a draft when a selection exists", () => {
    const id = placeOne();
    useProjectStore.getState().startLayoutEdit();
    useProjectStore.getState().setLayoutEditSelection([id], []);
    useProjectStore.getState().previewMoveSelection({ x_m: 10, y_m: 0 });

    const draft = useProjectStore
      .getState()
      .layoutEdit.draftPlacedEquipment;
    expect(draft).not.toBeNull();
    expect(draft).toHaveLength(1);
  });
});

describe("layoutEditSlice — setSelectionLocked", () => {
  it("locks all selected equipment and records history", () => {
    const id = placeOne();
    useProjectStore.getState().startLayoutEdit();
    useProjectStore.getState().setLayoutEditSelection([id], []);
    const beforePast = useProjectStore.getState().past.length;

    useProjectStore.getState().setSelectionLocked(true);

    const item = useProjectStore
      .getState()
      .placedEquipment.find((x) => x.id === id);
    expect(item?.locked).toBe(true);
    expect(useProjectStore.getState().past.length).toBe(beforePast + 1);
  });

  it("no-ops when nothing is selected", () => {
    placeOne();
    useProjectStore.getState().startLayoutEdit();
    const before = useProjectStore.getState().placedEquipment;
    useProjectStore.getState().setSelectionLocked(true);
    expect(useProjectStore.getState().placedEquipment).toEqual(before);
  });
});

describe("layoutEditSlice — markLayoutEditValidated", () => {
  it("stamps a timestamp on lastValidationAt", () => {
    const id = placeOne();
    useProjectStore.getState().startLayoutEdit();
    useProjectStore.getState().setLayoutEditSelection([id], []);
    expect(useProjectStore.getState().layoutEdit.lastValidationAt).toBeNull();

    useProjectStore.getState().markLayoutEditValidated();
    const stamp = useProjectStore.getState().layoutEdit.lastValidationAt;
    expect(typeof stamp).toBe("string");
    expect(stamp).not.toBeNull();
  });
});
