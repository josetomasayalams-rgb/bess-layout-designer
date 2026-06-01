/**
 * layoutRepairClusters — agrupacion y scoring para la reparacion armonica.
 *
 * La reparacion de layout (`repairLayout`) debe corregir incumplimientos
 * geometricos preliminares (equipos fuera del terreno, colisiones, separacion
 * insuficiente, margen al deslinde) SIN destruir el orden visual. Para lograrlo
 * trata cada bloque/cluster como un cuerpo rigido: los equipos de un mismo
 * `groupId`/`blockId` se mueven juntos, preservando filas, matrices y la
 * cercania entre cada PCS/MV y su grupo de BESS.
 *
 * Todo es predimensionamiento preliminar: no reemplaza ingenieria de detalle ni
 * crea reglas electricas nuevas. El scoring solo ordena candidatos geometricos.
 */

import type { LocalPoint } from "@/types/geometry";

export type RepairNodeKind = "battery" | "pcs" | "other";

/** Nodo minimo que el agrupador necesita conocer de cada equipo colocado. */
export interface ClusterableNode {
  /** Clave de agrupacion: groupId ?? blockId. `null` => equipo suelto. */
  groupKey: string | null;
  kind: RepairNodeKind;
  movable: boolean;
  center: LocalPoint;
  /** Posicion original, para penalizar desplazamiento innecesario. */
  origin: LocalPoint;
  /** Radio de la circunferencia que envuelve el equipo (para separar bloques). */
  radius_m: number;
}

export type RepairClusterBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * Grupo de equipos que la reparacion trata como una unidad rigida. Conserva la
 * relacion espacial interna (PCS/MV junto a sus BESS, filas alineadas).
 */
export type RepairCluster = {
  id: string;
  /** Indices dentro del arreglo de nodos original. */
  nodeIndices: number[];
  bessCount: number;
  pcsCount: number;
  otherCount: number;
  /** `true` solo si todos sus miembros son movibles. */
  movable: boolean;
  centroid: LocalPoint;
  bounds: RepairClusterBounds;
  /** Radio envolvente del cluster, para empujes entre bloques. */
  radius_m: number;
};

/**
 * Score geometrico/visual de un candidato de reparacion. Primero pesan los
 * incumplimientos criticos (fuera del terreno, colisiones); luego el orden
 * visual (preservacion de clusters, integracion PCS, compacidad) y el
 * desplazamiento respecto del layout original.
 */
export type RepairCandidateScore = {
  total: number;
  criticalViolations: number;
  collisions: number;
  outsideCount: number;
  minSpacingViolations: number;
  boundaryViolations: number;
  displacementPenalty: number;
  clusterPreservation: number;
  pcsIntegration: number;
  compactness: number;
};

function boundsOf(nodes: ClusterableNode[], indices: number[]): RepairClusterBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const index of indices) {
    const node = nodes[index];
    minX = Math.min(minX, node.center.x_m - node.radius_m);
    maxX = Math.max(maxX, node.center.x_m + node.radius_m);
    minY = Math.min(minY, node.center.y_m - node.radius_m);
    maxY = Math.max(maxY, node.center.y_m + node.radius_m);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  return { minX, maxX, minY, maxY };
}

function centroidOf(nodes: ClusterableNode[], indices: number[]): LocalPoint {
  if (indices.length === 0) return { x_m: 0, y_m: 0 };
  let x = 0;
  let y = 0;
  for (const index of indices) {
    x += nodes[index].center.x_m;
    y += nodes[index].center.y_m;
  }
  return { x_m: x / indices.length, y_m: y / indices.length };
}

/**
 * Agrupa los nodos en clusters rigidos. Los equipos con `groupKey` comparten
 * cluster; los sueltos quedan como cluster unitario (`single:<index>`). Asi un
 * equipo sin metadata se reordena de forma individual, pero un bloque generado
 * por SmartSiteFit o por el dimensionamiento preliminar se mueve completo.
 */
