import { describe, expect, it } from "vitest";
import {
  polygonAreaM2,
  polygonCentroid,
  boundingBox,
  dominantOrientationDeg,
  simplifyPolygon,
  validatePolygonForSmartSiteFit,
  analyzePolygon,
  isPolygonConvex,
} from "./smartSiteFitGeometry";
import type { LocalPoint } from "@/types/geometry";

describe("SmartSiteFit Geometry", () => {
  // A standard 10m x 10m rectangle aligned with axes
  const square: LocalPoint[] = [
    { x_m: 0, y_m: 0 },
    { x_m: 10, y_m: 0 },
    { x_m: 10, y_m: 10 },
    { x_m: 0, y_m: 10 },
  ];

  it("should calculate correct Shoelace area", () => {
    expect(polygonAreaM2(square)).toBe(100);
    // Area of empty or line polygon
    expect(polygonAreaM2([])).toBe(0);
    expect(polygonAreaM2([{ x_m: 0, y_m: 0 }, { x_m: 10, y_m: 0 }])).toBe(0);
  });

  it("should calculate correct Centroid", () => {
    expect(polygonCentroid(square)).toEqual({ x_m: 5, y_m: 5 });
  });

  it("should calculate correct boundingBox", () => {
    expect(boundingBox(square)).toEqual({ minX: 0, maxX: 10, minY: 0, maxY: 10 });
  });

  it("should detect dominantOrientationDeg correctly", () => {
    // Dominant orientation of square aligned to axes (longest edge is 10m)
    // The angle of the bottom edge (0,0)->(10,0) is 0 deg.
    expect(dominantOrientationDeg(square)).toBe(0);

    // Diagonal oriented line segment
    const diagonalLine = [
      { x_m: 0, y_m: 0 },
      { x_m: 10, y_m: 10 },
      { x_m: 2, y_m: 8 },
    ];
    // Longest segment is (0,0)->(10,10), length sqrt(200) ~ 14.14, angle 45 deg
    expect(dominantOrientationDeg(diagonalLine)).toBeCloseTo(45, 1);
  });

  it("should simplify polygon using RDP", () => {
    const lineWithNoisyPoints = [
      { x_m: 0, y_m: 0 },
      { x_m: 5, y_m: 0.1 }, // very close to collinear
      { x_m: 10, y_m: 0 },
      { x_m: 10, y_m: 10 },
      { x_m: 0, y_m: 10 },
    ];
    const simplified = simplifyPolygon(lineWithNoisyPoints, 0.5);
    // Should remove the noisy point
    expect(simplified.length).toBe(5); // Including the closing point: [0, 2, 3, 4, 0]
    expect(simplified.some((p) => p.x_m === 5 && p.y_m === 0.1)).toBe(false);
  });

  it("should identify convex/non-convex polygons correctly", () => {
    expect(isPolygonConvex(square)).toBe(true);

    const nonConvex: LocalPoint[] = [
      { x_m: 0, y_m: 0 },
      { x_m: 10, y_m: 0 },
      { x_m: 5, y_m: 5 }, // Dent inwards
      { x_m: 10, y_m: 10 },
      { x_m: 0, y_m: 10 },
    ];
    expect(isPolygonConvex(nonConvex)).toBe(false);
  });

  it("should validate polygon for SmartSiteFit correctly", () => {
    expect(validatePolygonForSmartSiteFit(square).valid).toBe(true);
    expect(validatePolygonForSmartSiteFit([]).valid).toBe(false);
    expect(validatePolygonForSmartSiteFit([{ x_m: 0, y_m: 0 }]).valid).toBe(false);
  });

  it("should combine all math in analyzePolygon", () => {
    const result = analyzePolygon(square);
    expect(result.area_m2).toBe(100);
    expect(result.centroid).toEqual({ x_m: 5, y_m: 5 });
    expect(result.bounds).toEqual({ minX: 0, maxX: 10, minY: 0, maxY: 10 });
    expect(result.orientationDeg).toBe(0);
    expect(result.isConvex).toBe(true);
  });
});
