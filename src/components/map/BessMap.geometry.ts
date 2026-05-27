export function normalizeRotation(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function shortestDeltaDeg(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}
