/**
 * Phase 14.2 — lifecycleSlice.
 *
 * Covers setMode, loadDemoProject and resetProject. Undo/redo is
 * already pinned by `projectStore.test.ts` and the contract test.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { resetProjectStore } from "./_testHelpers";

beforeEach(resetProjectStore);

describe("lifecycleSlice — setMode", () => {
  it("switches interaction mode", () => {
    useProjectStore.getState().setMode("draw-site");
    expect(useProjectStore.getState().interactionMode).toBe("draw-site");
    useProjectStore.getState().setMode("edit-layout");
    expect(useProjectStore.getState().interactionMode).toBe("edit-layout");
  });

  it("drops pendingPlacementSpecId when leaving place-equipment mode", () => {
    useProjectStore.setState({
      pendingPlacementSpecId: "anything",
      interactionMode: "place-equipment",
    });
    useProjectStore.getState().setMode("select");
    expect(useProjectStore.getState().pendingPlacementSpecId).toBeNull();
  });
});

describe("lifecycleSlice — loadDemoProject", () => {
  it("populates the polygon, anchor and at least one equipment", () => {
    useProjectStore.getState().loadDemoProject();
    const s = useProjectStore.getState();
    expect(s.polygon.length).toBeGreaterThan(0);
    expect(s.anchor).not.toBeNull();
    expect(s.placedEquipment.length).toBeGreaterThan(0);
  });

  it("records history so the demo can be undone", () => {
    useProjectStore.getState().loadDemoProject();
    expect(useProjectStore.getState().past.length).toBeGreaterThan(0);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment).toEqual([]);
  });
});

describe("lifecycleSlice — resetProject", () => {
  it("clears placed equipment, polygon and anchor", () => {
    useProjectStore.getState().loadDemoProject();
    expect(useProjectStore.getState().placedEquipment.length).toBeGreaterThan(0);

    useProjectStore.getState().resetProject();

    const s = useProjectStore.getState();
    expect(s.placedEquipment).toEqual([]);
    expect(s.polygon).toEqual([]);
    expect(s.anchor).toBeNull();
    expect(s.interactionMode).toBe("select");
  });
});
