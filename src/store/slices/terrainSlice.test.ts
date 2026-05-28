/**
 * Phase 14.2 — terrainSlice (gap tests).
 *
 * `projectStore.test.ts` already covers the parametric-terrain and
 * terrain-fit preview lifecycles end-to-end. These tests pin smaller
 * branches not yet exercised:
 *   - updatePreviewTerrain no-ops when there is no preview
 *   - movePreviewTerrainBy no-ops when there is no preview
 *   - cancelPreviewTerrain after explicit creation
 *   - applyPreviewTerrain no-ops when there is no preview
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { resetProjectStore } from "./_testHelpers";

beforeEach(resetProjectStore);

describe("terrainSlice — guards when no preview exists", () => {
  it("updatePreviewTerrain is a no-op", () => {
    useProjectStore.getState().updatePreviewTerrain({ rotationDeg: 33 });
    expect(useProjectStore.getState().previewTerrain).toBeNull();
  });

  it("movePreviewTerrainBy is a no-op", () => {
    useProjectStore.getState().movePreviewTerrainBy({ x_m: 5, y_m: 5 });
    expect(useProjectStore.getState().previewTerrain).toBeNull();
  });

  it("applyPreviewTerrain is a no-op", () => {
    const before = useProjectStore.getState();
    useProjectStore.getState().applyPreviewTerrain();
    const after = useProjectStore.getState();
    expect(after.polygon).toEqual(before.polygon);
    expect(after.anchor).toEqual(before.anchor);
  });
});

describe("terrainSlice — cancelPreviewTerrain", () => {
  it("nulls the preview without affecting anchor/polygon", () => {
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
    expect(useProjectStore.getState().previewTerrain).not.toBeNull();

    useProjectStore.getState().cancelPreviewTerrain();

    const s = useProjectStore.getState();
    expect(s.previewTerrain).toBeNull();
    expect(s.polygon).toEqual([]);
    expect(s.anchor).toBeNull();
  });
});

describe("terrainSlice — createPreviewTerrain center resolution", () => {
  it("uses the explicit center when provided", () => {
    useProjectStore.getState().createPreviewTerrain({
      shape: "square",
      sizingMode: "area-ratio",
      areaHa: 1,
      lengthM: 100,
      widthM: 100,
      aspectRatio: 1,
      vertexCount: 4,
      rotationDeg: 0,
      center: { lng: 10, lat: 20 },
    });
    const preview = useProjectStore.getState().previewTerrain;
    expect(preview?.center).toEqual({ lng: 10, lat: 20 });
  });
});
