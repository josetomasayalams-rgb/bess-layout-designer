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
import {
  buildRepairClusters,
  clusterIdByNode,
  multiNodeMovableClusterCount,
  scoreRepairCandidate,
  type ClusterableNode,
  type RepairCandidateMetrics,
  type RepairCandidateScore,
  type RepairCluster,
} from "@/lib/layout/layoutRepairClusters";
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

/** Estrategia de reparacion preliminar elegida por el motor. */
export type RepairStrategy =
  | "none"
  | "cluster-rigid"
  | "cluster-recenter"
  | "per-node";

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
    /** Cuantos bloques/clusters movibles se identificaron. */
    clusterCount: number;
    /** Estrategia preliminar aplicada para reordenar. */
    strategy: RepairStrategy;
    /** Score geometrico/visual del candidato elegido (preliminar). */
    score: RepairCandidateScore | null;
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
  /** groupId ?? blockId del equipo (null si esta suelto). */
  groupKey: string | null;
  /** id del cluster rigido al que pertenece (asignado en runtime). */
  clusterId: string;
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
  /** Equipos movibles fuera del terreno. */
  outside: number;
  /** Pares con separacion inferior a la minima (sin solaparse). */
  minSpacing: number;
  /** Equipos movibles dentro pero por debajo del margen al deslinde. */
  boundary: number;
};

/**
 * Cuenta conflictos que la herramienta es responsable de resolver: solo los
 * que involucran al menos un equipo movible. Pares de dos equipos fijos se
 * ignoran (no se pueden corregir sin moverlos). Tambien desglosa el tipo de
 * incumplimiento para alimentar el scoring geometrico de los candidatos.
 */
function countConflicts(
  nodes: RepairNode[],
  sitePolygon: LocalPoint[],
  rules: LayoutRepairRules
): ConflictCount {
  let total = 0;
  let overlaps = 0;
  let outside = 0;
  let minSpacing = 0;
  let boundary = 0;
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
      if (gap < required - TOLERANCE_M) {
        total += 1;
        minSpacing += 1;
      }
    }
  }

  if (sitePolygon.length >= 3) {
    for (const node of nodes) {
      if (!node.movable) continue;
      const rect = rectOf(node);
      if (!allCornersInsidePolygon(rect, sitePolygon)) {
        total += 1;
        outside += 1;
        continue;
      }
      if (
        distanceRectToPolygonBoundary(rect, sitePolygon) <
        setback - TOLERANCE_M
      ) {
        total += 1;
        boundary += 1;
      }
    }
  }

  return { total, overlaps, outside, minSpacing, boundary };
}

/**
 * Empuja los pares en conflicto separando sus centros sobre la linea que los
 * une. Equipos fijos (obstaculos) no se mueven: el equipo movible absorbe el
 * desplazamiento completo del par.
 *
 * Es consciente de clusters: los pares dentro de un mismo bloque/cluster NO se
 * empujan (se preserva la disposicion interna: filas, matriz y la cercania de
 * cada PCS/MV a sus BESS). El desplazamiento de cada cluster se promedia entre
 * sus miembros y se aplica de forma rigida, de modo que un bloque se mueve
 * completo en vez de dispersarse equipo por equipo. Para equipos sueltos (un
 * solo nodo por cluster) el comportamiento es identico al empuje individual.
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
      // Preserva la forma interna del bloque: no se empujan equipos del mismo
      // cluster entre si.
      if (a.movable && b.movable && a.clusterId === b.clusterId) continue;

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

  // Promedia el desplazamiento por cluster para mover cada bloque de forma
  // rigida (todos sus miembros reciben la misma traslacion).
  const clusterSumX = new Map<string, number>();
  const clusterSumY = new Map<string, number>();
  const clusterHits = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    if (hits[i] === 0) continue;
    const node = nodes[i];
    if (!node.movable) continue;
    clusterSumX.set(node.clusterId, (clusterSumX.get(node.clusterId) ?? 0) + dispX[i]);
    clusterSumY.set(node.clusterId, (clusterSumY.get(node.clusterId) ?? 0) + dispY[i]);
    clusterHits.set(node.clusterId, (clusterHits.get(node.clusterId) ?? 0) + hits[i]);
  }

  let moved = false;
  for (let i = 0; i < count; i++) {
    const node = nodes[i];
    if (!node.movable) continue;
    const totalHits = clusterHits.get(node.clusterId);
    if (!totalHits) continue;
    const shiftX = ((clusterSumX.get(node.clusterId) ?? 0) / totalHits) * RELAXATION;
    const shiftY = ((clusterSumY.get(node.clusterId) ?? 0) / totalHits) * RELAXATION;
    if (Math.abs(shiftX) < 1e-5 && Math.abs(shiftY) < 1e-5) continue;
    node.center = {
      x_m: node.center.x_m + shiftX,
      y_m: node.center.y_m + shiftY,
    };
    moved = true;
  }
  return moved;
}

/** Agrupa indices de nodos movibles por clusterId (bloques rigidos). */
function movableClusterGroups(nodes: RepairNode[]): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  nodes.forEach((node, index) => {
    if (!node.movable) return;
    const list = groups.get(node.clusterId);
    if (list) list.push(index);
    else groups.set(node.clusterId, [index]);
  });
  return groups;
}

