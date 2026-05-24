import { equipmentCatalog } from "@/data/equipmentCatalog";
import {
  allCornersInsidePolygon,
  pointInPolygon,
  rectanglesIntersect,
} from "@/lib/geometry/collision";
import {
  distanceBetweenRectangles,
  distanceRectToPolygonBoundary,
} from "@/lib/geometry/distance";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import type { RegulatoryRuleSet } from "@/types/bessLayoutTypes";
import type { PlacedEquipment } from "@/types/equipment";
import type {
  LngLat,
  LocalPoint,
  ProjectAnchor,
  RotatedRectLocal,
} from "@/types/geometry";

/**
 * Subconjunto de reglas normativas que necesita la reparacion automatica.
 * Los valores se tratan como preliminary_assumption: provienen del perfil
 * normativo activo, no de un calculo de ingenieria certificado.
 */
export type LayoutRepairRules = Pick<
  RegulatoryRuleSet,
  "bessToBess_m" | "bessToPropertyLine_m" | "electricalFrontWorkingClearance_m"
>;

/** Compactacion centripeta opcional: tira los equipos movibles al centroide. */
export type LayoutCompactionOptions = {
  /** Metros que cada equipo movible se acerca al centroide por iteracion. */
  strengthMPerIter: number;
  /** Cuantas iteraciones aplica la fuerza centripeta antes de soltar. */
  iterations: number;
};

export type LayoutRepairRequest = {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  /** Poligono del terreno: limite duro que ningun equipo movido puede cruzar. */
  polygon: LngLat[];
  rules: LayoutRepairRules;
  /**
   * Zona de reparacion opcional. Si tiene 3+ vertices, solo se reordenan los
   * equipos cuyo centro queda dentro; el resto queda fijo como obstaculo.
   */
  repairZone?: LngLat[];
  /** Equipos que deben permanecer fijos aunque entren en la zona. */
  lockedIds?: string[];
  /** Si se entrega, agrega una pasada centripeta para compactar la seleccion. */
  compaction?: LayoutCompactionOptions;
};

export type LayoutRepairResult = {
  status: "success" | "partial" | "error";
  message: string;
  placed: PlacedEquipment[];
  diagnostics: {
    equipmentCount: number;
    /** Equipos que la herramienta puede mover (dentro de la zona, o todos). */
    movableCount: number;
    zoneApplied: boolean;
    initialConflicts: number;
    remainingConflicts: number;
    initialOverlaps: number;
    remainingOverlaps: number;
    movedCount: number;
    maxDisplacementM: number;
    iterations: number;
  };
};

type NodeKind = "battery" | "pcs" | "other";

type RepairNode = {
  index: number;
  kind: NodeKind;
  movable: boolean;
  center: LocalPoint;
  origin: LocalPoint;
  length_m: number;
  width_m: number;
  rotation_deg: number;
  radius_m: number;
};

const MAX_ITERATIONS = 260;
const RELAXATION = 0.85;
const SEPARATION_MARGIN_M = 0.1;
const TOLERANCE_M = 0.05;
const MOVED_THRESHOLD_M = 0.05;

function nodeKind(type: string): NodeKind {
  if (type === "battery_container") return "battery";
  if (type === "pcs_mv_station") return "pcs";
  return "other";
}

/** Holgura minima requerida entre dos equipos segun su tipo. */
function requiredClearance(
  a: RepairNode,
  b: RepairNode,
  rules: LayoutRepairRules
): number {
  if (a.kind === "pcs" || b.kind === "pcs") {
    return rules.electricalFrontWorkingClearance_m;
  }
  return rules.bessToBess_m;
}

function rectOf(node: RepairNode): RotatedRectLocal {
  return {
    center: node.center,
    length_m: node.length_m,
    width_m: node.width_m,
    rotation_deg: node.rotation_deg,
  };
}

