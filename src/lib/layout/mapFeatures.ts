import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Polygon,
} from "geojson";
import type { LngLat, LocalPoint, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { equipmentCatalog, is3DCapable } from "@/data/equipmentCatalog";
import {
  resolveEquipment3DVisualProfile,
  resolveEquipment3DVisualProfileId,
} from "@/data/equipment3dVisualProfiles";
import { rectCorners } from "@/lib/geometry/rectangles";
import { toLocal, toLngLat } from "@/lib/geometry/projection";
import type { RegulatoryProfile } from "@/types/bessLayoutTypes";
import type { LayoutWarning } from "@/lib/layout/spacingRules";

export function polygonToFeature(polygon: LngLat[]): FeatureCollection<Polygon> {
  if (polygon.length < 3) {
    return { type: "FeatureCollection", features: [] };
  }
  const ring = polygon.map((p) => [p.lng, p.lat] as [number, number]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {},
      },
    ],
  };
}

export function polygonToLineFeature(polygon: LngLat[]): FeatureCollection {
  if (polygon.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }
  const coords = polygon.map((p) => [p.lng, p.lat]);
  // Close the ring once there are 3+ vertices so the visible stroke matches
  // the filled polygon. Below 3 we leave the line open (work in progress).
  if (polygon.length >= 3) {
    coords.push(coords[0]);
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      },
    ],
  };
}

export function polygonVerticesToFeature(polygon: LngLat[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: polygon.map((p, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { index: i },
    })),
  };
}

export function equipmentToFeatures(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor | null,
  selectedId: string | null,
  selectedIds: string[] = [],
  editedIds: string[] = []
): FeatureCollection<Polygon> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: Feature<Polygon>[] = [];
  const multiSelection = new Set(selectedIds);
  const editedSelection = new Set(editedIds);
  for (const p of placed) {
    const spec = equipmentCatalog.find((e) => e.id === p.equipmentSpecId);
    if (!spec) continue;
    const visualProfile = resolveEquipment3DVisualProfileId(spec);
    const center = toLocal(p.anchor, anchor);
    const corners = rectCorners({
      center,
      length_m: spec.footprint.length_m,
      width_m: spec.footprint.width_m,
      rotation_deg: p.rotation_deg,
    });
    const ring = corners
      .map((c) => toLngLat(c, anchor))
      .map((ll) => [ll.lng, ll.lat] as [number, number]);
    ring.push(ring[0]);
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {
        id: p.id,
        equipmentSpecId: p.equipmentSpecId,
        type: spec.type,
        label: `${spec.manufacturer} ${spec.model}`,
        energyMWh: spec.electrical?.energy_mwh_dc_bol ?? null,
        powerMW: spec.electrical?.apparent_power_mva ?? null,
        weightT: spec.mass ? spec.mass.weight_kg / 1000 : null,
        selected: p.id === selectedId || multiSelection.has(p.id),
        massSelected: multiSelection.has(p.id),
        draftEdited: editedSelection.has(p.id),
        locked: p.locked === true,
        heightM: spec.footprint.height_m ?? 0,
        has3D: is3DCapable(spec),
        visualProfile: visualProfile ?? "",
      },
    });
  }
  return { type: "FeatureCollection", features };
}

function offsetPoint(
  center: LocalPoint,
  rotationDeg: number,
  offsetLongM: number,
  offsetWideM: number
): LocalPoint {
  const theta = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x_m: center.x_m + offsetLongM * cos - offsetWideM * sin,
    y_m: center.y_m + offsetLongM * sin + offsetWideM * cos,
  };
}

function rectangleRing(
  center: LocalPoint,
  anchor: ProjectAnchor,
  rotationDeg: number,
  offsetLongM: number,
  offsetWideM: number,
  lengthM: number,
  widthM: number
) {
  const detailCenter = offsetPoint(center, rotationDeg, offsetLongM, offsetWideM);
  const ring = rectCorners({
    center: detailCenter,
    length_m: lengthM,
    width_m: widthM,
    rotation_deg: rotationDeg,
  })
    .map((point) => toLngLat(point, anchor))
    .map((point) => [point.lng, point.lat] as [number, number]);
  ring.push(ring[0]);
  return ring;
}