/**
 * Acerca los clusters movibles hacia el centroide global del conjunto, una
 * pequena fraccion por iteracion. Cada cluster se traslada completo (rigido),
 * de modo que la compactacion densifica el layout sin romper los bloques. La
 * separacion y el limite del terreno corrigen los conflictos que provoque.
 */
function compactionPass(nodes: RepairNode[], strength: number): void {
  const groups = movableClusterGroups(nodes);
  if (groups.size < 2) return;
  // Centroide global ponderado por los centroides de cada cluster.
  let gx = 0;
  let gy = 0;
  const clusterCenters = new Map<string, LocalPoint>();
  for (const [id, indices] of groups) {
    let cx = 0;
    let cy = 0;
    for (const index of indices) {
      cx += nodes[index].center.x_m;
      cy += nodes[index].center.y_m;
    }
    const center = { x_m: cx / indices.length, y_m: cy / indices.length };
    clusterCenters.set(id, center);
    gx += center.x_m;
    gy += center.y_m;
  }
  gx /= groups.size;
  gy /= groups.size;

  for (const [id, indices] of groups) {
    const center = clusterCenters.get(id)!;
    const dx = gx - center.x_m;
    const dy = gy - center.y_m;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-4) continue;
    const step = Math.min(strength, dist);
    const shiftX = (dx / dist) * step;
    const shiftY = (dy / dist) * step;
    for (const index of indices) {
      nodes[index].center = {
        x_m: nodes[index].center.x_m + shiftX,
        y_m: nodes[index].center.y_m + shiftY,
      };
    }
  }
}

/**
 * Reubica hacia el centroide del terreno los clusters movibles que tienen al
 * menos un equipo fuera del poligono o por debajo del margen al deslinde. El
 * cluster se traslada completo, preservando su forma interna.
 */
function boundaryPass(
  nodes: RepairNode[],
  sitePolygon: LocalPoint[],
  centroid: LocalPoint,
  rules: LayoutRepairRules
): boolean {
  const setback = rules.bessToPropertyLine_m;
  const groups = movableClusterGroups(nodes);
  let moved = false;

  for (const indices of groups.values()) {
    // Peor violacion del cluster + su centroide.
    let worstStep = 0;
    let cx = 0;
    let cy = 0;
    for (const index of indices) {
      const node = nodes[index];
      cx += node.center.x_m;
      cy += node.center.y_m;
      const rect = rectOf(node);
      const inside = allCornersInsidePolygon(rect, sitePolygon);
      const boundaryDist = inside
        ? distanceRectToPolygonBoundary(rect, sitePolygon)
        : 0;
      if (inside && boundaryDist >= setback - TOLERANCE_M) continue;
      const step = inside ? setback - boundaryDist + 0.1 : 0;
      worstStep = Math.max(worstStep, step);
    }
    cx /= indices.length;
    cy /= indices.length;

    // Determina si algun miembro esta fuera (sin distancia conocida).
    const anyOutside = indices.some((index) => {
      const rect = rectOf(nodes[index]);
      return !allCornersInsidePolygon(rect, sitePolygon);
    });
    if (worstStep <= 0 && !anyOutside) continue;

    let dx = centroid.x_m - cx;
    let dy = centroid.y_m - cy;
    const distToCentroid = Math.hypot(dx, dy);
    if (distToCentroid < 1e-6) continue;
    dx /= distToCentroid;
    dy /= distToCentroid;

    const step = anyOutside
      ? Math.max(2, distToCentroid * 0.12, worstStep)
      : worstStep;

    for (const index of indices) {
      nodes[index].center = {
        x_m: nodes[index].center.x_m + dx * step,
        y_m: nodes[index].center.y_m + dy * step,
      };
    }
    moved = true;
  }
  return moved;
}

