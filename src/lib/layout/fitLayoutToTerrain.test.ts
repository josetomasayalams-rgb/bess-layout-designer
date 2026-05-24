import { describe, expect, it } from "vitest";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { fitLayoutToTerrain } from "@/lib/layout/fitLayoutToTerrain";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import type { LayoutRepairRules } from "@/lib/layout/layoutRepair";
import type { PlacedEquipment } from "@/types/equipment";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";

const spec = equipmentCatalog[0];
const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };
const rules: LayoutRepairRules = {
  bessToBess_m: 3,
  bessToPropertyLine_m: 3,
  electricalFrontWorkingClearance_m: 0.9,
};

function lngLat(point: LocalPoint) {
  return toLngLat(point, anchor);
}

function equipment(id: string, point: LocalPoint): PlacedEquipment {
  return {
    id,
    equipmentSpecId: spec.id,
    anchor: lngLat(point),
    rotation_deg: 0,
    sourceReliability: spec.source.reliability,
  };
}

describe("fitLayoutToTerrain", () => {
  it("reorders and centers a layout to match the terrain axis", () => {
    const polygon = [
      lngLat({ x_m: -45, y_m: -170 }),
      lngLat({ x_m: 45, y_m: -170 }),
      lngLat({ x_m: 45, y_m: 170 }),
      lngLat({ x_m: -45, y_m: 170 }),
    ];
    const placed = [
      equipment("a", { x_m: 60, y_m: 80 }),
      equipment("b", { x_m: 180, y_m: 80 }),
    ];
    const result = fitLayoutToTerrain({ placed, anchor, polygon, rules });
    const nextA = toLocal(result.placed[0].anchor, anchor);
    const nextB = toLocal(result.placed[1].anchor, anchor);
    const nextDistance = Math.hypot(
      nextA.x_m - nextB.x_m,
      nextA.y_m - nextB.y_m
    );

    expect(result.status).not.toBe("error");
    expect(result.selected).not.toBeNull();
    expect(result.diagnostics.insideCount).toBe(2);
    expect(Math.abs(result.selected?.rotationDeltaDeg ?? 0)).toBe(90);
    expect(nextDistance).toBeGreaterThan(spec.footprint.width_m);
    expect(nextDistance).toBeLessThan(30);
    expect((nextA.x_m + nextB.x_m) / 2).toBeCloseTo(0, 6);
    expect((nextA.y_m + nextB.y_m) / 2).toBeCloseTo(0, 6);
  });

  it("keeps locked equipment fixed and reports the locked count", () => {
    const polygon = [
      lngLat({ x_m: -40, y_m: -40 }),
      lngLat({ x_m: 40, y_m: -40 }),
      lngLat({ x_m: 40, y_m: 40 }),
      lngLat({ x_m: -40, y_m: 40 }),
    ];
    const locked = {
      ...equipment("locked", { x_m: 0, y_m: 0 }),
      locked: true,
    };
    const placed = [locked, equipment("moving", { x_m: 120, y_m: 0 })];

    const result = fitLayoutToTerrain({ placed, anchor, polygon, rules });

    expect(result.status).not.toBe("error");
    expect(result.placed.find((item) => item.id === "locked")?.anchor).toEqual(
      locked.anchor
    );
    expect(result.diagnostics.lockedCount).toBe(1);
  });

  it("generates conceptual cable routes when a station is part of the repaired layout", () => {
    const stationSpec = equipmentCatalog.find((entry) => entry.type === "pcs_mv_station");
    expect(stationSpec).toBeDefined();
    const polygon = [
      lngLat({ x_m: -120, y_m: -120 }),
      lngLat({ x_m: 220, y_m: -120 }),
      lngLat({ x_m: 220, y_m: 120 }),
      lngLat({ x_m: -120, y_m: 120 }),
    ];
    const placed = [
      equipment("bess-a", { x_m: 160, y_m: 60 }),
      {
        id: "station-a",
        equipmentSpecId: stationSpec!.id,
        anchor: lngLat({ x_m: 180, y_m: 60 }),
        rotation_deg: 0,
        groupId: "block-a",
        sourceReliability: stationSpec!.source.reliability,
      },
    ];

    const result = fitLayoutToTerrain({ placed, anchor, polygon, rules, poiExists: true });

    expect(result.status).not.toBe("error");
    expect(result.cableRoutes.length).toBeGreaterThan(0);
    expect(result.diagnostics.cableRouteCount).toBe(result.cableRoutes.length);
    expect(result.diagnostics.poiHandled).toBe(true);
  });

  it("keeps large BESS layouts bounded to a small candidate set", () => {
    const stationSpec = equipmentCatalog.find((entry) => entry.type === "pcs_mv_station");
    expect(stationSpec).toBeDefined();
    const polygon = [
      lngLat({ x_m: -420, y_m: -260 }),
      lngLat({ x_m: 420, y_m: -260 }),
      lngLat({ x_m: 420, y_m: 260 }),
      lngLat({ x_m: -420, y_m: 260 }),
    ];
    const placed: PlacedEquipment[] = [];
    for (let block = 0; block < 40; block++) {
      const x = (block % 10) * 42 + 500;
      const y = Math.floor(block / 10) * 28 + 300;
      for (let index = 0; index < 8; index++) {
        placed.push({
          ...equipment(`bess-${block}-${index}`, {
            x_m: x + index * 12,
            y_m: y,
          }),
          groupId: `block-${block}`,
        });
      }
      placed.push({
        id: `station-${block}`,
        equipmentSpecId: stationSpec!.id,
        anchor: lngLat({ x_m: x + 115, y_m: y }),
        rotation_deg: 0,
        groupId: `block-${block}`,
        sourceReliability: stationSpec!.source.reliability,
      });
    }

    const result = fitLayoutToTerrain({ placed, anchor, polygon, rules, poiExists: true });

    expect(result.status).not.toBe("error");
    expect(result.placed).toHaveLength(360);
    expect(result.candidates.length).toBeLessThanOrEqual(432);
    expect(result.diagnostics.cableRouteCount).toBeGreaterThan(0);
  });

  it("returns an error when there is no terrain polygon", () => {
    const result = fitLayoutToTerrain({
      placed: [equipment("a", { x_m: 0, y_m: 0 })],
      anchor,
      polygon: [],
      rules,
    });

    expect(result.status).toBe("error");
    expect(result.placed).toHaveLength(1);
  });
});
