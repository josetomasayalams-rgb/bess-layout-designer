/**
 * Construye un diagrama SVG esquemático del sitio para el reporte PDF (Fase 11).
 *
 * - Convierte el polígono y los equipos a coordenadas locales (m).
 * - Calcula bounding box + padding y produce un viewBox normalizado.
 * - Devuelve primitivas (polygon, rectangle, scaleBar, north) listas para
 *   renderizar con `<Svg>` de react-pdf.
 *
 * No depende de DOM: funciona en SSR/Node y por lo tanto en tests.
 */

import { equipmentCatalog } from "@/data/equipmentCatalog";
import { rectCorners } from "@/lib/geometry/rectangles";
import { toLocal } from "@/lib/geometry/projection";
import type { PlacedEquipment } from "@/types/equipment";
import type { LngLat, LocalPoint, ProjectAnchor } from "@/types/geometry";

export type SvgRect = {
  /** Puntos del rectángulo rotado en coordenadas del viewBox (mm). */
  points: { x: number; y: number }[];
  fill: string;
  stroke: string;
  label?: string;
  /** Centro en mm (para colocar texto). */
  centerMm: { x: number; y: number };
};

export type SiteSvgModel = {
  /** viewBox SVG (sin unidad). */
  viewBox: { x: number; y: number; width: number; height: number };
  /** Polígono del sitio cerrado, en coordenadas del viewBox. */
  sitePoints: { x: number; y: number }[];
  /** Rectángulos de equipos. */
  equipment: SvgRect[];
  /** Información de escala (m por unidad de viewBox). */
  scale: {
    mPerUnit: number;
    barLengthM: number;
    barLengthUnits: number;
  };
  /** Bounding box útil (m local). */
  bboxLocalM: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    widthM: number;
    heightM: number;
  };
  /** Indicador de norte (norte real está hacia y- en sistema local). */
  northArrow: { x: number; y: number; size: number };
};

const PADDING_M = 30;

/**
 * Equipment site-plan palette (Apple-DNA): the BESS containers carry the single
 * accent (blue); every other equipment class uses a graphite tonal ramp so the
 * plan reads monochrome-plus-accent. Exported as the SINGLE source consumed by
 * BOTH the SVG renderer (`COLOR_BY_TYPE`) and the legend in
 * `pdfProjectSections.tsx`, so the map and its key can never disagree.
 */
export const EQUIPMENT_PLAN_PALETTE: Record<
  string,
  { fill: string; stroke: string; label: string }
> = {
  battery_container: { fill: "#d6e8f5", stroke: "#0071e3", label: "Contenedor BESS" },
  pcs_mv_station: { fill: "#e2e8f0", stroke: "#3a3a3c", label: "Estación PCS/MV" },
  mv_transformer: { fill: "#eef2f6", stroke: "#57637a", label: "Transformador MT" },
  substation_area: { fill: "#f1f5f9", stroke: "#57637a", label: "Subestación" },
  default: { fill: "#f5f5f7", stroke: "#94a3b8", label: "Otro equipo" },
};

const COLOR_BY_TYPE: Record<string, { fill: string; stroke: string }> =
  EQUIPMENT_PLAN_PALETTE;

function chooseScaleBar(widthM: number): number {
  // Elige una longitud "redonda" para la barra de escala (~10% del ancho).
  const candidates = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  const target = widthM * 0.18;
  let best = candidates[0];
  for (const c of candidates) {
    if (Math.abs(c - target) < Math.abs(best - target)) best = c;
  }
  return best;
}

export function buildSiteSvg(args: {
  polygon: LngLat[];
  anchor: ProjectAnchor | null;
  placed: PlacedEquipment[];
  /** Ancho aproximado del viewBox; alto se calcula respetando aspect ratio. */
  viewBoxWidth?: number;
}): SiteSvgModel | null {
  if (!args.anchor || args.polygon.length < 3) return null;

  const sitePointsLocal: LocalPoint[] = args.polygon.map((p) =>
    toLocal(p, args.anchor!)
  );

  // Bounding box considerando polígono + esquinas de equipos rotados.
  const pts: LocalPoint[] = [...sitePointsLocal];
  type EquipRect = {
    spec: (typeof equipmentCatalog)[number];
    corners: LocalPoint[];
    center: LocalPoint;
    placed: PlacedEquipment;
  };
  const equipRects: EquipRect[] = [];

  for (const item of args.placed) {
    const spec = equipmentCatalog.find((s) => s.id === item.equipmentSpecId);
    if (!spec) continue;
    const center = toLocal(item.anchor, args.anchor);
    const corners = rectCorners({
      center,
      length_m: spec.footprint.length_m,
      width_m: spec.footprint.width_m,
      rotation_deg: item.rotation_deg,
    });
    equipRects.push({ spec, corners, center, placed: item });
    pts.push(...corners);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x_m < minX) minX = p.x_m;
    if (p.x_m > maxX) maxX = p.x_m;
    if (p.y_m < minY) minY = p.y_m;
    if (p.y_m > maxY) maxY = p.y_m;
  }
  minX -= PADDING_M;
  maxX += PADDING_M;
  minY -= PADDING_M;
  maxY += PADDING_M;

  const widthM = maxX - minX;
  const heightM = maxY - minY;

  const viewBoxWidth = args.viewBoxWidth ?? 1000;
  const mPerUnit = widthM / viewBoxWidth;
  const viewBoxHeight = heightM / mPerUnit;

  // En coordenadas locales, el eje y crece hacia el norte. En SVG el eje y
  // crece hacia abajo. Para que el norte aparezca hacia arriba en el SVG,
  // invertimos la coordenada y.
  const project = (p: LocalPoint): { x: number; y: number } => ({
    x: (p.x_m - minX) / mPerUnit,
    y: (maxY - p.y_m) / mPerUnit,
  });

  const sitePoints = sitePointsLocal.map(project);

  const equipment: SvgRect[] = equipRects.map((er) => {
    const color = COLOR_BY_TYPE[er.spec.type] ?? COLOR_BY_TYPE.default;
    return {
      points: er.corners.map(project),
      fill: color.fill,
      stroke: color.stroke,
      label: er.spec.label,
      centerMm: project(er.center),
    };
  });

  const barLengthM = chooseScaleBar(widthM);
  const barLengthUnits = barLengthM / mPerUnit;

  return {
    viewBox: { x: 0, y: 0, width: viewBoxWidth, height: viewBoxHeight },
    sitePoints,
    equipment,
    scale: {
      mPerUnit,
      barLengthM,
      barLengthUnits,
    },
    bboxLocalM: {
      minX,
      maxX,
      minY,
      maxY,
      widthM,
      heightM,
    },
    northArrow: {
      x: viewBoxWidth * 0.94,
      y: viewBoxHeight * 0.08,
      size: Math.min(viewBoxWidth, viewBoxHeight) * 0.05,
    },
  };
}

/**
 * Conviene exponer un helper para serializar a path SVG (útil en tests y
 * en casos donde no se quiere depender de react-pdf).
 */
export function svgPolygonPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const head = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  const rest = points
    .slice(1)
    .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  return `${head} ${rest} Z`;
}
