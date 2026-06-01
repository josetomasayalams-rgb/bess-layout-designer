import { describe, expect, it } from "vitest";
import { buildSmartSiteFitPreview } from "./smartSiteFitPreview";
import type { SmartSiteFitCandidate } from "./smartSiteFitTypes";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };

const bess = (id: string, lng: number, lat: number, rotation = 0): PlacedEquipment => ({
  id,
  equipmentSpecId: "sungrow-st2752ux-us",
  anchor: { lng, lat },
  rotation_deg: rotation,
  sourceReliability: "preliminary_assumption",
});

const pcs = (id: string, lng: number, lat: number, rotation = 0): PlacedEquipment => ({
  id,
  equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
  anchor: { lng, lat },
  rotation_deg: rotation,
  sourceReliability: "preliminary_assumption",
});

const candidateOf = (placed: PlacedEquipment[]): SmartSiteFitCandidate => ({
  id: "c",
  strategy: "balanced",
  placedEquipment: placed,
  score: {
    total: 0,
    insidePolygon: 0,
    noCollisions: 0,
    boundaryMargin: 0,
    siteUtilization: 0,
    rowRegularity: 0,
    corridorEfficiency: 0,
    ratioCompliance: 0,
  },
  warnings: [],
  assumptions: [],
});

describe("buildSmartSiteFitPreview", () => {
  it("returns an empty framed preview for a candidate with no equipment", () => {
    const preview = buildSmartSiteFitPreview(candidateOf([]));
    expect(preview.blocks).toEqual([]);
    expect(preview.itemCount).toBe(0);
    expect(preview.simplified).toBe(false);
    expect(preview.width).toBeGreaterThan(0);
    expect(preview.height).toBeGreaterThan(0);
  });

  it("projects one block per item, classified by architecture, within the viewbox", () => {
    const preview = buildSmartSiteFitPreview(
      candidateOf([bess("b1", -70, -33), pcs("p1", -69.9995, -33)]),
      { anchor, viewSize: 100 }
    );

    expect(preview.itemCount).toBe(2);
    expect(preview.simplified).toBe(false);
    expect(preview.blocks).toHaveLength(2);

    const kinds = preview.blocks.map((b) => b.kind).sort();
    expect(kinds).toEqual(["bess", "pcs"]);

    // The longer axis equals viewSize; aspect is preserved.
    expect(Math.max(preview.width, preview.height)).toBeCloseTo(100, 5);

    // Every block sits inside the normalized frame.
    for (const b of preview.blocks) {
      expect(b.x).toBeGreaterThanOrEqual(-1e-6);
      expect(b.y).toBeGreaterThanOrEqual(-1e-6);
      expect(b.x + b.w).toBeLessThanOrEqual(preview.width + 1e-6);
      expect(b.y + b.h).toBeLessThanOrEqual(preview.height + 1e-6);
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
    }
  });

  it("renders geographic north upward (smaller y for the northern item)", () => {
    // b-north has the higher latitude; after the Y flip it must render above.
    const preview = buildSmartSiteFitPreview(
      candidateOf([bess("b-north", -70, -32.999), bess("b-south", -70, -33.001)]),
      { anchor }
    );

    const north = preview.blocks[0];
    const south = preview.blocks[1];
    expect(north.y).toBeLessThan(south.y);
  });

  it("includes the site outline when a polygon is supplied", () => {
    const polygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    const preview = buildSmartSiteFitPreview(candidateOf([bess("b1", -70, -33)]), {
      polygon,
      anchor,
    });

    expect(preview.site).toBeDefined();
    expect(preview.site?.points).toHaveLength(polygon.length);
    // The site frame contains the equipment block.
    for (const b of preview.blocks) {
      expect(b.x).toBeGreaterThanOrEqual(-1e-6);
      expect(b.x + b.w).toBeLessThanOrEqual(preview.width + 1e-6);
    }
  });

  it("aggregates into a bounded, reduced grid when the item count exceeds maxBlocks", () => {
    // 200 containers packed densely (sub-meter steps) so many share grid cells,
    // plus one offset PCS. Capped at maxBlocks = 50 to force the heavy path.
    const placed: PlacedEquipment[] = [];
    for (let i = 0; i < 200; i++) {
      const lng = -70 + (i % 20) * 0.000002; // ~0.22 m steps
      const lat = -33 + Math.floor(i / 20) * 0.000002;
      placed.push(bess(`b-${i}`, lng, lat));
    }
    placed.push(pcs("p1", -70 + 0.00005, -33 + 0.00005));

    const preview = buildSmartSiteFitPreview(candidateOf(placed), {
      anchor,
      maxBlocks: 50,
    });

    expect(preview.itemCount).toBe(placed.length);
    expect(preview.simplified).toBe(true);
    // Aggregated blocks are bounded (<= grid cells) and genuinely fewer.
    expect(preview.blocks.length).toBeGreaterThan(0);
    expect(preview.blocks.length).toBeLessThanOrEqual(28 * 28);
    expect(preview.blocks.length).toBeLessThan(placed.length);
    // The PCS hotspot is preserved as a "pcs" cell.
    expect(preview.blocks.some((b) => b.kind === "pcs")).toBe(true);
  });

  it("treats integrated all-in-one units as bess (no separate PCS)", () => {
    const integrated: PlacedEquipment[] = Array.from({ length: 3 }).map((_, i) => ({
      id: `u-${i}`,
      equipmentSpecId: "bess-tesla-megapack-2xl-4h",
      anchor: { lng: -70 + i * 0.0002, lat: -33 },
      rotation_deg: 0,
      sourceReliability: "preliminary_assumption",
    }));

    const preview = buildSmartSiteFitPreview(candidateOf(integrated), { anchor });
    expect(preview.blocks).toHaveLength(3);
    expect(preview.blocks.every((b) => b.kind === "bess")).toBe(true);
  });
});
