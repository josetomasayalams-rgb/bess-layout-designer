import type { LocalPoint, RotatedRectLocal } from "@/types/geometry";
import { pointInPolygon, rectanglesIntersect } from "@/lib/geometry/collision";
import { rectCorners } from "@/lib/geometry/rectangles";

function distancePointToSegment(
  p: LocalPoint,
  a: LocalPoint,
  b: LocalPoint
): number {
  const dx = b.x_m - a.x_m;
  const dy = b.y_m - a.y_m;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x_m - a.x_m, p.y_m - a.y_m);
  const t = Math.max(
    0,
    Math.min(1, ((p.x_m - a.x_m) * dx + (p.y_m - a.y_m) * dy) / lengthSq)
  );
  const x = a.x_m + t * dx;
  const y = a.y_m + t * dy;
  return Math.hypot(p.x_m - x, p.y_m - y);
}

function orientation(a: LocalPoint, b: LocalPoint, c: LocalPoint): number {
  return (b.y_m - a.y_m) * (c.x_m - b.x_m) - (b.x_m - a.x_m) * (c.y_m - b.y_m);
}

function onSegment(a: LocalPoint, b: LocalPoint, c: LocalPoint): boolean {
  return (
    b.x_m <= Math.max(a.x_m, c.x_m) &&
    b.x_m >= Math.min(a.x_m, c.x_m) &&
    b.y_m <= Math.max(a.y_m, c.y_m) &&
    b.y_m >= Math.min(a.y_m, c.y_m)
  );
}

function segmentsIntersect(
  a1: LocalPoint,
  a2: LocalPoint,
  b1: LocalPoint,
  b2: LocalPoint
): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;
  return false;
}

function distanceSegmentToSegment(
  a1: LocalPoint,
  a2: LocalPoint,
  b1: LocalPoint,
  b2: LocalPoint
): number {
  if (segmentsIntersect(a1, a2, b1, b2)) return 0;
  return Math.min(
    distancePointToSegment(a1, b1, b2),
    distancePointToSegment(a2, b1, b2),
    distancePointToSegment(b1, a1, a2),
    distancePointToSegment(b2, a1, a2)
  );
}

function edges(points: LocalPoint[]): [LocalPoint, LocalPoint][] {
  return points.map((point, index) => [
    point,
    points[(index + 1) % points.length],
  ]);
}

export function distanceBetweenRectangles(
  a: RotatedRectLocal,
  b: RotatedRectLocal
): number {
  if (rectanglesIntersect(a, b)) return 0;
  const aEdges = edges(rectCorners(a));
  const bEdges = edges(rectCorners(b));
  let min = Infinity;
  for (const [a1, a2] of aEdges) {
    for (const [b1, b2] of bEdges) {
      min = Math.min(min, distanceSegmentToSegment(a1, a2, b1, b2));
    }
  }
  return min;
}

export function distanceRectToPolygonBoundary(
  rect: RotatedRectLocal,
  polygon: LocalPoint[]
): number {
  if (polygon.length < 3) return Infinity;
  const corners = rectCorners(rect);
  if (!corners.every((corner) => pointInPolygon(corner, polygon))) return 0;
  const rectEdges = edges(corners);
  const polygonEdges = edges(polygon);
  let min = Infinity;
  for (const [r1, r2] of rectEdges) {
    for (const [p1, p2] of polygonEdges) {
      min = Math.min(min, distanceSegmentToSegment(r1, r2, p1, p2));
    }
  }
  return min;
}

export function distancePointToPolyline(point: LocalPoint, path: LocalPoint[]): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) {
    return Math.hypot(point.x_m - path[0].x_m, point.y_m - path[0].y_m);
  }
  let min = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    min = Math.min(min, distancePointToSegment(point, path[index - 1], path[index]));
  }
  return min;
}

export function distancePolylineToPolyline(a: LocalPoint[], b: LocalPoint[]): number {
  if (a.length === 0 || b.length === 0) return Infinity;
  if (a.length === 1) return distancePointToPolyline(a[0], b);
  if (b.length === 1) return distancePointToPolyline(b[0], a);

  let min = Infinity;
  for (let i = 1; i < a.length; i++) {
    const a1 = a[i - 1];
    const a2 = a[i];
    for (let j = 1; j < b.length; j++) {
      const b1 = b[j - 1];
      const b2 = b[j];
      min = Math.min(min, distanceSegmentToSegment(a1, a2, b1, b2));
    }
  }
  return min;
}
