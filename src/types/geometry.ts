export type LngLat = {
  lng: number;
  lat: number;
};

export type LocalPoint = {
  x_m: number;
  y_m: number;
};

export type ProjectAnchor = {
  lng0: number;
  lat0: number;
};

export type RotatedRectLocal = {
  center: LocalPoint;
  length_m: number;
  width_m: number;
  rotation_deg: number;
};

export type Polygon = LngLat[];
