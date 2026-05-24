import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";

const specId = equipmentCatalog[0].id;

function resetStore() {
  useProjectStore.setState({
    anchor: null,
    polygon: [],
    repairZone: [],
    previewTerrain: null,
    mapViewCenter: { lng: -70.6483, lat: -33.4569 },
    placedEquipment: [],
    interactionMode: "select",
    pendingPlacementSpecId: null,
    selectedEquipmentId: null,
    selectedCaseStudyId: null,
    lastToolResult: null,
    lastRepairResult: null,
    layoutEdit: {
      selectedIds: [],
      selectionPolygon: [],
      draftPlacedEquipment: null,
      lastValidationAt: null,
    },
    terrainFitPreview: {
      draftPlacedEquipment: null,
      result: null,
    },
    cableRoutes: [],
    accessRoads: [],
    fireSafetyZones: [],
    past: [],
    future: [],
  });
}

function place(count: number) {
  for (let index = 0; index < count; index++) {
    useProjectStore.getState().setPlacementSpec(specId);
    useProjectStore
      .getState()
      .placeEquipmentAt({ lng: -70 + index * 0.001, lat: -33 });
  }
}

describe("projectStore undo/redo", () => {
  beforeEach(resetStore);

  it("steps backward and forward through placement history", () => {
    place(2);
    expect(useProjectStore.getState().placedEquipment).toHaveLength(2);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(1);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(0);

    useProjectStore.getState().redo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(1);

    useProjectStore.getState().redo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(2);
  });

  it("remembers at most five undo steps", () => {
    place(7);
    expect(useProjectStore.getState().past).toHaveLength(5);
  });

  it("clears the redo stack when a new action happens", () => {
    place(2);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().future).toHaveLength(1);

    place(1);
    expect(useProjectStore.getState().future).toHaveLength(0);
    expect(useProjectStore.getState().placedEquipment).toHaveLength(2);
  });

  it("undo restores a layout cleared by reset", () => {
    place(1);
    useProjectStore.getState().resetProject();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(0);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(1);
  });

  it("undo and redo are no-ops when the stacks are empty", () => {
    useProjectStore.getState().undo();
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(0);
    expect(useProjectStore.getState().past).toHaveLength(0);
    expect(useProjectStore.getState().future).toHaveLength(0);
  });
});

describe("projectStore layout editing", () => {
  beforeEach(resetStore);

  it("previews selected rotations and reverts without mutating the confirmed layout", () => {
    place(2);
    const firstId = useProjectStore.getState().placedEquipment[0].id;

    useProjectStore.getState().startLayoutEdit();
    useProjectStore.getState().setLayoutEditSelection([firstId], [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ]);
    useProjectStore.getState().previewRotateSelection(90);

    expect(useProjectStore.getState().placedEquipment[0].rotation_deg).toBe(0);
    expect(
      useProjectStore
        .getState()
        .layoutEdit.draftPlacedEquipment?.find((item) => item.id === firstId)
        ?.rotation_deg
    ).toBe(90);

    useProjectStore.getState().revertLayoutEdit();
    expect(useProjectStore.getState().layoutEdit.draftPlacedEquipment).toBeNull();
    expect(useProjectStore.getState().placedEquipment[0].rotation_deg).toBe(0);
  });

  it("applies layout edits as one undoable project change", () => {
    place(1);
    const firstId = useProjectStore.getState().placedEquipment[0].id;

    useProjectStore.getState().startLayoutEdit();
    useProjectStore.getState().setLayoutEditSelection([firstId], []);
    useProjectStore.getState().previewOrientSelection(90);
    useProjectStore.getState().applyLayoutEdit();

    expect(useProjectStore.getState().placedEquipment[0].rotation_deg).toBe(90);
    expect(useProjectStore.getState().layoutEdit.draftPlacedEquipment).toBeNull();

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment[0].rotation_deg).toBe(0);
  });
});

