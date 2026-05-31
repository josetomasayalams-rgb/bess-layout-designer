import type { LngLat, LocalPoint, ProjectAnchor } from "@/types/geometry";
import type {
  SmartSiteFitCandidate,
  SmartSiteFitPreview,
  SmartSiteFitPreviewBlock,
} from "./smartSiteFitTypes";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLocal } from "@/lib/geometry/projection";
import { rectCorners } from "@/lib/geometry/rectangles";
import { DEFAULT_PERFORMANCE_BUDGET } from "./smartSiteFitPerformance";

// O(1) spec lookup, shared across previews (mirrors smartSiteFitScoring).
const specById = new Map(equipmentCatalog.map((s) => [s.id, s]));

// Fallback footprint when a spec id is unknown — same defaults the scorer uses.
const FALLBACK_LENGTH_M = 5;
const FALLBACK_WIDTH_M = 2;

// Coarse grid resolution used only on the simplified (aggregated) path. Caps the
// rendered rect count at GRID*GRID regardless of how many containers a giant
// park holds, so the SVG stays light without losing the overall silhouette.
const AGGREGATION_GRID = 28;

export interface BuildPreviewOptions {
  /** Project polygon (LngLat). When present, drawn as the site outline. */
  polygon?: LngLat[];
  /** Local frame origin. Defaults to the polygon's / first item's first vertex. */
  anchor?: ProjectAnchor;
  /** Normalized length of the longer axis of the viewbox. Default 100. */
  viewSize?: number;
  /** Above this item count the preview aggregates spatially. */
  maxBlocks?: number;
}

/**
 * Build a normalized, render-ready schematic of a candidate's block layout.
 *
 * Pure and framework-agnostic: the single source of truth is
 * `candidate.placedEquipment`, exactly like the map renderer, so the preview
 * never drifts from what "Apply" would place. Each item is projected to its
 * axis-aligned footprint bbox in a local meters frame, then scaled into a
 * normalized viewbox (longer axis = `viewSize`, aspect preserved). Geographic
 * north renders upward (SVG `y` grows downward, so it is flipped).
 *
 * For very large parks the block list is aggregated into a coarse occupancy
 * grid (`simplified === true`) so the SVG never has to draw thousands of nodes;
 * applying still places the full equipment list. Integrated presets resolve to
 * `battery_container` in the catalog, so their units classify as `"bess"` and
 * no separate PCS appears — matching the integrated architecture.
 */
