import type { ShapeLayoutItem } from "./smartSiteFitShapes";
import type { SmartSiteFitWarning, SmartSiteFitAssumption, SmartSiteFitShapeKind } from "./smartSiteFitTypes";

export type BuildManualSungrowLayoutParams = {
  containersPerPcs: number;
  pcsCount: number;
  containersWide?: number;
  containersLong?: number;
  rowsPerGroup?: number;
  groupCount?: number;
  groupSeparation_m?: number;
  rowSeparation_m?: number;
  bessToBess_m?: number;
  bessToPcs_m?: number;
  pcsToPcs_m?: number;
  orientationDeg?: number;
  manualShapeKind?: SmartSiteFitShapeKind;
};

export type BuildManualSungrowLayoutResult = {
  items: ShapeLayoutItem[];
  warnings: SmartSiteFitWarning[];
  assumptions: SmartSiteFitAssumption[];
  meta: {
    layoutMode: "manual";
    architecture: "bess_plus_pcs";
    containersPerPcs: number;
    pcsCount: number;
    bessCount: number;
    groupCount: number;
    rowsPerGroup: number;
    containersWide: number;
    containersLong: number;
  };
};

/**
 * Builds a manual BESS layout for Sungrow (bess_plus_pcs architecture) using
 * custom parametric constraints and local coordinates.
 */