/** Radio de la sombra del rectangulo proyectada sobre el eje unitario (ux, uy). */
function projectionRadius(node: RepairNode, ux: number, uy: number): number {
  const theta = (node.rotation_deg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const lengthDot = Math.abs(cos * ux + sin * uy);
  const widthDot = Math.abs(-sin * ux + cos * uy);
  return (node.length_m / 2) * lengthDot + (node.width_m / 2) * widthDot;
}

function polygonCentroid(polygon: LocalPoint[]): LocalPoint {
  let x = 0;
  let y = 0;
  for (const point of polygon) {
    x += point.x_m;
    y += point.y_m;
  }
  return { x_m: x / polygon.length, y_m: y / polygon.length };
}

type ConflictCount = {
  total: number;
  overlaps: number;
};

/**
 * Cuenta conflictos que la herramienta es responsable de resolver: solo los
 * que involucran al menos un equipo movible. Pares de dos equipos fijos se
 * ignoran (no se pueden corregir sin moverlos).
 */
function countConflicts(
  nodes: RepairNode[],
  sitePolygon: LocalPoint[],
  rules: LayoutRepairRules
): ConflictCount {
  let total = 0;
  let overlaps = 0;
  const setback = rules.bessToPropertyLine_m;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (!a.movable && !b.movable) continue;
      const centerDist = Math.hypot(
        b.center.x_m - a.center.x_m,
        b.center.y_m - a.center.y_m
      );
      const required = requiredClearance(a, b, rules);
      if (centerDist > a.radius_m + b.radius_m + required) continue;
      const rectA = rectOf(a);
      const rectB = rectOf(b);
      if (rectanglesIntersect(rectA, rectB)) {
        total += 1;
        overlaps += 1;
        continue;
      }
      const gap = distanceBetweenRectangles(rectA, rectB);
      if (gap < required - TOLERANCE_M) total += 1;
    }
  }

  if (sitePolygon.length >= 3) {
    for (const node of nodes) {
      if (!node.movable) continue;
      const rect = rectOf(node);
      if (!allCornersInsidePolygon(rect, sitePolygon)) {
        total += 1;
        continue;
      }
      if (
        distanceRectToPolygonBoundary(rect, sitePolygon) <
        setback - TOLERANCE_M
      ) {
        total += 1;
      }
    }
  }

  return { total, overlaps };
}

/**
 * Empuja los pares en conflicto separando sus centros sobre la linea que los
 * une. Equipos fijos (obstaculos) no se mueven: el equipo movible absorbe el
 * desplazamiento completo del par.
 */
function separationPass(nodes: RepairNode[], rules: LayoutRepairRules): boolean {
  const count = nodes.length;
  const dispX = new Float64Array(count);
  const dispY = new Float64Array(count);
  const hits = new Int32Array(count);

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (!a.movable && !b.movable) continue;

      let dx = b.center.x_m - a.center.x_m;
      let dy = b.center.y_m - a.center.y_m;
      let dist = Math.hypot(dx, dy);
      const required = requiredClearance(a, b, rules);

      if (dist > a.radius_m + b.radius_m + required) continue;

      if (dist < 1e-6) {
        // Centros coincidentes: separa en una direccion deterministica.
        dx = 1;
        dy = 0;
        dist = 0;
      }
      const ux = dist < 1e-6 ? 1 : dx / dist;
      const uy = dist < 1e-6 ? 0 : dy / dist;

      const extentA = projectionRadius(a, ux, uy);
      const extentB = projectionRadius(b, ux, uy);
      const desired = extentA + extentB + required + SEPARATION_MARGIN_M;
      if (dist >= desired - TOLERANCE_M) continue;

      const deficit = desired - dist;
      if (a.movable && b.movable) {
        const half = deficit / 2;
        dispX[i] -= ux * half;
        dispY[i] -= uy * half;
        hits[i] += 1;
        dispX[j] += ux * half;
        dispY[j] += uy * half;
        hits[j] += 1;
      } else if (a.movable) {
        dispX[i] -= ux * deficit;
        dispY[i] -= uy * deficit;
        hits[i] += 1;
      } else {
        dispX[j] += ux * deficit;
        dispY[j] += uy * deficit;
        hits[j] += 1;
      }
    }
  }

  let moved = false;
  for (let i = 0; i < count; i++) {
    if (hits[i] === 0) continue;
    const node = nodes[i];
    if (!node.movable) continue;
    const shiftX = (dispX[i] / hits[i]) * RELAXATION;
    const shiftY = (dispY[i] / hits[i]) * RELAXATION;
    if (Math.abs(shiftX) < 1e-5 && Math.abs(shiftY) < 1e-5) continue;
    node.center = {
      x_m: node.center.x_m + shiftX,
      y_m: node.center.y_m + shiftY,
    };
    moved = true;
  }
  return moved;
}

