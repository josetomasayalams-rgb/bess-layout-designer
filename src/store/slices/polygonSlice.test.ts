/**
 * Phase 14.2 — polygonSlice.
 *
 * Focused tests for actions not exercised by `projectStore.test.ts`:
 * addPolygonVertex (with implicit anchor capture), finishPolygon
 * (mode reset), clearPolygon (cross-slice reset + history), and
 * setMapViewCenter.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { resetProjectStore } from "./_testHelpers";

beforeEach(resetProjectStore);

describe("polygonSlice — addPolygonVertex", () => {
  it("captures the first vertex as the project anchor", () => {
    useProjectStore.getState().addPolygonVertex({ lng: -70.1, lat: -33.1 });
    expect(useProjectStore.getState().anchor).toEqual({
      lng0: -70.1,
      lat0: -33.1,
    });
  });

  it("does not reset the anchor when adding subsequent vertices", () => {
    useProjectStore.getState().addPolygonVertex({ lng: -70.1, lat: -33.1 });
    useProjectStore.getState().addPolygonVertex({ lng: -70.2, lat: -33.2 });
    expect(useProjectStore.getState().anchor).toEqual({
      lng0: -70.1,
      lat0: -33.1,
    });
    expect(useProjectStore.getState().polygon).toHaveLength(2);
  });
});

describe("polygonSlice — startDrawingPolygon", () => {
  it("clears polygon + anchor + ephemeral state and enters draw-site mode", () => {
    useProjectStore.getState().addPolygonVertex({ lng: -70.1, lat: -33.1 });
    useProjectStore.getState().addPolygonVertex({ lng: -70.2, lat: -33.2 });

    useProjectStore.getState().startDrawingPolygon();

    const s = useProjectStore.getState();
    expect(s.interactionMode).toBe("draw-site");
    expect(s.polygon).toEqual([]);
    expect(s.anchor).toBeNull();
    expect(s.previewTerrain).toBeNull();
  });
});

describe("polygonSlice — finishPolygon", () => {
  it("switches interaction mode back to 'select'", () => {
    useProjectStore.getState().startDrawingPolygon();
    expect(useProjectStore.getState().interactionMode).toBe("draw-site");
    useProjectStore.getState().finishPolygon();
    expect(useProjectStore.getState().interactionMode).toBe("select");
  });
});

describe("polygonSlice — clearPolygon", () => {
  it("clears the polygon and records history", () => {
    useProjectStore.getState().addPolygonVertex({ lng: -70.1, lat: -33.1 });
    useProjectStore.getState().addPolygonVertex({ lng: -70.2, lat: -33.2 });

    useProjectStore.getState().clearPolygon();

    const s = useProjectStore.getState();
    expect(s.polygon).toEqual([]);
    expect(s.interactionMode).toBe("select");
    expect(s.past).toHaveLength(1);
  });
});

describe("polygonSlice — setMapViewCenter", () => {
  it("only updates mapViewCenter", () => {
    const before = useProjectStore.getState();
    useProjectStore.getState().setMapViewCenter({ lng: 10, lat: 20 });
    const after = useProjectStore.getState();
    expect(after.mapViewCenter).toEqual({ lng: 10, lat: 20 });
    expect(after.polygon).toEqual(before.polygon);
    expect(after.anchor).toEqual(before.anchor);
  });
});
