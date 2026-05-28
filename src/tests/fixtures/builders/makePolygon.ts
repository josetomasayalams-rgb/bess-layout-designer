import type { LngLat, ProjectAnchor } from "@/types/geometry";
import { DEFAULT_ANCHOR } from "./makeAnchor";

/**
 * Approximate degrees per metre at the anchor latitude. Using a flat
 * cosine-corrected equirectangular projection — same family of approximation
 * used in `src/lib/geometry`. Good enough for fixture polygons.
 */
function dxToLng(dx_m: number, anchor: ProjectAnchor): number {
  const metresPerDeg = 111_320 * Math.cos((anchor.lat0 * Math.PI) / 180);
  return dx_m / metresPerDeg;
}

function dyToLat(dy_m: number): number {
  const metresPerDeg = 111_320;
  return dy_m / metresPerDeg;
}

export type RectanglePolygonInput = {
  /** Optional anchor (defaults to Santiago). */
  anchor?: ProjectAnchor;
  /** Width in metres (east-west). Default 200 m. */
  width_m?: number;
  /** Height in metres (north-south). Default 100 m. */
  height_m?: number;
  /** Whether to close the ring by repeating the first vertex. Default false. */
  closed?: boolean;
};

/**
 * Build a rectangular polygon (4 vertices, CCW from anchor) in LngLat
 * coordinates. The anchor is the south-west corner.
 */
export function makeRectanglePolygon(input: RectanglePolygonInput = {}): LngLat[] {
  const anchor = input.anchor ?? DEFAULT_ANCHOR;
  const w = input.width_m ?? 200;
  const h = input.height_m ?? 100;
  const dLng = dxToLng(w, anchor);
  const dLat = dyToLat(h);
  const sw: LngLat = { lng: anchor.lng0, lat: anchor.lat0 };
  const se: LngLat = { lng: anchor.lng0 + dLng, lat: anchor.lat0 };
  const ne: LngLat = { lng: anchor.lng0 + dLng, lat: anchor.lat0 + dLat };
  const nw: LngLat = { lng: anchor.lng0, lat: anchor.lat0 + dLat };
  return input.closed ? [sw, se, ne, nw, sw] : [sw, se, ne, nw];
}

/** Alias kept for ergonomics — defaults to a 200 m × 100 m rectangle. */
export function makePolygon(
  input: RectanglePolygonInput = {}
): LngLat[] {
  return makeRectanglePolygon(input);
}

/** Empty polygon — useful for the "no site drawn yet" branch. */
export function makeEmptyPolygon(): LngLat[] {
  return [];
}