/**
 * Empuja los equipos movibles hacia su propio centroide, una pequena fraccion
 * por iteracion. La separacion y el limite del terreno corrigen los conflictos
 * que la compactacion provoque, llegando a un equilibrio mas denso.
 */
function compactionPass(nodes: RepairNode[], strength: number): void {
  let cx = 0;
  let cy = 0;
  let count = 0;
  for (const node of nodes) {
    if (!node.movable) continue;
    cx += node.center.x_m;
    cy += node.center.y_m;
    count += 1;
  }
  if (count < 2) return;
  cx /= count;
  cy /= count;
  for (const node of nodes) {
    if (!node.movable) continue;
    const dx = cx - node.center.x_m;
    const dy = cy - node.center.y_m;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-4) continue;
    const step = Math.min(strength, dist);
    node.center = {
      x_m: node.center.x_m + (dx / dist) * step,
      y_m: node.center.y_m + (dy / dist) * step,
    };
  }
}

/** Reubica hacia el centroide los equipos movibles fuera del terreno. */
function boundaryPass(
  nodes: RepairNode[],
  sitePolygon: LocalPoint[],
  centroid: LocalPoint,
  rules: LayoutRepairRules
): boolean {
  const setback = rules.bessToPropertyLine_m;
  let moved = false;

  for (const node of nodes) {
    if (!node.movable) continue;
    const rect = rectOf(node);
    const inside = allCornersInsidePolygon(rect, sitePolygon);
    const boundaryDist = inside
      ? distanceRectToPolygonBoundary(rect, sitePolygon)
      : 0;
    if (inside && boundaryDist >= setback - TOLERANCE_M) continue;

    let dx = centroid.x_m - node.center.x_m;
    let dy = centroid.y_m - node.center.y_m;
    const distToCentroid = Math.hypot(dx, dy);
    if (distToCentroid < 1e-6) continue;
    dx /= distToCentroid;
    dy /= distToCentroid;

    const step = inside
      ? setback - boundaryDist + 0.1
      : Math.max(2, distToCentroid * 0.12);

    node.center = {
      x_m: node.center.x_m + dx * step,
      y_m: node.center.y_m + dy * step,
    };
    moved = true;
  }
  return moved;
}

/**
 * Reparacion espacial preliminar: empuja los equipos colocados para resolver
 * solapamientos y separaciones insuficientes, manteniendolos dentro del
 * terreno. Si se entrega una zona de reparacion, solo se reordenan los equipos
 * dentro de ella y el resto actua como obstaculo fijo. No es una optimizacion
 * de layout ni reemplaza ingenieria de detalle.
 */