type RelaxationContext = {
  hasSitePolygon: boolean;
  siteLocalPolygon: LocalPoint[];
  centroid: LocalPoint | null;
  rules: LayoutRepairRules;
  compaction?: LayoutCompactionOptions;
};

/** Corre el ciclo de fuerzas (compactacion + separacion + limite) hasta converger. */
function runRelaxation(nodes: RepairNode[], ctx: RelaxationContext): number {
  let iterations = 0;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    iterations = iter + 1;
    const compactionActive = !!ctx.compaction && iter < ctx.compaction.iterations;
    if (compactionActive && ctx.compaction) {
      compactionPass(nodes, ctx.compaction.strengthMPerIter);
    }
    const movedSeparation = separationPass(nodes, ctx.rules);
    const movedBoundary =
      ctx.hasSitePolygon && ctx.centroid
        ? boundaryPass(nodes, ctx.siteLocalPolygon, ctx.centroid, ctx.rules)
        : false;
    if (!compactionActive && !movedSeparation && !movedBoundary) break;
  }
  return iterations;
}

/** Restaura cada nodo a su posicion original (para reusar el arreglo entre candidatos). */
function resetNodesToOrigin(nodes: RepairNode[]): void {
  for (const node of nodes) {
    node.center = { x_m: node.origin.x_m, y_m: node.origin.y_m };
  }
}

/**
 * Fraccion de bloques multi-equipo cuya forma interna se conservo (distancias
 * internas sin cambios apreciables). Las pasadas rigidas la mantienen ~1.0.
 */
function clusterShapePreservedFraction(
  nodes: RepairNode[],
  clusters: RepairCluster[]
): number {
  const multi = clusters.filter(
    (cluster) => cluster.movable && cluster.nodeIndices.length >= 2
  );
  if (multi.length === 0) return 1;
  let preserved = 0;
  for (const cluster of multi) {
    const idx = cluster.nodeIndices;
    let ok = true;
    for (let a = 0; a < idx.length && ok; a++) {
      for (let b = a + 1; b < idx.length; b++) {
        const na = nodes[idx[a]];
        const nb = nodes[idx[b]];
        const cur = Math.hypot(
          na.center.x_m - nb.center.x_m,
          na.center.y_m - nb.center.y_m
        );
        const orig = Math.hypot(
          na.origin.x_m - nb.origin.x_m,
          na.origin.y_m - nb.origin.y_m
        );
        if (Math.abs(cur - orig) > 0.5) {
          ok = false;
          break;
        }
      }
    }
    if (ok) preserved += 1;
  }
  return preserved / multi.length;
}

/** Calcula las metricas geometricas de un candidato ya relajado. */
function candidateMetrics(
  nodes: RepairNode[],
  clusters: RepairCluster[],
  remaining: ConflictCount
): RepairCandidateMetrics {
  let totalDisplacementM = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const batteries: LocalPoint[] = [];
  const pcs: LocalPoint[] = [];
  for (const node of nodes) {
    if (!node.movable) continue;
    totalDisplacementM += Math.hypot(
      node.center.x_m - node.origin.x_m,
      node.center.y_m - node.origin.y_m
    );
    minX = Math.min(minX, node.center.x_m);
    maxX = Math.max(maxX, node.center.x_m);
    minY = Math.min(minY, node.center.y_m);
    maxY = Math.max(maxY, node.center.y_m);
    if (node.kind === "battery") batteries.push(node.center);
    else if (node.kind === "pcs") pcs.push(node.center);
  }

  let avgPcsToBessM = 0;
  if (pcs.length > 0 && batteries.length > 0) {
    let sum = 0;
    for (const p of pcs) {
      let best = Infinity;
      for (const b of batteries) {
        best = Math.min(best, Math.hypot(p.x_m - b.x_m, p.y_m - b.y_m));
      }
      sum += best;
    }
    avgPcsToBessM = sum / pcs.length;
  }

  const movableBboxAreaM2 =
    Number.isFinite(minX) && maxX > minX && maxY > minY
      ? (maxX - minX) * (maxY - minY)
      : 0;

  return {
    collisions: remaining.overlaps,
    outsideCount: remaining.outside,
    minSpacingViolations: remaining.minSpacing,
    boundaryViolations: remaining.boundary,
    totalDisplacementM,
    avgPcsToBessM,
    movableBboxAreaM2,
    clusterShapePreserved: clusterShapePreservedFraction(nodes, clusters),
  };
}

