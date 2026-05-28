import type { LocalPoint } from "@/types/geometry";

function ensureClosed(poly: LocalPoint[]): LocalPoint[] {
  if (poly.length < 3) return poly;
  const first = poly[0];
  const last = poly[poly.length - 1];
  const dx = Math.abs(first.x_m - last.x_m);
  const dy = Math.abs(first.y_m - last.y_m);
  if (dx > 1e-6 || dy > 1e-6) {
    return [...poly, first];
  }
  return poly;
}

export function polygonAreaM2(poly: LocalPoint[]): number {
  if (poly.length < 3) return 0;
  const closed = ensureClosed(poly);
  let area = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    area += closed[i].x_m * closed[i + 1].y_m - closed[i + 1].x_m * closed[i].y_m;
  }
  return Math.abs(area) / 2;
}

export function polygonCentroid(poly: LocalPoint[]): LocalPoint {
  if (poly.length === 0) return { x_m: 0, y_m: 0 };
  if (poly.length < 3) {
    let sumX = 0, sumY = 0;
    for (const p of poly) {
      sumX += p.x_m;
      sumY += p.y_m;
    }
    return { x_m: sumX / poly.length, y_m: sumY / poly.length };
  }
  const closed = ensureClosed(poly);
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const p1 = closed[i];
    const p2 = closed[i + 1];
    const factor = p1.x_m * p2.y_m - p2.x_m * p1.y_m;
    area += factor;
    cx += (p1.x_m + p2.x_m) * factor;
    cy += (p1.y_m + p2.y_m) * factor;
  }
  area = area / 2;
  if (Math.abs(area) < 1e-6) {
    let sumX = 0, sumY = 0;
    for (const p of poly) {
      sumX += p.x_m;
      sumY += p.y_m;
    }
    return { x_m: sumX / poly.length, y_m: sumY / poly.length };
  }
  return {
    x_m: cx / (6 * area),
    y_m: cy / (6 * area),
  };
}

export function boundingBox(poly: LocalPoint[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (poly.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x_m < minX) minX = p.x_m;
    if (p.x_m > maxX) maxX = p.x_m;
    if (p.y_m < minY) minY = p.y_m;
    if (p.y_m > maxY) maxY = p.y_m;
  }
  return { minX, maxX, minY, maxY };
}

export function dominantOrientationDeg(poly: LocalPoint[]): number {
  if (poly.length < 2) return 0;
  let maxLenSq = -1;
  let dominantAngleDeg = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const dx = p2.x_m - p1.x_m;
    const dy = p2.y_m - p1.y_m;
    const lenSq = dx * dx + dy * dy;
    if (lenSq > maxLenSq) {
      maxLenSq = lenSq;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      angle = (angle + 360) % 180;
      dominantAngleDeg = angle;
    }
  }
  return dominantAngleDeg;
}

export function simplifyPolygon(poly: LocalPoint[], tolerance: number): LocalPoint[] {
  if (poly.length <= 2) return poly;

  function getSquareSegmentDistance(p: LocalPoint, p1: LocalPoint, p2: LocalPoint): number {
    let x = p1.x_m;
    let y = p1.y_m;
    let dx = p2.x_m - x;
    let dy = p2.y_m - y;

    if (dx !== 0 || dy !== 0) {
      const t = ((p.x_m - x) * dx + (p.y_m - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2.x_m;
        y = p2.y_m;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p.x_m - x;
    dy = p.y_m - y;
    return dx * dx + dy * dy;
  }

  function rdp(points: LocalPoint[], sqTolerance: number): LocalPoint[] {
    const len = points.length;
    if (len <= 2) return points;

    let maxSqDist = 0;
    let index = 0;
    const end = len - 1;

    for (let i = 1; i < end; i++) {
      const sqDist = getSquareSegmentDistance(points[i], points[0], points[end]);
      if (sqDist > maxSqDist) {
        maxSqDist = sqDist;
        index = i;
      }
    }

    if (maxSqDist > sqTolerance) {
      const results1 = rdp(points.slice(0, index + 1), sqTolerance);
      const results2 = rdp(points.slice(index), sqTolerance);
      return results1.slice(0, results1.length - 1).concat(results2);
    }
    return [points[0], points[end]];
  }

  const closed = ensureClosed(poly);
  const simplified = rdp(closed, tolerance * tolerance);
  return simplified;
}

export function isPolygonConvex(poly: LocalPoint[]): boolean {
  if (poly.length < 3) return true;
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const p3 = poly[(i + 2) % poly.length];

    const dx1 = p2.x_m - p1.x_m;
    const dy1 = p2.y_m - p1.y_m;
    const dx2 = p3.x_m - p2.x_m;
    const dy2 = p3.y_m - p2.y_m;

    const crossProduct = dx1 * dy2 - dy1 * dx2;
    if (crossProduct !== 0) {
      const currentSign = Math.sign(crossProduct);
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }
  return true;
}

export function validatePolygonForSmartSiteFit(poly: LocalPoint[]): { valid: boolean; error?: string } {
  if (poly.length < 3) {
    return { valid: false, error: "El polígono debe tener al menos 3 vértices." };
  }
  const area = polygonAreaM2(poly);
  if (area <= 1) {
    return { valid: false, error: "El polígono tiene un área insignificante o inválida." };
  }
  return { valid: true };
}

export function analyzePolygon(poly: LocalPoint[]): {
  area_m2: number;
  centroid: LocalPoint;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  orientationDeg: number;
  isConvex: boolean;
} {
  return {
    area_m2: polygonAreaM2(poly),
    centroid: polygonCentroid(poly),
    bounds: boundingBox(poly),
    orientationDeg: dominantOrientationDeg(poly),
    isConvex: isPolygonConvex(poly),
  };
}