type DetailFeature = Feature<
  Polygon,
  {
    equipmentId: string;
    type: string;
    detailType: string;
    color: string;
    baseM: number;
    topM: number;
  }
>;

function detailFeature(args: {
  placed: PlacedEquipment;
  center: LocalPoint;
  anchor: ProjectAnchor;
  detailType: string;
  color: string;
  heightM: number;
  offsetLongM: number;
  offsetWideM: number;
  lengthM: number;
  widthM: number;
}): DetailFeature {
  const topM = args.heightM + 0.18;
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        rectangleRing(
          args.center,
          args.anchor,
          args.placed.rotation_deg,
          args.offsetLongM,
          args.offsetWideM,
          args.lengthM,
          args.widthM
        ),
      ],
    },
    properties: {
      equipmentId: args.placed.id,
      type:
        equipmentCatalog.find((entry) => entry.id === args.placed.equipmentSpecId)
          ?.type ?? "",
      detailType: args.detailType,
      color: args.color,
      baseM: args.heightM + 0.035,
      topM,
    },
  };
}

export function equipment3DDetailFeatures(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor | null
): FeatureCollection<Polygon> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: DetailFeature[] = [];
  for (const item of placed) {
    const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
    const visualProfileId = resolveEquipment3DVisualProfileId(spec);
    const profile = resolveEquipment3DVisualProfile(spec);
    if (
      !spec ||
      !profile ||
      (visualProfileId !== "sungrow_container_v1" &&
        visualProfileId !== "sungrow_pcs_v1") ||
      !is3DCapable(spec) ||
      !spec.footprint.height_m
    ) {
      continue;
    }

    const center = toLocal(item.anchor, anchor);
    const lengthM = spec.footprint.length_m;
    const widthM = spec.footprint.width_m;
    const heightM = spec.footprint.height_m;
    const railWidthM = Math.min(0.18, Math.max(0.12, widthM * 0.075));
    const seamWidthM = Math.min(0.16, Math.max(0.1, lengthM * 0.018));

    if (visualProfileId === "sungrow_pcs_v1") {
      features.push(
        detailFeature({
          placed: item,
          center,
          anchor,
          detailType: "pcs-brand-plate",
          color: profile.logoColor,
          heightM,
          offsetLongM: -lengthM * 0.16,
          offsetWideM: 0,
          lengthM: Math.min(lengthM * 0.56, 3.2),
          widthM: Math.min(widthM * 0.42, 0.92),
        })
      );

      for (let index = 0; index < 3; index += 1) {
        features.push(
          detailFeature({
            placed: item,
            center,
            anchor,
            detailType: "pcs-cabinet",
            color: profile.doorColor,
            heightM,
            offsetLongM: -lengthM * 0.36 + index * lengthM * 0.19,
            offsetWideM: widthM * 0.21,
            lengthM: Math.min(0.86, lengthM * 0.14),
            widthM: Math.min(0.54, widthM * 0.22),
          })
        );
      }

      for (let index = 0; index < 4; index += 1) {
        features.push(
          detailFeature({
            placed: item,
            center,
            anchor,
            detailType: "pcs-vent-bank",
            color: profile.ventColor,
            heightM,
            offsetLongM: -lengthM * 0.28 + index * lengthM * 0.14,
            offsetWideM: -widthM * 0.24,
            lengthM: Math.min(0.58, lengthM * 0.09),
            widthM: Math.min(0.28, widthM * 0.12),
          })
        );
      }

      features.push(
        detailFeature({
          placed: item,
          center,
          anchor,
          detailType: "pcs-transformer-block",
          color: profile.detailColor,
          heightM,
          offsetLongM: lengthM * 0.33,
          offsetWideM: 0,
          lengthM: Math.min(lengthM * 0.24, 1.55),
          widthM: widthM * 0.8,
        }),
        detailFeature({
          placed: item,
          center,
          anchor,
          detailType: "pcs-accent-rail",
          color: profile.accentColor,
          heightM,
          offsetLongM: 0,
          offsetWideM: widthM * 0.38,
          lengthM: lengthM * 0.86,
          widthM: Math.min(0.16, Math.max(0.1, widthM * 0.05)),
        })
      );

      continue;
    }

    if (profile.showPanels) {
      for (let index = 1; index <= 5; index += 1) {
        features.push(
          detailFeature({
            placed: item,
            center,
            anchor,
            detailType: "panel-seam",
            color: profile.detailColor,
            heightM,
            offsetLongM: -lengthM / 2 + (lengthM * index) / 6,
            offsetWideM: 0,
            lengthM: seamWidthM,
            widthM: widthM * 0.9,
          })
        );
      }

      for (const side of [-1, 1]) {
        features.push(
          detailFeature({
            placed: item,
            center,
            anchor,
            detailType: "side-rail",
            color: profile.detailColor,
            heightM,
            offsetLongM: 0,
            offsetWideM: side * (widthM / 2 - railWidthM / 2),
            lengthM: lengthM * 0.94,
            widthM: railWidthM,
          })
        );
      }
    }

    features.push(
      detailFeature({
        placed: item,
        center,
        anchor,
        detailType: "brand-plate",
        color: profile.logoColor,
        heightM,
        offsetLongM: 0,
        offsetWideM: 0,
        lengthM: Math.min(lengthM * 0.62, 4.8),
        widthM: Math.min(widthM * 0.46, 0.82),
      })
    );

    if (profile.showDoors) {
      for (const side of [-1, 1]) {
        features.push(
          detailFeature({
            placed: item,
            center,
            anchor,
            detailType: "door",
            color: profile.doorColor,
            heightM,
            offsetLongM: side * (lengthM / 2 - 0.48),
            offsetWideM: 0,
            lengthM: 0.74,
            widthM: widthM * 0.84,
          })
        );
      }
    }

    if (profile.showVents) {
      for (let index = 0; index < 4; index += 1) {
        features.push(
          detailFeature({
            placed: item,
            center,
            anchor,
            detailType: "vent",
            color: profile.ventColor,
            heightM,
            offsetLongM: -lengthM * 0.3 + index * lengthM * 0.18,
            offsetWideM: -widthM * 0.26,
            lengthM: Math.min(0.82, lengthM * 0.09),
            widthM: Math.min(0.24, Math.max(0.16, widthM * 0.11)),
          })
        );
      }
    }

    features.push(
      detailFeature({
        placed: item,
        center,
        anchor,
        detailType: "accent",
        color: profile.accentColor,
        heightM,
        offsetLongM: 0,
        offsetWideM: widthM * 0.24,
        lengthM: lengthM * 0.72,
        widthM: Math.min(0.18, Math.max(0.12, widthM * 0.08)),
      })
    );
  }

  return { type: "FeatureCollection", features };
}

