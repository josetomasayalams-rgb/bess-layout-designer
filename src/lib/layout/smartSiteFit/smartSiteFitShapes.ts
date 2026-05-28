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
      const bessCount = pcsCount * containersPerPcs;
      let cols = Math.ceil(Math.sqrt(bessCount));
      let rows = Math.ceil(bessCount / cols);

      if (shape.kind === "wide_grid") {
        cols = Math.ceil(Math.sqrt(bessCount) * 1.5);
        rows = Math.ceil(bessCount / cols);
      } else if (shape.kind === "deep_grid") {
        rows = Math.ceil(Math.sqrt(bessCount) * 1.5);
        cols = Math.ceil(bessCount / rows);
      }

      const bessGridHeight = rows * bessWidth + (rows - 1) * bessToBess;

      // Place BESS
      for (let b = 0; b < bessCount; b++) {
        const rIdx = Math.floor(b / cols);
        const cIdx = b % cols;
        const x = (cIdx - (cols - 1) / 2) * (bessLength + bessToBess);
        const y = (rIdx - (rows - 1) / 2) * (bessWidth + bessToBess);
        const blockIndex = Math.floor(b / containersPerPcs);

        items.push({
          equipmentSpecId: "sungrow-st2752ux-us",
          x_m: x,
          y_m: y,
          blockIndex,
        });
      }

      // Place PCS below the BESS grid
      const yPcs = -bessGridHeight / 2 - bessToPcs - pcsWidth / 2;
      for (let p = 0; p < pcsCount; p++) {
        const x = (p - (pcsCount - 1) / 2) * (pcsLength + pcsToPcs);
        items.push({
          equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
          x_m: x,
          y_m: yPcs,
          blockIndex: p,
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
