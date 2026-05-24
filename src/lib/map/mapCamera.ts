/**
 * Camera helpers for the map orientation control (ViewCube).
 *
 * These functions only move the camera — bearing (rotation) and pitch (tilt).
 * They never modify the BESS layout, equipment, polygons, restricted zones,
 * electrical calculations, regulatory validations or the edit history.
 *
 * Decoupled from the map library on purpose: anything exposing `easeTo` works.
 * This keeps the door open for a future real 3D view.
 */

/** Minimal camera surface needed to drive view orientation. */
export type CameraMap = {
  easeTo: (options: {
    bearing?: number;
    pitch?: number;
    duration?: number;
  }) => unknown;
};

/** Preliminary isometric tilt in degrees (within MapLibre's 0-60 range). */
export const ISO_PITCH_DEG = 55;

/** Smooth camera transition duration in milliseconds. */
export const VIEW_TRANSITION_MS = 650;

export type CompassDirection = "north" | "south" | "east" | "west";

const BEARING_BY_DIRECTION: Record<CompassDirection, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

/** Map bearing (degrees) that places the given direction towards the top. */
export function bearingForDirection(direction: CompassDirection): number {
  return BEARING_BY_DIRECTION[direction];
}

function ease(map: CameraMap, options: { bearing?: number; pitch?: number }) {
  map.easeTo({ ...options, duration: VIEW_TRANSITION_MS });
}

/** Rotate the camera so the given compass direction faces up. */
export function setCompassView(map: CameraMap, direction: CompassDirection) {
  ease(map, { bearing: bearingForDirection(direction) });
}

/** North up — bearing 0. */
export function setNorthView(map: CameraMap) {
  setCompassView(map, "north");
}

/** South up — bearing 180. */
export function setSouthView(map: CameraMap) {
  setCompassView(map, "south");
}

/** East up — bearing 90. */
export function setEastView(map: CameraMap) {
  setCompassView(map, "east");
}

/** West up — bearing 270. */
export function setWestView(map: CameraMap) {
  setCompassView(map, "west");
}

/** Top-down 2D view: pitch 0. Keeps the current center, zoom and bearing. */
export function setTopView(map: CameraMap) {
  ease(map, { pitch: 0 });
}

/** Preliminary isometric view: oblique pitch. Keeps center, zoom and bearing. */
export function setIsoView(map: CameraMap) {
  ease(map, { pitch: ISO_PITCH_DEG });
}

/** Full reset: north-up and top-down. */
export function resetView(map: CameraMap) {
  ease(map, { bearing: 0, pitch: 0 });
}
