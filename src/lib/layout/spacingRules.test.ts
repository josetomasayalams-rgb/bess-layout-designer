import { describe, expect, it } from "vitest";
import { computeWarnings } from "@/lib/layout/spacingRules";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";
import { toLngLat } from "@/lib/geometry/projection";

const anchor: ProjectAnchor = { lng0: -70, lat0: -23 };

function equipment(id: string, x_m: number, y_m: number): PlacedEquipment {
  return {
    id,
    equipmentSpecId: "sungrow-st2752ux-us",
    anchor: toLngLat({ x_m, y_m }, anchor),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  };
}

describe("computeWarnings categories", () => {
  it("tags assumption and physical warnings", () => {
    const warnings = computeWarnings([], [], null);
    expect(warnings.find((warning) => warning.id === "preliminary-assumptions-in-use")?.category)
      .toBe("assumption");
  });

  it("tags geometry and collision warnings", () => {
    const polygon = [
      toLngLat({ x_m: -5, y_m: -5 }, anchor),
      toLngLat({ x_m: 5, y_m: -5 }, anchor),
      toLngLat({ x_m: 5, y_m: 5 }, anchor),
      toLngLat({ x_m: -5, y_m: 5 }, anchor),
    ];
    const warnings = computeWarnings(
      [equipment("a", 20, 0), equipment("b", 20, 0)],
      polygon,
      anchor
    );

    expect(warnings.some((warning) => warning.category === "geometry")).toBe(true);
    expect(warnings.some((warning) => warning.category === "collision")).toBe(true);
  });
});
