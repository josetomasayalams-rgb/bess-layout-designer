import { describe, expect, it } from "vitest";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import {
  moveSelectedEquipment,
  normalizeRotation,
  orientSelectedEquipment,
  rotateSelectedEquipment,
  setEquipmentLock,
  selectionRectangle,
  selectEquipmentWithinPolygon,
  selectEquipmentWithinRectangle,
} from "@/lib/layout/layoutEditing";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";

const spec = equipmentCatalog[0];
const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };

function placed(id: string, lng: number, lat: number, rotationDeg = 0): PlacedEquipment {
  return {
    id,
    equipmentSpecId: spec.id,
    anchor: { lng, lat },
    rotation_deg: rotationDeg,
    sourceReliability: spec.source.reliability,
  };
}

describe("layout editing utilities", () => {
  it("normalizes rotations to a positive 0-359 degree range", () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
  });

  it("rotates and orients only selected equipment", () => {
    const source = [placed("a", -70, -33, 350), placed("b", -70.01, -33, 15)];
    const rotated = rotateSelectedEquipment(source, ["a"], 20);
    expect(rotated.find((item) => item.id === "a")?.rotation_deg).toBe(10);
    expect(rotated.find((item) => item.id === "b")?.rotation_deg).toBe(15);

    const oriented = orientSelectedEquipment(rotated, ["a"], 90);
    expect(oriented.find((item) => item.id === "a")?.rotation_deg).toBe(90);
    expect(oriented.find((item) => item.id === "b")?.rotation_deg).toBe(15);
  });

  it("selects equipment whose center or footprint falls inside the rectangle", () => {
    const rectangle = selectionRectangle(
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -32.999 }
    );
    const selected = selectEquipmentWithinRectangle({
      placed: [
        placed("inside", -70, -33),
        placed("outside", -70.1, -33.1),
      ],
      anchor,
      rectangle,
    });

    expect(selected).toEqual(["inside"]);
  });

  it("selects equipment inside a point-defined polygon", () => {
    const polygon = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    const selected = selectEquipmentWithinPolygon({
      placed: [
        placed("inside", -70, -33),
        placed("outside", -70.1, -33.1),
      ],
      anchor,
      polygon,
    });

    expect(selected).toEqual(["inside"]);
  });

  it("locks selected equipment and skips locked items when editing", () => {
    const source = [placed("a", -70, -33, 0), placed("b", -70.01, -33, 0)];
    const locked = setEquipmentLock(source, ["a"], true);
    expect(locked.find((item) => item.id === "a")?.locked).toBe(true);
    expect(locked.find((item) => item.id === "b")?.locked).toBeUndefined();

    const rotated = rotateSelectedEquipment(locked, ["a", "b"], 90);
    expect(rotated.find((item) => item.id === "a")?.rotation_deg).toBe(0);
    expect(rotated.find((item) => item.id === "b")?.rotation_deg).toBe(90);

    const oriented = orientSelectedEquipment(locked, ["a", "b"], 90);
    expect(oriented.find((item) => item.id === "a")?.rotation_deg).toBe(0);
    expect(oriented.find((item) => item.id === "b")?.rotation_deg).toBe(90);
  });

  it("moves selected equipment but leaves locked ones in place", () => {
    const locked = setEquipmentLock(
      [placed("a", -70, -33, 0), placed("b", -70, -33, 0)],
      ["a"],
      true
    );
    const moved = moveSelectedEquipment(locked, ["a", "b"], anchor, {
      x_m: 50,
      y_m: 0,
    });
    expect(moved.find((item) => item.id === "a")?.anchor).toEqual({
      lng: -70,
      lat: -33,
    });
    const movedB = moved.find((item) => item.id === "b")!;
    expect(movedB.anchor.lng).toBeGreaterThan(-70);
  });
});
