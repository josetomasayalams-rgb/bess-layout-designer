import type { SmartSiteFitShapeCandidate, SmartSiteFitStrategy } from "./smartSiteFitTypes";
import { defaultConstraints } from "@/data/defaultConstraints";

export interface ShapeLayoutItem {
  equipmentSpecId: string;
  x_m: number;
  y_m: number;
  blockIndex: number;
}

/**
 * Corridor / road / inter-block widths used by the shape builders. They are
 * sourced from the editable `defaultConstraints` (a single source of truth for
 * preliminary layout spacing) rather than hardcoded, so a project that tunes its
 * service corridor or access road also retunes every generated shape. Each is a
 * `preliminary_assumption`, not a normative clearance.
 */
const constraintValue = (id: string, fallback: number): number =>
  defaultConstraints.find((c) => c.id === id)?.value_m ?? fallback;

/** Maintenance aisle between the two BESS rows of a `two_row_block`. */
const SERVICE_CORRIDOR_M = constraintValue("service_corridor_width", 4);
/** Central access road for the `spine_ribs` fishbone and `split_blocks` split. */
const ACCESS_ROAD_M = constraintValue("access_road_width", 6);
/** Gap that keeps `multi_block` blocks visually independent (modular). */
const BLOCK_GAP_M = constraintValue("access_road_width", 6);

export function generateSmartSiteFitShapes(input: {
  bessCount: number;
  pcsCount: number;
  containersPerPcs: number;
  strategy: SmartSiteFitStrategy;
}): SmartSiteFitShapeCandidate[] {
  const { bessCount, pcsCount, containersPerPcs } = input;
  const shapes: SmartSiteFitShapeCandidate[] = [];

  // 1. Single Row Layout (classic)
  shapes.push({
    id: "single_row",
    kind: "single_row",
    label: "Fila Única",
    description: "Distribución en filas largas y simples de contenedores con PCS en el extremo.",
    rows: pcsCount,
    columns: containersPerPcs,
    blocks: pcsCount,
    bessPerBlock: containersPerPcs,
    pcsPlacement: "end",
    targetAspectRatio: 8,
  });

  // 2. Two Row Block Layout
  if (containersPerPcs >= 4) {
    shapes.push({
      id: "two_row_block",
      kind: "two_row_block",
      label: "Bloque de Doble Hilera",
      description: "Agrupa los contenedores en dos filas paralelas reduciendo el largo total.",
      rows: pcsCount * 2,
      columns: Math.ceil(containersPerPcs / 2),
      blocks: pcsCount,
      bessPerBlock: containersPerPcs,
      pcsPlacement: "end",
      targetAspectRatio: 4,
    });
  }

  // 3. Compact Grid
  if (bessCount >= 4) {
    const cols = Math.ceil(Math.sqrt(bessCount));
    const rows = Math.ceil(bessCount / cols);
    shapes.push({
      id: "compact_grid",
      kind: "compact_grid",
      label: "Matriz Compacta",
      description: "Agrupación rectangular y densa para terrenos cuadrados o regulares.",
      rows,
      columns: cols,
      blocks: 1,
      bessPerBlock: bessCount,
      pcsPlacement: "side",
      targetAspectRatio: 1.5,
    });
  }

  // 4. Wide Grid
  if (bessCount >= 6) {
    const cols = Math.ceil(Math.sqrt(bessCount) * 1.5);
    const rows = Math.ceil(bessCount / cols);
    shapes.push({
      id: "wide_grid",
      kind: "wide_grid",
      label: "Matriz Ancha",
      description: "Layout horizontal de baja profundidad adaptable a terrenos alargados.",
      rows,
      columns: cols,
      blocks: 1,
      bessPerBlock: bessCount,
      pcsPlacement: "side",
      targetAspectRatio: 3,
    });
  }

  // 5. Deep Grid
  if (bessCount >= 6) {
    const rows = Math.ceil(Math.sqrt(bessCount) * 1.5);
    const cols = Math.ceil(bessCount / rows);
    shapes.push({
      id: "deep_grid",
      kind: "deep_grid",
      label: "Matriz Profunda",
      description: "Estructura vertical estrecha para terrenos con fondo largo y frente angosto.",
      rows,
      columns: cols,
      blocks: 1,
      bessPerBlock: bessCount,
      pcsPlacement: "side",
      targetAspectRatio: 0.3,
    });
  }

  // 6. Multi Block Layout
  if (pcsCount >= 2) {
    const blockRows = Math.ceil(Math.sqrt(pcsCount));
    const blockCols = Math.ceil(pcsCount / blockRows);
    shapes.push({
      id: "multi_block",
      kind: "multi_block",
      label: "Multibloque Ordenado",
      description: "Bloques independientes modulares que facilitan canalizaciones y accesos.",
      rows: blockRows * 2,
      columns: blockCols * Math.ceil(containersPerPcs / 2),
      blocks: pcsCount,
      bessPerBlock: containersPerPcs,
      pcsPlacement: "end",
      targetAspectRatio: 2.0,
    });
  }

  // 7. Split Blocks Layout
  if (pcsCount >= 2) {
    const blockRows = Math.ceil(Math.sqrt(pcsCount));
    const blockCols = Math.ceil(pcsCount / blockRows);
    shapes.push({
      id: "split_blocks",
      kind: "split_blocks",
      label: "Bloques Separados",
      description: "Divide el layout con un pasillo central ancho para mantenimiento pesado.",
      rows: blockRows * 2,
      columns: blockCols * Math.ceil(containersPerPcs / 2),
      blocks: pcsCount,
      bessPerBlock: containersPerPcs,
      pcsPlacement: "end",
      targetAspectRatio: 2.2,
    });
  }

  // 8. Spine + Ribs (fishbone): a central access road with PCS on the centerline
  // and BESS rows branching off as ribs, alternating above and below. The
  // canonical utility-scale arrangement for elongated sites with a service road.
  if (pcsCount >= 2) {
    shapes.push({
      id: "spine_ribs",
      kind: "spine_ribs",
      label: "Espina de Pez",
      description:
        "Vía de acceso central con PCS sobre el eje y filas de contenedores ramificadas a ambos lados.",
      rows: 3,
      columns: pcsCount,
      blocks: pcsCount,
      bessPerBlock: containersPerPcs,
      pcsPlacement: "centerline",
      targetAspectRatio: 5,
    });
  }

  // 9. Perimeter Ring: equipment hugs the site boundary leaving an open central
  // yard (e.g. for a future substation, retention pond or expansion).
  if (pcsCount >= 2 && bessCount >= 12) {
    const cells = pcsCount + bessCount;
    const side = Math.max(3, Math.ceil((cells + 4) / 4));
    shapes.push({
      id: "perimeter_ring",
      kind: "perimeter_ring",
      label: "Anillo Perimetral",
      description:
        "Equipos dispuestos en el perímetro dejando un patio central libre para subestación o expansión.",
      rows: side,
      columns: side,
      blocks: pcsCount,
      bessPerBlock: containersPerPcs,
      pcsPlacement: "distributed",
      targetAspectRatio: 1,
    });
  }

  return shapes;
}