/**
 * Reparacion espacial preliminar: empuja los equipos colocados para resolver
 * solapamientos y separaciones insuficientes, manteniendolos dentro del
 * terreno. Si se entrega una zona de reparacion, solo se reordenan los equipos
 * dentro de ella y el resto actua como obstaculo fijo. No es una optimizacion
 * de layout ni reemplaza ingenieria de detalle.
 *
 * Reordena por bloques (clusters rigidos) cuando el layout trae metadata de
 * grupo, preservando filas, matriz y la cercania PCS/MV-BESS. Genera mas de un
 * candidato geometrico y elige el de mejor score (primero menos incumplimientos
 * criticos, luego mejor orden visual y menor desplazamiento).
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
    clusterCount: 0,
    strategy: "none" as RepairStrategy,
    score: null,
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
      groupKey: item.groupId ?? item.blockId ?? null,
      // clusterId se asigna tras agrupar (los sueltos quedan `single:<index>`).
      clusterId: "",
    });
  });

  // Clusters rigidos: equipos con el mismo groupId/blockId se mueven juntos.
  const clusterables: ClusterableNode[] = nodes.map((node) => ({
    groupKey: node.groupKey,
    kind: node.kind,
    movable: node.movable,
    center: node.center,
    origin: node.origin,
    radius_m: node.radius_m,
  }));
  const clusters = buildRepairClusters(clusterables);
  const clusterIds = clusterIdByNode(clusterables, clusters);
  nodes.forEach((node, i) => {
    node.clusterId = clusterIds[i];
  });
  const movableClusterCount = clusters.filter((cluster) => cluster.movable).length;
  const hasRigidBlocks = multiNodeMovableClusterCount(clusters) > 0;

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
  const ctx: RelaxationContext = {
    hasSitePolygon,
    siteLocalPolygon,
    centroid,
    rules,
    compaction,
  };

  type Candidate = {
    strategy: RepairStrategy;
    centers: LocalPoint[];
    remaining: ConflictCount;
    iterations: number;
    score: RepairCandidateScore;
  };

  const evaluateCandidate = (
    strategy: RepairStrategy,
    preRecenter: boolean
  ): Candidate => {
    resetNodesToOrigin(nodes);
    // Pre-recentrado opcional: traslada todos los clusters movibles (rigido)
    // para que el centroide del conjunto coincida con el del terreno, antes de
    // relajar. Da una alternativa mas centrada y compacta.
    if (preRecenter && centroid) {
      const movers = nodes.filter((node) => node.movable);
      if (movers.length > 0) {
        const lc = movers.reduce(
          (acc, node) => ({
            x_m: acc.x_m + node.center.x_m,
            y_m: acc.y_m + node.center.y_m,
          }),
          { x_m: 0, y_m: 0 }
        );
        const dx = centroid.x_m - lc.x_m / movers.length;
        const dy = centroid.y_m - lc.y_m / movers.length;
        for (const node of movers) {
          node.center = { x_m: node.center.x_m + dx, y_m: node.center.y_m + dy };
        }
      }
    }
    const iterations = runRelaxation(nodes, ctx);
    const remaining = countConflicts(nodes, siteLocalPolygon, rules);
    const score = scoreRepairCandidate(candidateMetrics(nodes, clusters, remaining));
    return {
      strategy,
      centers: nodes.map((node) => ({ x_m: node.center.x_m, y_m: node.center.y_m })),
      remaining,
      iterations,
      score,
    };
  };

  // Candidato base: reordenamiento por bloques rigidos (o por equipo si no hay
  // metadata de grupo). Un segundo candidato re-centra el conjunto cuando hay
  // terreno y bloques reales. Se elige el de mejor score.
  const candidates: Candidate[] = [
    evaluateCandidate(hasRigidBlocks ? "cluster-rigid" : "per-node", false),
  ];
  if (hasSitePolygon && hasRigidBlocks) {
    candidates.push(evaluateCandidate("cluster-recenter", true));
  }

  candidates.sort((a, b) => {
    const criticalA = a.remaining.outside + a.remaining.overlaps;
    const criticalB = b.remaining.outside + b.remaining.overlaps;
    if (criticalA !== criticalB) return criticalA - criticalB;
    if (a.remaining.total !== b.remaining.total) {
      return a.remaining.total - b.remaining.total;
    }
    return b.score.total - a.score.total;
  });

  const best = candidates[0];
  nodes.forEach((node, i) => {
    node.center = best.centers[i];
  });
  const remaining = best.remaining;
  const iterations = best.iterations;

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
    clusterCount: movableClusterCount,
    strategy: best.strategy,
    score: best.score,
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
