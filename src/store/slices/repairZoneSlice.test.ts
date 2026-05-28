/**
 * Phase 14.2 — repairZoneSlice.
 *
 * Covers the full repair-zone draw lifecycle, which had ~14% coverage
 * pre-Phase 14: start, add vertices, finish, clear, plus the conditional
 * mode-reset in clearRepairZone.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { resetProjectStore } from "./_testHelpers";

beforeEach(resetProjectStore);

describe("repairZoneSlice — startDrawingRepairZone", () => {
  it("enters draw-repair-zone mode and resets ephemeral state", () => {
    // Pre-condition: stash some ephemeral state to assert reset.
    useProjectStore.setState({ previewTerrain: null });
    useProjectStore.getState().startDrawingRepairZone();

    const s = useProjectStore.getState();
    expect(s.interactionMode).toBe("draw-repair-zone");
    expect(s.repairZone).toEqual([]);
    expect(s.previewTerrain).toBeNull();
    expect(s.layoutEdit.selectedIds).toEqual([]);
    expect(s.terrainFitPreview.draftPlacedEquipment).toBeNull();
  });
});

describe("repairZoneSlice — addRepairZoneVertex", () => {
  it("appends vertices in order", () => {
    useProjectStore.getState().startDrawingRepairZone();
    useProjectStore.getState().addRepairZoneVertex({ lng: -70.1, lat: -33.1 });
    useProjectStore.getState().addRepairZoneVertex({ lng: -70.2, lat: -33.2 });

    expect(useProjectStore.getState().repairZone).toEqual([
      { lng: -70.1, lat: -33.1 },
      { lng: -70.2, lat: -33.2 },
    ]);
  });
});

describe("repairZoneSlice — finishRepairZone", () => {
  it("returns to select mode without clearing the polygon", () => {
    useProjectStore.getState().startDrawingRepairZone();
    useProjectStore.getState().addRepairZoneVertex({ lng: -70.1, lat: -33.1 });
    useProjectStore.getState().finishRepairZone();

    const s = useProjectStore.getState();
    expect(s.interactionMode).toBe("select");
    expect(s.repairZone).toHaveLength(1);
  });
});

describe("repairZoneSlice — clearRepairZone", () => {
  it("clears the polygon and exits draw-repair-zone mode when active", () => {
    useProjectStore.getState().startDrawingRepairZone();
    useProjectStore.getState().addRepairZoneVertex({ lng: -70.1, lat: -33.1 });

    useProjectStore.getState().clearRepairZone();

    const s = useProjectStore.getState();
    expect(s.repairZone).toEqual([]);
    expect(s.interactionMode).toBe("select");
  });

  it("preserves a non-draw-repair-zone interaction mode", () => {
    useProjectStore.setState({
      repairZone: [{ lng: 1, lat: 2 }],
      interactionMode: "edit-layout",
    });
    useProjectStore.getState().clearRepairZone();

    const s = useProjectStore.getState();
    expect(s.repairZone).toEqual([]);
    expect(s.interactionMode).toBe("edit-layout");
  });
});