/**
 * Equipment ids + footprints the shape builders place. Kept as a minimal local
 * interface so this geometry module stays decoupled from the catalog; callers
 * pass preset-resolved equipment (structurally a {@link SeparatePcsEquipment}).
 */
export interface ShapeEquipment {
  bessSpecId: string;
  pcsSpecId: string;
  bess: { length_m: number; width_m: number };
  pcs: { length_m: number; width_m: number };
}

/**
 * Default Sungrow ids + footprints. Used when no preset-resolved equipment is
 * passed, so existing callers (and the colocated tests) keep byte-identical
 * Sungrow behavior. The live engine path passes catalog-resolved equipment.
 */
export const SUNGROW_SHAPE_EQUIPMENT: ShapeEquipment = {
  bessSpecId: "sungrow-st2752ux-us",
  pcsSpecId: "sungrow-sc5000ud-mv-us-p3",
  bess: { length_m: 9.34, width_m: 1.73 },
  pcs: { length_m: 6.058, width_m: 2.438 },
};

/**
 * Cheap, equipment-free bounding-box estimate of a shape's footprint. It mirrors
 * the dimensional math in {@link buildShapeLayout} per kind but never places a
 * single item, so it is O(1) and safe to call thousands of times while pruning.
 */
export function estimateShapeFootprint(
  shape: SmartSiteFitShapeCandidate,
  pcsCount: number,
  containersPerPcs: number,
  spacing: { bessToBess: number; bessToPcs: number; pcsToPcs: number },
  equipment: ShapeEquipment = SUNGROW_SHAPE_EQUIPMENT
): { width_m: number; height_m: number } {
  const { bessToBess, bessToPcs, pcsToPcs } = spacing;
  const pcs = Math.max(1, pcsCount);
  const BESS_LENGTH_M = equipment.bess.length_m;
  const BESS_WIDTH_M = equipment.bess.width_m;
  const PCS_LENGTH_M = equipment.pcs.length_m;
  const PCS_WIDTH_M = equipment.pcs.width_m;

  switch (shape.kind) {
    case "single_row": {
      const blockLength =
        PCS_LENGTH_M + bessToPcs + containersPerPcs * (BESS_LENGTH_M + bessToBess) - bessToBess;
      const blockWidth = Math.max(PCS_WIDTH_M, BESS_WIDTH_M);
      return {
        width_m: blockLength,
        height_m: pcs * blockWidth + (pcs - 1) * bessToBess,
      };
    }

    case "two_row_block": {
      const bessCols = Math.ceil(containersPerPcs / 2);
      const bessRowLength = bessCols * BESS_LENGTH_M + (bessCols - 1) * bessToBess;
      const blockLength = bessRowLength + bessToPcs + PCS_LENGTH_M;
      // The two rows are split by a maintenance service corridor.
      const blockHeight = 2 * BESS_WIDTH_M + SERVICE_CORRIDOR_M;
      return {
        width_m: blockLength,
        height_m: pcs * blockHeight + (pcs - 1) * pcsToPcs,
      };
    }

    case "compact_grid":
    case "wide_grid":
    case "deep_grid": {
      const subCols = Math.max(1, Math.ceil(Math.sqrt(containersPerPcs)));
      const subRows = Math.max(1, Math.ceil(containersPerPcs / subCols));
      const bessBlockW = subCols * BESS_LENGTH_M + (subCols - 1) * bessToBess;
      const bessBlockH = subRows * BESS_WIDTH_M + (subRows - 1) * bessToBess;
      const clusterLength = bessBlockW + bessToPcs + PCS_LENGTH_M;
      const clusterHeight = Math.max(bessBlockH, PCS_WIDTH_M);

      let clusterCols = Math.max(1, Math.ceil(Math.sqrt(pcs)));
      if (shape.kind === "wide_grid") {
        clusterCols = Math.max(1, Math.ceil(Math.sqrt(pcs) * 1.6));
      } else if (shape.kind === "deep_grid") {
        clusterCols = Math.max(1, Math.floor(Math.sqrt(pcs) / 1.6) || 1);
      }
      clusterCols = Math.min(clusterCols, pcs);
      const clusterRows = Math.ceil(pcs / clusterCols);

      return {
        width_m: clusterCols * clusterLength + (clusterCols - 1) * pcsToPcs,
        height_m: clusterRows * clusterHeight + (clusterRows - 1) * pcsToPcs,
      };
    }

    case "multi_block":
    case "split_blocks": {
      const blockRows = Math.ceil(Math.sqrt(pcs));
      const blockCols = Math.ceil(pcs / blockRows);
      const bessCols = Math.ceil(containersPerPcs / 2);
      const bessRowLength = bessCols * BESS_LENGTH_M + (bessCols - 1) * bessToBess;
      const blockLength = bessRowLength + bessToPcs + PCS_LENGTH_M;
      const blockHeight = 2 * BESS_WIDTH_M + bessToBess;
      // multi_block keeps each per-PCS block modular with a wider gap;
      // split_blocks stays tightly stepped but adds a central access road.
      const interBlock = shape.kind === "multi_block" ? BLOCK_GAP_M : pcsToPcs;
      const splitSpace = shape.kind === "split_blocks" && blockCols > 1 ? ACCESS_ROAD_M : 0.0;
      return {
        width_m: blockCols * blockLength + (blockCols - 1) * interBlock + splitSpace,
        height_m: blockRows * blockHeight + (blockRows - 1) * interBlock,
      };
    }

    case "spine_ribs": {
      const roadHalf = ACCESS_ROAD_M / 2;
      const ribCols = Math.max(1, Math.floor(Math.sqrt(containersPerPcs)));
      const ribRows = Math.ceil(containersPerPcs / ribCols);
      const ribW = ribCols * BESS_LENGTH_M + (ribCols - 1) * bessToBess;
      const ribH = ribRows * BESS_WIDTH_M + (ribRows - 1) * bessToBess;
      const pitchX = Math.max(ribW, PCS_LENGTH_M) + pcsToPcs;
      return {
        width_m: pcs * pitchX - pcsToPcs,
        height_m: 2 * (roadHalf + bessToPcs + ribH),
      };
    }

    case "perimeter_ring": {
      const cellX = Math.max(BESS_LENGTH_M, PCS_LENGTH_M) + bessToBess;
      const cellY = Math.max(BESS_WIDTH_M, PCS_WIDTH_M) + bessToBess;
      const cells = pcs + pcs * containersPerPcs;
      const side = Math.max(3, Math.ceil((cells + 4) / 4));
      return { width_m: side * cellX, height_m: side * cellY };
    }

    default:
      return { width_m: 0, height_m: 0 };
  }
}

