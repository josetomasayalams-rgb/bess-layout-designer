import { describe, expect, it } from "vitest";
import { is3DCapable, type EquipmentSpec } from "@/data/equipmentCatalog";

function spec(over: Partial<EquipmentSpec>): EquipmentSpec {
  return {
    id: "x",
    type: "battery_container",
    manufacturer: "Foo",
    model: "M",
    label: "L",
    footprint: { length_m: 1, width_m: 1 },
    source: { reliability: "preliminary_assumption", title: "", notes: "" },
    ...over,
  };
}

describe("is3DCapable", () => {
  it("is false without a height value", () => {
    expect(is3DCapable(spec({ manufacturer: "Sungrow" }))).toBe(false);
  });

  it("auto-enables Sungrow specs that ship with a datasheet height", () => {
    expect(
      is3DCapable(
        spec({
          manufacturer: "Sungrow",
          footprint: { length_m: 9.34, width_m: 1.73, height_m: 2.6 },
        })
      )
    ).toBe(true);
  });

  it("stays disabled for non-Sungrow specs without an explicit opt-in", () => {
    expect(
      is3DCapable(
        spec({
          manufacturer: "Tesla",
          footprint: { length_m: 6, width_m: 2, height_m: 2.5 },
        })
      )
    ).toBe(false);
  });

  it("honours an explicit has3DModel for any manufacturer", () => {
    expect(
      is3DCapable(
        spec({
          manufacturer: "Tesla",
          has3DModel: true,
          footprint: { length_m: 6, width_m: 2, height_m: 2.5 },
        })
      )
    ).toBe(true);
  });
});
