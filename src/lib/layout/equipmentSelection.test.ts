import { describe, expect, it } from "vitest";
import {
  equipmentIdsInRect,
  normalizeRect,
  rectHasArea,
  selectionValidation,
} from "@/lib/layout/equipmentSelection";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLngLat } from "@/lib/geometry/projection";
import type { ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

const anchor: ProjectAnchor = { lng0: -70.6, lat0: -33.45 };

const batterySpec = equipmentCatalog.find(
  (s) => s.type === "battery_container"
);
const pcsSpec = equipmentCatalog.find((s) => s.type === "pcs_mv_station");
if (!batterySpec || !pcsSpec) {
  throw new Error("Test fixture: missing catalog specs");
}

function item(
  id: string,
  specId: string,
  xM: number,
  yM: number
): PlacedEquipment {
  return {
    id,
    equipmentSpecId: specId,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
  };
}

describe("normalizeRect", () => {
  it("orders the corners regardless of drag direction", () => {
    const rect = normalizeRect({ lng: 5, lat: 9 }, { lng: 1, lat: 2 });
    expect(rect).toEqual({ minLng: 1, maxLng: 5, minLat: 2, maxLat: 9 });
    expect(rectHasArea(rect)).toBe(true);
  });

  it("reports no area for a degenerate rectangle (a plain click)", () => {
    const rect = normalizeRect({ lng: 1, lat: 1 }, { lng: 1, lat: 1 });
    expect(rectHasArea(rect)).toBe(false);
  });
});

describe("equipmentIdsInRect", () => {
  it("selects equipment whose center is inside the rectangle", () => {
    const placed = [
      item("a", batterySpec!.id, 0, 0),
      item("b", batterySpec!.id, 200, 0),
      item("p", pcsSpec!.id, 10, 10),
    ];
    const rect = normalizeRect(
      toLngLat({ x_m: -20, y_m: -20 }, anchor),
      toLngLat({ x_m: 30, y_m: 30 }, anchor)
    );
    expect(equipmentIdsInRect(placed, rect, "all").sort()).toEqual(["a", "p"]);
  });

  it("honours the equipment type filter", () => {
    const placed = [
      item("a", batterySpec!.id, 0, 0),
      item("p", pcsSpec!.id, 10, 10),
    ];
    const rect = normalizeRect(
      toLngLat({ x_m: -20, y_m: -20 }, anchor),
      toLngLat({ x_m: 30, y_m: 30 }, anchor)
    );
    expect(equipmentIdsInRect(placed, rect, "battery_container")).toEqual([
      "a",
    ]);
    expect(equipmentIdsInRect(placed, rect, "pcs_mv_station")).toEqual(["p"]);
  });
});

describe("selectionValidation", () => {
  it("flags a collision that involves a selected item", () => {
    const placed = [
      item("a", batterySpec!.id, 0, 0),
      item("b", batterySpec!.id, 1, 0),
    ];
    const result = selectionValidation(placed, new Set(["a"]), [], anchor, 3);
    expect(result.collisionCount).toBe(1);
    expect(result.status).toBe("error");
  });

  it("flags insufficient clearance as a warning", () => {
    const placed = [
      item("a", batterySpec!.id, 0, 0),
      item("b", batterySpec!.id, 0, 3),
    ];
    const result = selectionValidation(placed, new Set(["a"]), [], anchor, 3);
    expect(result.collisionCount).toBe(0);
    expect(result.tooCloseCount).toBe(1);
    expect(result.status).toBe("warn");
  });

  it("reports ok when the selection is well separated", () => {
    const placed = [
      item("a", batterySpec!.id, 0, 0),
      item("b", batterySpec!.id, 0, 40),
    ];
    const result = selectionValidation(
      placed,
      new Set(["a", "b"]),
      [],
      anchor,
      3
    );
    expect(result.status).toBe("ok");
    expect(result.collisionCount).toBe(0);
    expect(result.tooCloseCount).toBe(0);
  });

  it("is a no-op without an anchor or selection", () => {
    const placed = [item("a", batterySpec!.id, 0, 0)];
    expect(selectionValidation(placed, new Set(), [], anchor, 3).status).toBe(
      "ok"
    );
    expect(
      selectionValidation(placed, new Set(["a"]), [], null, 3).status
    ).toBe("ok");
  });
});