export function buildShapeLayout(
  shape: SmartSiteFitShapeCandidate,
  pcsCount: number,
  containersPerPcs: number,
  spacing: { bessToBess: number; bessToPcs: number; pcsToPcs: number },
  equipment: ShapeEquipment = SUNGROW_SHAPE_EQUIPMENT
): ShapeLayoutItem[] {
  const { bessToBess, bessToPcs, pcsToPcs } = spacing;

  const bessLength = equipment.bess.length_m;
  const bessWidth = equipment.bess.width_m;
  const pcsLength = equipment.pcs.length_m;
  const pcsWidth = equipment.pcs.width_m;

  const items: ShapeLayoutItem[] = [];

  switch (shape.kind) {
    case "single_row": {
      const blockLength = pcsLength + bessToPcs + containersPerPcs * (bessLength + bessToBess) - bessToBess;
      const blockWidth = Math.max(pcsWidth, bessWidth);

      for (let r = 0; r < pcsCount; r++) {
        const y = (r - (pcsCount - 1) / 2) * (blockWidth + bessToBess);
        const xPcs = -blockLength / 2 + pcsLength / 2;
        items.push({
          equipmentSpecId: equipment.pcsSpecId,
          x_m: xPcs,
          y_m: y,
          blockIndex: r,
        });

        for (let b = 0; b < containersPerPcs; b++) {
          const xBess = -blockLength / 2 + pcsLength + bessToPcs + b * (bessLength + bessToBess) + bessLength / 2;
          items.push({
            equipmentSpecId: equipment.bessSpecId,
            x_m: xBess,
            y_m: y,
            blockIndex: r,
          });
        }
      }
      break;
    }

    case "two_row_block": {
      const bessCols = Math.ceil(containersPerPcs / 2);
      const bessRowLength = bessCols * bessLength + (bessCols - 1) * bessToBess;
      const blockLength = bessRowLength + bessToPcs + pcsLength;
      // A maintenance service corridor splits the two BESS rows.
      const aisle = SERVICE_CORRIDOR_M;
      const blockHeight = 2 * bessWidth + aisle;

      for (let i = 0; i < pcsCount; i++) {
        const blockCenterY = (i - (pcsCount - 1) / 2) * (blockHeight + pcsToPcs);
        const xPcs = blockLength / 2 - pcsLength / 2;

        items.push({
          equipmentSpecId: equipment.pcsSpecId,
          x_m: xPcs,
          y_m: blockCenterY,
          blockIndex: i,
        });

        for (let b = 0; b < containersPerPcs; b++) {
          const rIdx = b < bessCols ? 0 : 1;
          const cIdx = b < bessCols ? b : b - bessCols;
          const xBess = -blockLength / 2 + cIdx * (bessLength + bessToBess) + bessLength / 2;
          const yBess =
            blockCenterY +
            (rIdx === 0 ? bessWidth / 2 + aisle / 2 : -bessWidth / 2 - aisle / 2);

          items.push({
            equipmentSpecId: equipment.bessSpecId,
            x_m: xBess,
            y_m: yBess,
            blockIndex: i,
          });
        }
      }
      break;
    }

    case "compact_grid":
    case "wide_grid":
    case "deep_grid": {
      // Cluster-based grid: each PCS/MV stays attached to its own BESS sub-grid
      // (its cluster), and clusters are tiled in a meta-grid whose aspect ratio
      // depends on the shape kind. This keeps the PCS integrated with the BESS it
      // feeds instead of forming a detached "PCS wall".
      const subCols = Math.max(1, Math.ceil(Math.sqrt(containersPerPcs)));
      const subRows = Math.max(1, Math.ceil(containersPerPcs / subCols));
      const bessBlockW = subCols * bessLength + (subCols - 1) * bessToBess;
      const bessBlockH = subRows * bessWidth + (subRows - 1) * bessToBess;
      const clusterLength = bessBlockW + bessToPcs + pcsLength;
      const clusterHeight = Math.max(bessBlockH, pcsWidth);

      // Meta-grid of clusters, aspect driven by shape kind
      let clusterCols = Math.max(1, Math.ceil(Math.sqrt(pcsCount)));
      if (shape.kind === "wide_grid") {
        clusterCols = Math.max(1, Math.ceil(Math.sqrt(pcsCount) * 1.6));
      } else if (shape.kind === "deep_grid") {
        clusterCols = Math.max(1, Math.floor(Math.sqrt(pcsCount) / 1.6) || 1);
      }
      clusterCols = Math.min(clusterCols, pcsCount);
      const clusterRows = Math.ceil(pcsCount / clusterCols);

      const stepX = clusterLength + pcsToPcs;
      const stepY = clusterHeight + pcsToPcs;

      for (let i = 0; i < pcsCount; i++) {
        const cc = i % clusterCols;
        const cr = Math.floor(i / clusterCols);
        const clusterCenterX = (cc - (clusterCols - 1) / 2) * stepX;
        const clusterCenterY = (cr - (clusterRows - 1) / 2) * stepY;

        // BESS sub-grid on the left side of the cluster
        const bessOriginX = clusterCenterX - clusterLength / 2;
        for (let b = 0; b < containersPerPcs; b++) {
          const rIdx = Math.floor(b / subCols);
          const cIdx = b % subCols;
          const x = bessOriginX + cIdx * (bessLength + bessToBess) + bessLength / 2;
          const y = clusterCenterY + (rIdx - (subRows - 1) / 2) * (bessWidth + bessToBess);
          items.push({
            equipmentSpecId: equipment.bessSpecId,
            x_m: x,
            y_m: y,
            blockIndex: i,
          });
        }

        // PCS/MV at the operative edge of its own cluster, vertically centered
        const xPcs = clusterCenterX + clusterLength / 2 - pcsLength / 2;
        items.push({
          equipmentSpecId: equipment.pcsSpecId,
          x_m: xPcs,
          y_m: clusterCenterY,
          blockIndex: i,
        });
      }
      break;
    }

    case "multi_block":
    case "split_blocks": {
      const blockRows = Math.ceil(Math.sqrt(pcsCount));
      const blockCols = Math.ceil(pcsCount / blockRows);

      const bessCols = Math.ceil(containersPerPcs / 2);
      const bessRowLength = bessCols * bessLength + (bessCols - 1) * bessToBess;
      const blockLength = bessRowLength + bessToPcs + pcsLength;
      const blockHeight = 2 * bessWidth + bessToBess;

      // multi_block separates each per-PCS block with a wider modular gap;
      // split_blocks stays tightly stepped but inserts a central access road.
      const interBlock = shape.kind === "multi_block" ? BLOCK_GAP_M : pcsToPcs;
      const splitSpace = shape.kind === "split_blocks" ? ACCESS_ROAD_M : 0.0;
      const midCol = (blockCols - 1) / 2;

      for (let i = 0; i < pcsCount; i++) {
        const br = Math.floor(i / blockCols);
        const bc = i % blockCols;

        let blockCenterX = (bc - midCol) * (blockLength + interBlock);
        if (splitSpace > 0 && blockCols > 1) {
          if (bc > midCol) blockCenterX += splitSpace / 2;
          else if (bc < midCol) blockCenterX -= splitSpace / 2;
        }

        const blockCenterY = (br - (blockRows - 1) / 2) * (blockHeight + interBlock);

        // PCS is centered vertically, at the right end of the block
        const xPcs = blockCenterX + blockLength / 2 - pcsLength / 2;
        items.push({
          equipmentSpecId: equipment.pcsSpecId,
          x_m: xPcs,
          y_m: blockCenterY,
          blockIndex: i,
        });

        // BESS rows inside the block
        for (let b = 0; b < containersPerPcs; b++) {
          const rIdx = b < bessCols ? 0 : 1;
          const cIdx = b < bessCols ? b : b - bessCols;
          const xBess = blockCenterX - blockLength / 2 + cIdx * (bessLength + bessToBess) + bessLength / 2;
          const yBess = blockCenterY + (rIdx === 0 ? (bessWidth / 2 + bessToBess / 2) : (-bessWidth / 2 - bessToBess / 2));

          items.push({
            equipmentSpecId: equipment.bessSpecId,
            x_m: xBess,
            y_m: yBess,
            blockIndex: i,
          });
        }
      }
      break;
    }

    case "spine_ribs": {
      // Central access road along x; PCS on the centerline; each PCS's BESS form
      // a perpendicular rib, alternating above and below the road (fishbone).
      const roadHalf = ACCESS_ROAD_M / 2;
      const ribCols = Math.max(1, Math.floor(Math.sqrt(containersPerPcs)));
      const ribW = ribCols * bessLength + (ribCols - 1) * bessToBess;
      const pitchX = Math.max(ribW, pcsLength) + pcsToPcs;
      const nearEdge = roadHalf + bessToPcs;

      for (let i = 0; i < pcsCount; i++) {
        const xCenter = (i - (pcsCount - 1) / 2) * pitchX;
        const dir = i % 2 === 0 ? 1 : -1;

        items.push({
          equipmentSpecId: equipment.pcsSpecId,
          x_m: xCenter,
          y_m: 0,
          blockIndex: i,
        });

        for (let b = 0; b < containersPerPcs; b++) {
          const rIdx = Math.floor(b / ribCols);
          const cIdx = b % ribCols;
          const x = xCenter - ribW / 2 + cIdx * (bessLength + bessToBess) + bessLength / 2;
          const yMag = nearEdge + rIdx * (bessWidth + bessToBess) + bessWidth / 2;
          items.push({
            equipmentSpecId: equipment.bessSpecId,
            x_m: x,
            y_m: dir * yMag,
            blockIndex: i,
          });
        }
      }
      break;
    }

    case "perimeter_ring": {
      // Equipment walks the border of a square ring, one PCS leading its own
      // BESS cluster, leaving the interior cells open. Cell pitch takes the
      // larger of the two footprints so any item fits any slot without overlap.
      const cellX = Math.max(bessLength, pcsLength) + bessToBess;
      const cellY = Math.max(bessWidth, pcsWidth) + bessToBess;
      const totalCells = pcsCount + pcsCount * containersPerPcs;
      const side = Math.max(3, Math.ceil((totalCells + 4) / 4));
      const cols = side;
      const rows = side;

      const border: Array<{ r: number; c: number }> = [];
      for (let c = 0; c < cols; c++) border.push({ r: 0, c });
      for (let r = 1; r < rows; r++) border.push({ r, c: cols - 1 });
      for (let c = cols - 2; c >= 0; c--) border.push({ r: rows - 1, c });
      for (let r = rows - 2; r >= 1; r--) border.push({ r, c: 0 });

      const cellToXY = (r: number, c: number) => ({
        x_m: (c - (cols - 1) / 2) * cellX,
        y_m: ((rows - 1) / 2 - r) * cellY,
      });

      let slot = 0;
      for (let i = 0; i < pcsCount; i++) {
        const pc = border[slot % border.length];
        const pPos = cellToXY(pc.r, pc.c);
        items.push({
          equipmentSpecId: equipment.pcsSpecId,
          x_m: pPos.x_m,
          y_m: pPos.y_m,
          blockIndex: i,
        });
        slot++;

        for (let b = 0; b < containersPerPcs; b++) {
          const bc = border[slot % border.length];
          const bPos = cellToXY(bc.r, bc.c);
          items.push({
            equipmentSpecId: equipment.bessSpecId,
            x_m: bPos.x_m,
            y_m: bPos.y_m,
            blockIndex: i,
          });
          slot++;
        }
      }
      break;
    }
  }

  return items;
}
