import type { LocalPoint, RotatedRectLocal } from "@/types/geometry";

export function rectCorners(rect: RotatedRectLocal): LocalPoint[] {
  const halfL = rect.length_m / 2;
  const halfW = rect.width_m / 2;
  const theta = (rect.rotation_deg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const local: LocalPoint[] = [
    { x_m: -halfL, y_m: -halfW },
    { x_m: halfL, y_m: -halfW },
    { x_m: halfL, y_m: halfW },
    { x_m: -halfL, y_m: halfW },
  ];

  return local.map((p) => ({
    x_m: rect.center.x_m + p.x_m * cos - p.y_m * sin,
    y_m: rect.center.y_m + p.x_m * sin + p.y_m * cos,
  }));
}

export function rectArea(rect: RotatedRectLocal): number {
  return rect.length_m * rect.width_m;
}