export function buildManualSungrowLayout(
  params: BuildManualSungrowLayoutParams
): BuildManualSungrowLayoutResult {
  const warnings: SmartSiteFitWarning[] = [];

  // Normalization & Defaults
  const containersPerPcs = Math.max(1, params.containersPerPcs);
  const pcsCount = Math.max(0, params.pcsCount);

  let containersWide = params.containersWide !== undefined ? params.containersWide : 4;
  if (containersWide <= 0) {
    containersWide = 1;
    warnings.push({
      id: "manual-layout-adjusted-counts",
      severity: "info",
      message: "Ancho de contenedores (containersWide) inválido o menor a 1. Ajustado a 1.",
    });
  }

  let containersLong = params.containersLong !== undefined ? params.containersLong : 0;
  if (containersLong <= 0) {
    containersLong = Math.ceil(containersPerPcs / containersWide);
  }

  // If specified grid is too small, extend rows
  if (containersWide * containersLong < containersPerPcs) {
    const originalLong = containersLong;
    containersLong = Math.ceil(containersPerPcs / containersWide);
    warnings.push({
      id: "manual-layout-adjusted-counts",
      severity: "warning",
      message: `El grid BESS especificado (${containersWide}x${originalLong}) no es suficiente para la relación BESS:PCS (${containersPerPcs}:1). Se aumentó a ${containersWide}x${containersLong} filas.`,
    });
  }

  const bessCount = pcsCount * containersPerPcs;

  let groupCount = params.groupCount !== undefined ? params.groupCount : 1;
  if (groupCount <= 0) {
    groupCount = 1;
    warnings.push({
      id: "manual-layout-adjusted-counts",
      severity: "info",
      message: "Número de grupos (groupCount) inválido o menor a 1. Ajustado a 1.",
    });
  }

  let rowsPerGroup = params.rowsPerGroup !== undefined ? params.rowsPerGroup : 0;
  if (rowsPerGroup <= 0) {
    rowsPerGroup = Math.ceil(pcsCount / groupCount);
  }

  // If group grid is too small for total PCS stations, extend vertical rows of groups
  if (groupCount * rowsPerGroup < pcsCount) {
    const originalRows = rowsPerGroup;
    rowsPerGroup = Math.ceil(pcsCount / groupCount);
    warnings.push({
      id: "manual-layout-adjusted-counts",
      severity: "warning",
      message: `El grid de bloques especificado (${groupCount}x${originalRows}) no es suficiente para ${pcsCount} bloques. Se aumentó a ${groupCount}x${rowsPerGroup} bloques.`,
    });
  }

  // Spacing overrides or defaults
  const bessToBess = params.bessToBess_m !== undefined ? params.bessToBess_m : 3.0;
  const bessToPcs = params.bessToPcs_m !== undefined ? params.bessToPcs_m : 3.0;
  const groupSeparation = params.groupSeparation_m !== undefined ? params.groupSeparation_m : 6.0;
  const rowSeparation = params.rowSeparation_m !== undefined ? params.rowSeparation_m : 6.0;
  const orientationDeg = params.orientationDeg !== undefined ? params.orientationDeg : 0;

  // Sungrow ST2752UX + SC5000UD specs & physical dims
  const bessSpecId = "sungrow-st2752ux-us";
  const pcsSpecId = "sungrow-sc5000ud-mv-us-p3";
  const bessLength = 9.34;
  const bessWidth = 1.73;
  const pcsLength = 6.058;
  const pcsWidth = 2.438;

  const items: ShapeLayoutItem[] = [];

  if (pcsCount === 0) {
    return {
      items,
      warnings,
      assumptions: [],
      meta: {
        layoutMode: "manual",
        architecture: "bess_plus_pcs",
        containersPerPcs,
        pcsCount: 0,
        bessCount: 0,
        groupCount,
        rowsPerGroup,
        containersWide,
        containersLong,
      },
    };
  }

  // Single block dimensions
  const bessGridW = containersWide * (bessLength + bessToBess) - bessToBess;
  const bessGridH = containersLong * (bessWidth + bessToBess) - bessToBess;

  const blockW = bessGridW + bessToPcs + pcsLength;
  const blockH = Math.max(bessGridH, pcsWidth);

  // Group / Grid steps
  const xSpacing = blockW + groupSeparation;
  const ySpacing = blockH + rowSeparation;

  for (let b = 0; b < pcsCount; b++) {
    // blockCol is the horizontal group column index
    const blockCol = b % groupCount;
    // blockRow is the vertical block row index within groups
    const blockRow = Math.floor(b / groupCount);

    const blockOriginX = blockCol * xSpacing;
    const blockOriginY = blockRow * ySpacing;

    // Place BESS containers
    let bessPlaced = 0;
    for (let r = 0; r < containersLong; r++) {
      for (let c = 0; c < containersWide; c++) {
        if (bessPlaced >= containersPerPcs) break;

        const xBess = blockOriginX + c * (bessLength + bessToBess) + bessLength / 2;
        const yBess = blockOriginY + r * (bessWidth + bessToBess) + bessWidth / 2;

        items.push({
          equipmentSpecId: bessSpecId,
          x_m: xBess,
          y_m: yBess,
          blockIndex: b,
        });

        bessPlaced++;
      }
      if (bessPlaced >= containersPerPcs) break;
    }

    // Place PCS station at the right edge, vertically centered
    const xPcs = blockOriginX + bessGridW + bessToPcs + pcsLength / 2;
    const yPcs = blockOriginY + bessGridH / 2;

    items.push({
      equipmentSpecId: pcsSpecId,
      x_m: xPcs,
      y_m: yPcs,
      blockIndex: b,
    });
  }

  // Center around (0,0) and apply global orientation rotation
  if (items.length > 0) {
    let sumX = 0;
    let sumY = 0;
    for (const item of items) {
      sumX += item.x_m;
      sumY += item.y_m;
    }
    const cx = sumX / items.length;
    const cy = sumY / items.length;

    const rad = (orientationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (const item of items) {
      const dx = item.x_m - cx;
      const dy = item.y_m - cy;

      item.x_m = dx * cos - dy * sin;
      item.y_m = dx * sin + dy * cos;
    }
  }

  const assumptions: SmartSiteFitAssumption[] = [
    {
      id: "bess-model",
      description: "Modelo de BESS utilizado",
      value: bessSpecId,
      classification: "preliminary_assumption",
    },
    {
      id: "pcs-model",
      description: "Modelo de PCS utilizado",
      value: pcsSpecId,
      classification: "preliminary_assumption",
    },
    {
      id: "bess-pcs-ratio",
      description: "Relación de BESS a PCS basada en diseño manual",
      value: `${containersPerPcs}:1`,
      classification: "preliminary_assumption",
    },
  ];

  return {
    items,
    warnings,
    assumptions,
    meta: {
      layoutMode: "manual",
      architecture: "bess_plus_pcs",
      containersPerPcs,
      pcsCount,
      bessCount,
      groupCount,
      rowsPerGroup,
      containersWide,
      containersLong,
    },
  };
}