describe("projectStore terrain fit preview", () => {
  beforeEach(resetStore);

  it("previews, applies and undoes a terrain fit adjustment", () => {
    place(2);
    useProjectStore.setState({
      polygon: [
        { lng: -70.001, lat: -33.001 },
        { lng: -69.999, lat: -33.001 },
        { lng: -69.999, lat: -32.999 },
        { lng: -70.001, lat: -32.999 },
      ],
    });
    const originalAnchor = useProjectStore.getState().placedEquipment[0].anchor;

    useProjectStore.getState().previewFitLayoutToTerrain({
      bessToBess_m: 3,
      bessToPropertyLine_m: 3,
      electricalFrontWorkingClearance_m: 0.9,
    });

    expect(useProjectStore.getState().terrainFitPreview.draftPlacedEquipment).not.toBeNull();
    expect(useProjectStore.getState().placedEquipment[0].anchor).toEqual(originalAnchor);

    useProjectStore.getState().applyTerrainFitPreview();
    expect(useProjectStore.getState().terrainFitPreview.draftPlacedEquipment).toBeNull();
    expect(useProjectStore.getState().placedEquipment[0].anchor).not.toEqual(originalAnchor);

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment[0].anchor).toEqual(originalAnchor);
  });

  it("can discard a terrain fit preview without changing equipment", () => {
    place(1);
    useProjectStore.setState({
      polygon: [
        { lng: -70.001, lat: -33.001 },
        { lng: -69.999, lat: -33.001 },
        { lng: -69.999, lat: -32.999 },
        { lng: -70.001, lat: -32.999 },
      ],
    });
    const originalAnchor = useProjectStore.getState().placedEquipment[0].anchor;

    useProjectStore.getState().previewFitLayoutToTerrain({
      bessToBess_m: 3,
      bessToPropertyLine_m: 3,
      electricalFrontWorkingClearance_m: 0.9,
    });
    useProjectStore.getState().revertTerrainFitPreview();

    expect(useProjectStore.getState().terrainFitPreview.draftPlacedEquipment).toBeNull();
    expect(useProjectStore.getState().placedEquipment[0].anchor).toEqual(originalAnchor);
  });
});

describe("projectStore parametric terrain preview", () => {
  beforeEach(resetStore);

  it("previews, applies and undoes a parametric terrain", () => {
    useProjectStore.getState().setMapViewCenter({ lng: -70, lat: -33 });
    useProjectStore.getState().createPreviewTerrain({
      shape: "rectangle",
      sizingMode: "dimensions",
      areaHa: 5,
      lengthM: 400,
      widthM: 150,
      aspectRatio: 2,
      vertexCount: 4,
      rotationDeg: 0,
    });

    expect(useProjectStore.getState().previewTerrain?.polygon).toHaveLength(4);
    expect(useProjectStore.getState().polygon).toHaveLength(0);

    useProjectStore.getState().applyPreviewTerrain();
    expect(useProjectStore.getState().previewTerrain).toBeNull();
    expect(useProjectStore.getState().polygon).toHaveLength(4);
    expect(useProjectStore.getState().anchor).toEqual({ lng0: -70, lat0: -33 });

    useProjectStore.getState().undo();
    expect(useProjectStore.getState().polygon).toHaveLength(0);
  });

  it("can move and cancel the parametric terrain preview", () => {
    useProjectStore.getState().setMapViewCenter({ lng: -70, lat: -33 });
    useProjectStore.getState().createPreviewTerrain({
      shape: "square",
      sizingMode: "area-ratio",
      areaHa: 4,
      lengthM: 100,
      widthM: 100,
      aspectRatio: 1,
      vertexCount: 4,
      rotationDeg: 0,
    });
    const initialCenter = useProjectStore.getState().previewTerrain?.center;

    useProjectStore.getState().movePreviewTerrainBy({ x_m: 100, y_m: 0 });
    expect(useProjectStore.getState().previewTerrain?.center).not.toEqual(
      initialCenter
    );

    useProjectStore.getState().cancelPreviewTerrain();
    expect(useProjectStore.getState().previewTerrain).toBeNull();
    expect(useProjectStore.getState().polygon).toHaveLength(0);
  });

  it("updates preview rotation without drifting terrain dimensions", () => {
    useProjectStore.getState().setMapViewCenter({ lng: -70, lat: -33 });
    useProjectStore.getState().createPreviewTerrain({
      shape: "rectangle",
      sizingMode: "area-ratio",
      areaHa: 5,
      lengthM: 316,
      widthM: 158,
      aspectRatio: 2,
      vertexCount: 4,
      rotationDeg: 0,
    });

    const initial = useProjectStore.getState().previewTerrain;
    useProjectStore.getState().updatePreviewTerrain({ rotationDeg: 25 });
    useProjectStore.getState().updatePreviewTerrain({ rotationDeg: 90 });
    useProjectStore.getState().updatePreviewTerrain({ rotationDeg: 157 });
    const rotated = useProjectStore.getState().previewTerrain;

    expect(rotated?.lengthM).toBeCloseTo(initial?.lengthM ?? 0, 6);
    expect(rotated?.widthM).toBeCloseTo(initial?.widthM ?? 0, 6);
    expect(rotated?.areaM2).toBeCloseTo(initial?.areaM2 ?? 0, 6);
    expect(rotated?.rotationDeg).toBe(157);
  });
});