export function repairLayout(request: LayoutRepairRequest): LayoutRepairResult {
  const { placed, polygon, rules, repairZone } = request;

  const emptyDiagnostics = {
    equipmentCount: placed.length,
    movableCount: 0,
    zoneApplied: false,
    initialConflicts: 0,
    remainingConflicts: 0,
    initialOverlaps: 0,
    remainingOverlaps: 0,
    movedCount: 0,
    maxDisplacementM: 0,
    iterations: 0,
  };

  if (placed.length === 0) {
    return {
      status: "error",
      message: "No placed equipment to repair. Place or generate equipment first.",
      placed,
      diagnostics: emptyDiagnostics,
    };
  }

  const resolvedAnchor: ProjectAnchor | null =
    request.anchor ??
    (placed[0]
      ? { lng0: placed[0].anchor.lng, lat0: placed[0].anchor.lat }
      : null);

  if (!resolvedAnchor) {
    return {
      status: "error",
      message: "Project anchor is missing; cannot repair the layout.",
      placed,
      diagnostics: emptyDiagnostics,
    };
  }

  const siteLocalPolygon: LocalPoint[] =
    polygon.length >= 3
      ? polygon.map((vertex) => toLocal(vertex, resolvedAnchor))
      : [];
  const hasSitePolygon = siteLocalPolygon.length >= 3;

  const zoneLocalPolygon: LocalPoint[] =
    repairZone && repairZone.length >= 3
      ? repairZone.map((vertex) => toLocal(vertex, resolvedAnchor))
      : [];
  const zoneApplied = zoneLocalPolygon.length >= 3;
  const lockedSet = new Set(request.lockedIds ?? []);

  const nodes: RepairNode[] = [];
  placed.forEach((item, index) => {
    const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
    if (!spec) return;
    const center = toLocal(item.anchor, resolvedAnchor);
    const inZone = zoneApplied ? pointInPolygon(center, zoneLocalPolygon) : true;
    const movable = inZone && !lockedSet.has(item.id);
    nodes.push({
      index,
      kind: nodeKind(spec.type),
      movable,
      center,
      origin: center,
      length_m: spec.footprint.length_m,
      width_m: spec.footprint.width_m,
      rotation_deg: item.rotation_deg,
      radius_m: 0.5 * Math.hypot(spec.footprint.length_m, spec.footprint.width_m),
    });
  });

  const movableCount = nodes.filter((node) => node.movable).length;

  if (zoneApplied && movableCount === 0) {
    return {
      status: "error",
      message:
        "The selected zone does not contain any equipment. Draw the zone over the items to reorder.",
      placed,
      diagnostics: { ...emptyDiagnostics, equipmentCount: nodes.length, zoneApplied: true },
    };
  }

  if (nodes.length < 2 && !hasSitePolygon) {
    return {
      status: "error",
      message: "Nothing to repair: need at least two equipment items or a site polygon.",
      placed,
      diagnostics: {
        ...emptyDiagnostics,
        equipmentCount: nodes.length,
        movableCount,
        zoneApplied,
      },
    };
  }

  const centroid = hasSitePolygon ? polygonCentroid(siteLocalPolygon) : null;
  const initial = countConflicts(nodes, siteLocalPolygon, rules);

  if (initial.total === 0 && !request.compaction) {
    return {
      status: "success",
      message: zoneApplied
        ? "Equipment in the selected zone already satisfies spacing and boundary rules."
        : "Layout already satisfies spacing and boundary rules. No changes were applied.",
      placed,
      diagnostics: {
        ...emptyDiagnostics,
        equipmentCount: nodes.length,
        movableCount,
        zoneApplied,
      },
    };
  }

  const compaction = request.compaction;
  let iterations = 0;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    iterations = iter + 1;
    const compactionActive = !!compaction && iter < compaction.iterations;
    if (compactionActive && compaction) {
      compactionPass(nodes, compaction.strengthMPerIter);
    }
    const movedSeparation = separationPass(nodes, rules);
    const movedBoundary =
      hasSitePolygon && centroid
        ? boundaryPass(nodes, siteLocalPolygon, centroid, rules)
        : false;
    if (!compactionActive && !movedSeparation && !movedBoundary) break;
  }

  const remaining = countConflicts(nodes, siteLocalPolygon, rules);

  let movedCount = 0;
  let maxDisplacementM = 0;
  const updated = placed.slice();
  for (const node of nodes) {
    const displacement = Math.hypot(
      node.center.x_m - node.origin.x_m,
      node.center.y_m - node.origin.y_m
    );
    if (displacement <= MOVED_THRESHOLD_M) continue;
    movedCount += 1;
    maxDisplacementM = Math.max(maxDisplacementM, displacement);
    updated[node.index] = {
      ...placed[node.index],
      anchor: toLngLat(node.center, resolvedAnchor),
    };
  }

  const diagnostics = {
    equipmentCount: nodes.length,
    movableCount,
    zoneApplied,
    initialConflicts: initial.total,
    remainingConflicts: remaining.total,
    initialOverlaps: initial.overlaps,
    remainingOverlaps: remaining.overlaps,
    movedCount,
    maxDisplacementM,
    iterations,
  };

  const scope = zoneApplied ? " inside the selected zone" : "";

  if (remaining.total === 0) {
    return {
      status: "success",
      message: `Repaired ${initial.total} conflict(s)${scope}: moved ${movedCount} item(s) to satisfy spacing and boundary rules.`,
      placed: updated,
      diagnostics,
    };
  }

  if (remaining.total < initial.total) {
    return {
      status: "partial",
      message: `Reduced conflicts${scope} from ${initial.total} to ${remaining.total}. The remaining ones do not fit; reduce equipment count or enlarge the available space.`,
      placed: updated,
      diagnostics,
    };
  }

  return {
    status: "error",
    message:
      "Could not resolve the layout within the available space. Reduce equipment count or enlarge the site polygon.",
    placed,
    diagnostics: { ...diagnostics, remainingConflicts: initial.total },
  };
}