export function equipment3DLabelFeatures(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor | null
): FeatureCollection<Point> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: Feature<Point>[] = [];
  for (const item of placed) {
    const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
    const visualProfileId = resolveEquipment3DVisualProfileId(spec);
    const profile = resolveEquipment3DVisualProfile(spec);
    if (
      !spec ||
      !profile?.logoText ||
      (visualProfileId !== "sungrow_container_v1" &&
        visualProfileId !== "sungrow_pcs_v1") ||
      !is3DCapable(spec)
    ) {
      continue;
    }

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [item.anchor.lng, item.anchor.lat],
      },
      properties: {
        equipmentId: item.id,
        type: spec.type,
        label: profile.logoText,
        color: "#ffffff",
        rotationDeg: item.rotation_deg,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

export function gridLineFeatures(args: {
  polygon: LngLat[];
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  spacingM?: number;
}): FeatureCollection<LineString> {
  const { polygon, placed, anchor, spacingM = 25 } = args;
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const localPoints =
    polygon.length >= 3
      ? polygon.map((point) => toLocal(point, anchor))
      : placed.map((item) => toLocal(item.anchor, anchor));
  if (localPoints.length === 0) return { type: "FeatureCollection", features: [] };

  const xs = localPoints.map((point) => point.x_m);
  const ys = localPoints.map((point) => point.y_m);
  const minX = Math.floor((Math.min(...xs) - spacingM) / spacingM) * spacingM;
  const maxX = Math.ceil((Math.max(...xs) + spacingM) / spacingM) * spacingM;
  const minY = Math.floor((Math.min(...ys) - spacingM) / spacingM) * spacingM;
  const maxY = Math.ceil((Math.max(...ys) + spacingM) / spacingM) * spacingM;
  const features: Feature<LineString>[] = [];

  for (let x = minX; x <= maxX; x += spacingM) {
    const a = toLngLat({ x_m: x, y_m: minY }, anchor);
    const b = toLngLat({ x_m: x, y_m: maxY }, anchor);
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
      properties: { axis: "x" },
    });
  }

  for (let y = minY; y <= maxY; y += spacingM) {
    const a = toLngLat({ x_m: minX, y_m: y }, anchor);
    const b = toLngLat({ x_m: maxX, y_m: y }, anchor);
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
      properties: { axis: "y" },
    });
  }

  return { type: "FeatureCollection", features };
}

