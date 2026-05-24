import { describe, it, expect } from "vitest";
import { rectanglesIntersect, pointInPolygon, allCornersInsidePolygon } from "./collision";

describe("rectanglesIntersect", () => {
  it("overlapping axis-aligned rectangles intersect", () => {
    const a = { center: { x_m: 0, y_m: 0 }, length_m: 10, width_m: 4, rotation_deg: 0 };
    const b = { center: { x_m: 5, y_m: 0 }, length_m: 10, width_m: 4, rotation_deg: 0 };
    expect(rectanglesIntersect(a, b)).toBe(true);
  });

  it("non-overlapping axis-aligned rectangles do not intersect", () => {
    const a = { center: { x_m: 0, y_m: 0 }, length_m: 10, width_m: 4, rotation_deg: 0 };
    const b = { center: { x_m: 20, y_m: 0 }, length_m: 10, width_m: 4, rotation_deg: 0 };
    expect(rectanglesIntersect(a, b)).toBe(false);
  });

  it("perpendicular rectangles at same center form a cross and overlap", () => {
    const a = { center: { x_m: 0, y_m: 0 }, length_m: 10, width_m: 1, rotation_deg: 0 };
    const b = { center: { x_m: 0, y_m: 0 }, length_m: 10, width_m: 1, rotation_deg: 90 };
    expect(rectanglesIntersect(a, b)).toBe(true);
  });

  it("rotation matters: 90deg rectangle stays separate when AABB would collide", () => {
    const a = { center: { x_m: 0, y_m: 0 }, length_m: 20, width_m: 1, rotation_deg: 0 };
    const b = { center: { x_m: 12, y_m: 0.4 }, length_m: 20, width_m: 1, rotation_deg: 90 };
    expect(rectanglesIntersect(a, b)).toBe(false);
  });

  it("touching but not overlapping rotated rectangles still report intersection (closed sets)", () => {
    const a = { center: { x_m: 0, y_m: 0 }, length_m: 10, width_m: 4, rotation_deg: 0 };
    const b = { center: { x_m: 10, y_m: 0 }, length_m: 10, width_m: 4, rotation_deg: 0 };
    expect(rectanglesIntersect(a, b)).toBe(true);
  });
});

describe("pointInPolygon", () => {
  const square = [
    { x_m: 0, y_m: 0 },
    { x_m: 10, y_m: 0 },
    { x_m: 10, y_m: 10 },
    { x_m: 0, y_m: 10 },
  ];

  it("inside point returns true", () => {
    expect(pointInPolygon({ x_m: 5, y_m: 5 }, square)).toBe(true);
  });

  it("outside point returns false", () => {
    expect(pointInPolygon({ x_m: 15, y_m: 5 }, square)).toBe(false);
  });
});

describe("allCornersInsidePolygon", () => {
  const square = [
    { x_m: 0, y_m: 0 },
    { x_m: 100, y_m: 0 },
    { x_m: 100, y_m: 100 },
    { x_m: 0, y_m: 100 },
  ];

  it("rectangle fully inside returns true", () => {
    const r = { center: { x_m: 50, y_m: 50 }, length_m: 20, width_m: 10, rotation_deg: 0 };
    expect(allCornersInsidePolygon(r, square)).toBe(true);
  });

  it("rectangle partially outside returns false", () => {
    const r = { center: { x_m: 95, y_m: 50 }, length_m: 20, width_m: 10, rotation_deg: 0 };
    expect(allCornersInsidePolygon(r, square)).toBe(false);
  });
});
