import type { SmartSiteFitShapeCandidate, SmartSiteFitStrategy } from "./smartSiteFitTypes";

export interface ShapeLayoutItem {
  equipmentSpecId: string;
  x_m: number;
  y_m: number;
  blockIndex: number;
}

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

  return shapes;
}

// Sungrow footprint constants shared by the shape builders. Kept module-local
// so the fast estimator and the exact builder never drift apart.
const BESS_LENGTH_M = 9.34;
const BESS_WIDTH_M = 1.73;
const PCS_LENGTH_M = 6.058;
const PCS_WIDTH_M = 2.438;

/**
 * Cheap, equipment-free bounding-box estimate of a shape's footprint. It mirrors
 * the dimensional math in {@link buildShapeLayout} per kind but never places a
 * single item, so it is O(1) and safe to call thousands of times while pruning.
 */
export function estimateShapeFootprint(
  shape: SmartSiteFitShapeCandidate,
  pcsCount: number,
  containersPerPcs: number,
  spacing: { bessToBess: number; bessToPcs: number; pcsToPcs: number }
): { width_m: number; height_m: number } {
  const { bessToBess, bessToPcs, pcsToPcs } = spacing;
  const pcs = Math.max(1, pcsCount);

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
      const blockHeight = 2 * BESS_WIDTH_M + bessToBess;
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
      const splitSpace = shape.kind === "split_blocks" && blockCols > 1 ? 6.0 : 0.0;
      return {
        width_m: blockCols * blockLength + (blockCols - 1) * pcsToPcs + splitSpace,
        height_m: blockRows * blockHeight + (blockRows - 1) * pcsToPcs,
      };
    }

    default:
      return { width_m: 0, height_m: 0 };
  }
}

export function buildShapeLayout(
  shape: SmartSiteFitShapeCandidate,
  pcsCount: number,
  containersPerPcs: number,
  spacing: { bessToBess: number; bessToPcs: number; pcsToPcs: number }
): ShapeLayoutItem[] {
  const { bessToBess, bessToPcs, pcsToPcs } = spacing;

  const bessLength = 9.34;
  const bessWidth = 1.73;
  const pcsLength = 6.058;
  const pcsWidth = 2.438;

  const items: ShapeLayoutItem[] = [];

  switch (shape.kind) {
    case "single_row": {
      const blockLength = pcsLength + bessToPcs + containersPerPcs * (bessLength + bessToBess) - bessToBess;
      const blockWidth = Math.max(pcsWidth, bessWidth);

      for (let r = 0; r < pcsCount; r++) {
        const y = (r - (pcsCount - 1) / 2) * (blockWidth + bessToBess);
        const xPcs = -blockLength / 2 + pcsLength / 2;
        items.push({
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
          x_m: xPcs,
          y_m: y,
          blockIndex: r,
        });

        for (let b = 0; b < containersPerPcs; b++) {
          const xBess = -blockLength / 2 + pcsLength + bessToPcs + b * (bessLength + bessToBess) + bessLength / 2;
          items.push({
            equipmentSpecId: "sungrow-st2752ux-us",
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
      const blockHeight = 2 * bessWidth + bessToBess;

      for (let i = 0; i < pcsCount; i++) {
        const blockCenterY = (i - (pcsCount - 1) / 2) * (blockHeight + pcsToPcs);
        const xPcs = blockLength / 2 - pcsLength / 2;

        items.push({
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
          x_m: xPcs,
          y_m: blockCenterY,
          blockIndex: i,
        });

        for (let b = 0; b < containersPerPcs; b++) {
          const rIdx = b < bessCols ? 0 : 1;
          const cIdx = b < bessCols ? b : b - bessCols;
          const xBess = -blockLength / 2 + cIdx * (bessLength + bessToBess) + bessLength / 2;
          const yBess = blockCenterY + (rIdx === 0 ? (bessWidth / 2 + bessToBess / 2) : (-bessWidth / 2 - bessToBess / 2));

          items.push({
            equipmentSpecId: "sungrow-st2752ux-us",
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
            equipmentSpecId: "sungrow-st2752ux-us",
            x_m: x,
            y_m: y,
            blockIndex: i,
          });
        }

        // PCS/MV at the operative edge of its own cluster, vertically centered
        const xPcs = clusterCenterX + clusterLength / 2 - pcsLength / 2;
        items.push({
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
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

      const splitSpace = shape.kind === "split_blocks" ? 6.0 : 0.0;
      const midCol = (blockCols - 1) / 2;

      for (let i = 0; i < pcsCount; i++) {
        const br = Math.floor(i / blockCols);
        const bc = i % blockCols;

        let blockCenterX = (bc - midCol) * (blockLength + pcsToPcs);
        if (splitSpace > 0 && blockCols > 1) {
          if (bc > midCol) blockCenterX += splitSpace / 2;
          else if (bc < midCol) blockCenterX -= splitSpace / 2;
        }

        const blockCenterY = (br - (blockRows - 1) / 2) * (blockHeight + pcsToPcs);

        // PCS is centered vertically, at the right end of the block
        const xPcs = blockCenterX + blockLength / 2 - pcsLength / 2;
        items.push({
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
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
            equipmentSpecId: "sungrow-st2752ux-us",
            x_m: xBess,
            y_m: yBess,
            blockIndex: i,
          });
        }
      }
      break;
    }
  }

  return items;
}