export function buildRepairClusters(nodes: ClusterableNode[]): RepairCluster[] {
  const byKey = new Map<string, number[]>();
  nodes.forEach((node, index) => {
    const key = node.groupKey ?? `single:${index}`;
    const list = byKey.get(key);
    if (list) {
      list.push(index);
    } else {
      byKey.set(key, [index]);
    }
  });

  const clusters: RepairCluster[] = [];
  for (const [id, indices] of byKey) {
    const members = indices.map((index) => nodes[index]);
    const bounds = boundsOf(nodes, indices);
    const radius_m = 0.5 * Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    clusters.push({
      id,
      nodeIndices: indices,
      bessCount: members.filter((node) => node.kind === "battery").length,
      pcsCount: members.filter((node) => node.kind === "pcs").length,
      otherCount: members.filter((node) => node.kind === "other").length,
      movable: members.every((node) => node.movable),
      centroid: centroidOf(nodes, indices),
      bounds,
      radius_m,
    });
  }
  return clusters;
}

/** Mapa indice-de-nodo => id-de-cluster, util para las pasadas de fuerzas. */
export function clusterIdByNode(
  nodes: ClusterableNode[],
  clusters: RepairCluster[]
): string[] {
  const ids = new Array<string>(nodes.length);
  for (const cluster of clusters) {
    for (const index of cluster.nodeIndices) {
      ids[index] = cluster.id;
    }
  }
  return ids;
}

/** Cuantos clusters con 2+ equipos movibles existen (bloques reales). */
export function multiNodeMovableClusterCount(clusters: RepairCluster[]): number {
  return clusters.filter((cluster) => cluster.movable && cluster.nodeIndices.length >= 2)
    .length;
}

export type RepairCandidateMetrics = {
  collisions: number;
  outsideCount: number;
  minSpacingViolations: number;
  boundaryViolations: number;
  /** Desplazamiento total (m) respecto del layout original. */
  totalDisplacementM: number;
  /** Distancia promedio (m) de cada PCS/MV al BESS movible mas cercano. */
  avgPcsToBessM: number;
  /** Area del bounding box del conjunto movible (m^2); menor = mas compacto. */
  movableBboxAreaM2: number;
  /** Fraccion [0..1] de clusters multi-equipo que conservaron su forma interna. */
  clusterShapePreserved: number;
};

/**
 * Convierte metricas geometricas en un score escalar. La jerarquia de pesos
 * refleja la politica de reparacion: primero lo critico (fuera del terreno y
 * colisiones), despues separacion/margen, y por ultimo el orden visual y el
 * desplazamiento. Valores mayores = mejor candidato.
 */
export function scoreRepairCandidate(metrics: RepairCandidateMetrics): RepairCandidateScore {
  const criticalViolations = metrics.outsideCount + metrics.collisions;
  const displacementPenalty = metrics.totalDisplacementM * 0.05;
  const clusterPreservation = metrics.clusterShapePreserved * 400;
  const pcsIntegration =
    metrics.avgPcsToBessM > 0 ? -Math.min(metrics.avgPcsToBessM, 400) * 1.2 : 0;
  const compactness =
    metrics.movableBboxAreaM2 > 0 ? -Math.sqrt(metrics.movableBboxAreaM2) * 0.4 : 0;

  const total =
    -metrics.outsideCount * 4_000 -
    metrics.collisions * 3_000 -
    metrics.minSpacingViolations * 600 -
    metrics.boundaryViolations * 500 -
    displacementPenalty +
    clusterPreservation +
    pcsIntegration +
    compactness;

  return {
    total,
    criticalViolations,
    collisions: metrics.collisions,
    outsideCount: metrics.outsideCount,
    minSpacingViolations: metrics.minSpacingViolations,
    boundaryViolations: metrics.boundaryViolations,
    displacementPenalty,
    clusterPreservation,
    pcsIntegration,
    compactness,
  };
}