function midpoint(a: LngLat, b: LngLat): LngLat {
  return { lng: (a.lng + b.lng) / 2, lat: (a.lat + b.lat) / 2 };
}

export function warningMarkerFeatures(
  warnings: LayoutWarning[],
  placed: PlacedEquipment[]
): FeatureCollection<Point> {
  const byId = new Map(placed.map((item) => [item.id, item]));
  const features: Feature<Point>[] = [];

  for (const warning of warnings) {
    if (warning.id.startsWith("outside-polygon-")) {
      const id = warning.id.replace("outside-polygon-", "");
      const item = byId.get(id);
      if (!item) continue;
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [item.anchor.lng, item.anchor.lat],
        },
        properties: { warningType: "outOfBounds", severity: warning.severity },
      });
    }

    if (warning.id.startsWith("collision-")) {
      const raw = warning.id.replace("collision-", "");
      const ids = placed
        .filter((item) => raw.includes(item.id))
        .slice(0, 2)
        .map((item) => item.id);
      const a = ids[0] ? byId.get(ids[0]) : null;
      const b = ids[1] ? byId.get(ids[1]) : null;
      if (!a || !b) continue;
      const point = midpoint(a.anchor, b.anchor);
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
        properties: { warningType: "collision", severity: warning.severity },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export function measurementLabelFeatures(
  polygon: LngLat[],
  anchor: ProjectAnchor | null
): FeatureCollection<Point> {
  if (!anchor || polygon.length < 2) return { type: "FeatureCollection", features: [] };

  const features: Feature<Point>[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const localA = toLocal(a, anchor);
    const localB = toLocal(b, anchor);
    const lengthM = Math.hypot(localB.x_m - localA.x_m, localB.y_m - localA.y_m);
    const center = toLngLat(
      {
        x_m: (localA.x_m + localB.x_m) / 2,
        y_m: (localA.y_m + localB.y_m) / 2,
      },
      anchor
    );
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [center.lng, center.lat] },
      properties: { label: `${Math.round(lengthM)} m` },
    });
  }

  return { type: "FeatureCollection", features };
}

export function regulatoryBufferFeatures(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor | null,
  profile: RegulatoryProfile
): FeatureCollection<Polygon> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: Feature<Polygon>[] = [];
  for (const p of placed) {
    const spec = equipmentCatalog.find((e) => e.id === p.equipmentSpecId);
    // TODO(pcs-buffer): PCS / Power Conversion System currently has no
    // restriction/buffer visualised, while battery_container does. Before
    // enabling a PCS buffer here, validate the proper distance with normative
    // criteria (UL 9540, NFPA 855, AHJ, manufacturer guidance). Do not invent
    // a value — keep this filter narrowed to battery_container until then.
    if (!spec || spec.type !== "battery_container") continue;
    const center = toLocal(p.anchor, anchor);
    const buffers = [
      {
        type: "normative_separation",
        value_m: profile.rules.bessToBess_m,
      },
      {
        type: "maintenance_aisle",
        value_m: profile.rules.maintenanceAisle_m,
      },
    ];

    for (const buffer of buffers) {
      const corners = rectCorners({
        center,
        length_m: spec.footprint.length_m + buffer.value_m * 2,
        width_m: spec.footprint.width_m + buffer.value_m * 2,
        rotation_deg: p.rotation_deg,
      });
      const ring = corners
        .map((corner) => toLngLat(corner, anchor))
        .map((ll) => [ll.lng, ll.lat] as [number, number]);
      ring.push(ring[0]);
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {
          id: `${p.id}-${buffer.type}`,
          equipmentId: p.id,
          bufferType: buffer.type,
          value_m: buffer.value_m,
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
