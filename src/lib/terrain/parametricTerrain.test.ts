import { describe, expect, it } from "vitest";
import {
  dimensionsFromAreaRatio,
  generateParametricTerrain,
  hectaresToM2,
  rotateParametricTerrainPreview,
  translateParametricTerrainPreview,
} from "@/lib/terrain/parametricTerrain";

const center = { lng: -70, lat: -33 };

describe("parametric terrain", () => {
  it("converts hectares and derives rectangle dimensions from area ratio", () => {
    expect(hectaresToM2(5)).toBe(50_000);
    const dimensions = dimensionsFromAreaRatio(5, 2);
    expect(dimensions.lengthM).toBeCloseTo(316.23, 2);
    expect(dimensions.widthM).toBeCloseTo(158.11, 2);
  });

  it("generates a rectangular preview from explicit dimensions", () => {
    const preview = generateParametricTerrain({
      shape: "rectangle",
      sizingMode: "dimensions",
      center,
      areaHa: 5,
      lengthM: 400,
      widthM: 150,
      aspectRatio: 2,
      vertexCount: 4,
      rotationDeg: 30,
    });

    expect(preview.polygon).toHaveLength(4);
    expect(preview.areaM2).toBeGreaterThan(58_000);
    expect(preview.areaM2).toBeLessThan(62_000);
    expect(preview.rotationDeg).toBe(30);
  });

  it("translates a preview without changing its dimensions or rotation", () => {
    const preview = generateParametricTerrain({
      shape: "square",
      sizingMode: "area-ratio",
      center,
      areaHa: 4,
      lengthM: 100,
      widthM: 100,
      aspectRatio: 1,
      vertexCount: 4,
      rotationDeg: 45,
    });
    const translated = translateParametricTerrainPreview(preview, {
      x_m: 100,
      y_m: 50,
    });

    expect(translated.center).not.toEqual(preview.center);
    expect(translated.lengthM).toBeCloseTo(preview.lengthM, 6);
    expect(translated.widthM).toBeCloseTo(preview.widthM, 6);
    expect(translated.rotationDeg).toBe(preview.rotationDeg);
  });

  it("rotates an existing preview without changing its size", () => {
    const preview = generateParametricTerrain({
      shape: "rectangle",
      sizingMode: "area-ratio",
      center,
      areaHa: 5,
      lengthM: 316,
      widthM: 158,
      aspectRatio: 2,
      vertexCount: 4,
      rotationDeg: 0,
    });

    const rotatedOnce = rotateParametricTerrainPreview(preview, 37);
    const rotatedAgain = rotateParametricTerrainPreview(rotatedOnce, 123);

    expect(rotatedAgain.lengthM).toBeCloseTo(preview.lengthM, 6);
    expect(rotatedAgain.widthM).toBeCloseTo(preview.widthM, 6);
    expect(rotatedAgain.areaM2).toBeCloseTo(preview.areaM2, 6);
    expect(rotatedAgain.rotationDeg).toBe(123);
  });
});
