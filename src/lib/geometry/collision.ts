import type { LocalPoint, RotatedRectLocal } from "@/types/geometry";
import { rectCorners } from "./rectangles";

function projectPolygon(corners: LocalPoint[], axis: LocalPoint): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const c of corners) {
    const dot = c.x_m * axis.x_m + c.y_m * axis.y_m;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

function overlaps(a: { min: number; max: number }, b: { min: number; max: number }): boolean {
  return !(a.max < b.min || b.max < a.min);
}

function getAxes(corners: LocalPoint[]): LocalPoint[] {
  const axes: LocalPoint[] = [];
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % corners.length];
    const edge = { x_m: p2.x_m - p1.x_m, y_m: p2.y_m - p1.y_m };
    const length = Math.hypot(edge.x_m, edge.y_m);
    if (length === 0) continue;
    axes.push({ x_m: -edge.y_m / length, y_m: edge.x_m / length });
  }
  return axes;
}

export function rectanglesIntersect(a: RotatedRectLocal, b: RotatedRectLocal): boolean {
  const cornersA = rectCorners(a);
  const cornersB = rectCorners(b);
  const axes = [...getAxes(cornersA), ...getAxes(cornersB)];
  for (const axis of axes) {
    const projA = projectPolygon(cornersA, axis);
    const projB = projectPolygon(cornersB, axis);
    if (!overlaps(projA, projB)) return false;
  }
  return true;
}

export function pointInPolygon(p: LocalPoint, polygon: LocalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x_m;
    const yi = polygon[i].y_m;
    const xj = polygon[j].x_m;
    const yj = polygon[j].y_m;
    const intersect =
      yi > p.y_m !== yj > p.y_m &&
      p.x_m < ((xj - xi) * (p.y_m - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function allCornersInsidePolygon(
  rect: RotatedRectLocal,
  polygon: LocalPoint[]
): boolean {
  const corners = rectCorners(rect);
  return corners.every((c) => pointInPolygon(c, polygon));
}