export function buildSmartSiteFitPreview(
  candidate: SmartSiteFitCandidate,
  opts: BuildPreviewOptions = {}
): SmartSiteFitPreview {
  const viewSize = opts.viewSize ?? 100;
  const maxBlocks =
    opts.maxBlocks ?? DEFAULT_PERFORMANCE_BUDGET.maxPreviewFeaturesBeforeSimplification;

  const placed = candidate.placedEquipment;
  const itemCount = placed.length;

  if (itemCount === 0) {
    return { width: viewSize, height: viewSize, blocks: [], itemCount: 0, simplified: false };
  }

  // Resolve a single consistent local frame for both equipment and the site.
  const anchor: ProjectAnchor =
    opts.anchor ??
    (opts.polygon && opts.polygon.length > 0
      ? { lng0: opts.polygon[0].lng, lat0: opts.polygon[0].lat }
      : { lng0: placed[0].anchor.lng, lat0: placed[0].anchor.lat });

  interface RawBlock {
    kind: "bess" | "pcs";
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    blockIndex: number;
  }

  const raw: RawBlock[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of placed) {
    const spec = specById.get(item.equipmentSpecId);
    const length_m = spec?.footprint.length_m ?? FALLBACK_LENGTH_M;
    const width_m = spec?.footprint.width_m ?? FALLBACK_WIDTH_M;
    const center = toLocal(item.anchor, anchor);
    const corners = rectCorners({ center, length_m, width_m, rotation_deg: item.rotation_deg });

    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    for (const c of corners) {
      if (c.x_m < bx0) bx0 = c.x_m;
      if (c.x_m > bx1) bx1 = c.x_m;
      if (c.y_m < by0) by0 = c.y_m;
      if (c.y_m > by1) by1 = c.y_m;
    }

    const kind: "bess" | "pcs" = spec?.type === "pcs_mv_station" ? "pcs" : "bess";
    raw.push({ kind, x0: bx0, y0: by0, x1: bx1, y1: by1, blockIndex: item.blockIndex ?? 0 });

    if (bx0 < minX) minX = bx0;
    if (by0 < minY) minY = by0;
    if (bx1 > maxX) maxX = bx1;
    if (by1 > maxY) maxY = by1;
  }

  // Frame the view around the site polygon too, when supplied.
  let siteLocal: LocalPoint[] | undefined;
  if (opts.polygon && opts.polygon.length >= 3) {
    siteLocal = opts.polygon.map((p) => toLocal(p, anchor));
    for (const p of siteLocal) {
      if (p.x_m < minX) minX = p.x_m;
      if (p.y_m < minY) minY = p.y_m;
      if (p.x_m > maxX) maxX = p.x_m;
      if (p.y_m > maxY) maxY = p.y_m;
    }
  }

  const spanX = Math.max(maxX - minX, 0.1);
  const spanY = Math.max(maxY - minY, 0.1);
  const scale = viewSize / Math.max(spanX, spanY);
  const width = spanX * scale;
  const height = spanY * scale;

  const toViewX = (xm: number) => (xm - minX) * scale;
  // Flip Y so geographic north renders upward (SVG y grows downward).
  const toViewY = (ym: number) => (maxY - ym) * scale;

  const site = siteLocal
    ? { points: siteLocal.map((p) => ({ x: toViewX(p.x_m), y: toViewY(p.y_m) })) }
    : undefined;

  // Light path: one rect per equipment item.
  if (itemCount <= maxBlocks) {
    const blocks: SmartSiteFitPreviewBlock[] = raw.map((b) => ({
      kind: b.kind,
      x: toViewX(b.x0),
      y: toViewY(b.y1), // top edge after the Y flip
      w: (b.x1 - b.x0) * scale,
      h: (b.y1 - b.y0) * scale,
      blockIndex: b.blockIndex,
    }));
    return { width, height, site, blocks, itemCount, simplified: false };
  }

  // Heavy path: aggregate into a coarse occupancy grid. A cell holding any PCS
  // is flagged "pcs" so conversion hotspots remain visible at a glance.
  const cellW = spanX / AGGREGATION_GRID;
  const cellH = spanY / AGGREGATION_GRID;
  const present: boolean[] = new Array(AGGREGATION_GRID * AGGREGATION_GRID).fill(false);
  const hasPcs: boolean[] = new Array(AGGREGATION_GRID * AGGREGATION_GRID).fill(false);

  for (const b of raw) {
    const midX = (b.x0 + b.x1) / 2;
    const midY = (b.y0 + b.y1) / 2;
    const cx = Math.min(AGGREGATION_GRID - 1, Math.max(0, Math.floor((midX - minX) / cellW)));
    const cy = Math.min(AGGREGATION_GRID - 1, Math.max(0, Math.floor((midY - minY) / cellH)));
    const idx = cy * AGGREGATION_GRID + cx;
    present[idx] = true;
    if (b.kind === "pcs") hasPcs[idx] = true;
  }

  const blocks: SmartSiteFitPreviewBlock[] = [];
  let bucket = 0;
  for (let cy = 0; cy < AGGREGATION_GRID; cy++) {
    for (let cx = 0; cx < AGGREGATION_GRID; cx++) {
      const idx = cy * AGGREGATION_GRID + cx;
      if (!present[idx]) continue;
      const x0 = minX + cx * cellW;
      const y1 = minY + (cy + 1) * cellH;
      blocks.push({
        kind: hasPcs[idx] ? "pcs" : "bess",
        x: toViewX(x0),
        y: toViewY(y1),
        w: cellW * scale,
        h: cellH * scale,
        blockIndex: bucket++,
      });
    }
  }

  return { width, height, site, blocks, itemCount, simplified: true };
}
