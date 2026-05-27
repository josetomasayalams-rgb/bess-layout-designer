import type { SourceReliability } from "@/data/equipmentCatalog";
import type { EvidenceRef } from "@/types/evidence";

export type BlockTemplateOrientation = "horizontal" | "vertical";
export type BlockTemplateItemRole = "battery_container" | "conversion_station";

export type BlockTemplateFootprint = {
  length_m: number;
  width_m: number;
};

export type BlockTemplateInput = {
  bessFootprint: BlockTemplateFootprint;
  stationFootprint: BlockTemplateFootprint;
  containersPerBlock: number;
  bessSpacingM: number;
  stationGapM: number;
  orientation?: BlockTemplateOrientation;
  maxContainerColumns?: number;
};

export type BlockTemplateItem = {
  role: BlockTemplateItemRole;
  slot: number;
  center: {
    x_m: number;
    y_m: number;
  };
  footprint: BlockTemplateFootprint;
  rotation_deg: number;
};

export type BlockTemplate = {
  orientation: BlockTemplateOrientation;
  containerColumns: number;
  containerRows: number;
  widthM: number;
  heightM: number;
  items: BlockTemplateItem[];
};

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be > 0`);
  }
}

function rotatePoint(
  point: { x_m: number; y_m: number },
  orientation: BlockTemplateOrientation
): { x_m: number; y_m: number } {
  if (orientation === "horizontal") return point;
  return {
    x_m: -point.y_m,
    y_m: point.x_m,
  };
}

function normalizeToOrigin(items: BlockTemplateItem[]): BlockTemplateItem[] {
  const minX = Math.min(
    ...items.map((item) => item.center.x_m - effectiveHalfWidthM(item))
  );
  const minY = Math.min(
    ...items.map((item) => item.center.y_m - effectiveHalfHeightM(item))
  );
  return items.map((item) => ({
    ...item,
    center: {
      x_m: item.center.x_m - minX,
      y_m: item.center.y_m - minY,
    },
  }));
}

function templateBounds(items: BlockTemplateItem[]): { widthM: number; heightM: number } {
  const minX = Math.min(
    ...items.map((item) => item.center.x_m - effectiveHalfWidthM(item))
  );
  const maxX = Math.max(
    ...items.map((item) => item.center.x_m + effectiveHalfWidthM(item))
  );
  const minY = Math.min(
    ...items.map((item) => item.center.y_m - effectiveHalfHeightM(item))
  );
  const maxY = Math.max(
    ...items.map((item) => item.center.y_m + effectiveHalfHeightM(item))
  );
  return { widthM: maxX - minX, heightM: maxY - minY };
}

function effectiveHalfWidthM(item: BlockTemplateItem): number {
  const isQuarterTurn = Math.abs(item.rotation_deg % 180) === 90;
  return (isQuarterTurn ? item.footprint.width_m : item.footprint.length_m) / 2;
}

function effectiveHalfHeightM(item: BlockTemplateItem): number {
  const isQuarterTurn = Math.abs(item.rotation_deg % 180) === 90;
  return (isQuarterTurn ? item.footprint.length_m : item.footprint.width_m) / 2;
}

export function createBessBlockTemplate(
  input: BlockTemplateInput
): BlockTemplate {
  assertPositive(input.bessFootprint.length_m, "bessFootprint.length_m");
  assertPositive(input.bessFootprint.width_m, "bessFootprint.width_m");
  assertPositive(input.stationFootprint.length_m, "stationFootprint.length_m");
  assertPositive(input.stationFootprint.width_m, "stationFootprint.width_m");

  const containersPerBlock = Math.max(1, Math.floor(input.containersPerBlock));
  const maxContainerColumns = Math.max(
    1,
    Math.floor(input.maxContainerColumns ?? 4)
  );
  const containerColumns = Math.min(containersPerBlock, maxContainerColumns);
  const containerRows = Math.ceil(containersPerBlock / containerColumns);
  const bessSpacingM = Math.max(0, input.bessSpacingM);
  const stationGapM = Math.max(0, input.stationGapM);
  const orientation = input.orientation ?? "horizontal";
  const rotationDeg = orientation === "horizontal" ? 0 : 90;
  const matrixLengthM =
    containerColumns * input.bessFootprint.length_m +
    (containerColumns - 1) * bessSpacingM;
  const matrixWidthM =
    containerRows * input.bessFootprint.width_m +
    (containerRows - 1) * bessSpacingM;
  const rawItems: BlockTemplateItem[] = [];

  for (let slot = 0; slot < containersPerBlock; slot++) {
    const row = Math.floor(slot / containerColumns);
    const column = slot % containerColumns;
    const center = rotatePoint(
      {
        x_m:
          input.bessFootprint.length_m / 2 +
          column * (input.bessFootprint.length_m + bessSpacingM),
        y_m:
          input.bessFootprint.width_m / 2 +
          row * (input.bessFootprint.width_m + bessSpacingM),
      },
      orientation
    );
    rawItems.push({
      role: "battery_container",
      slot: slot + 1,
      center,
      footprint: input.bessFootprint,
      rotation_deg: rotationDeg,
    });
  }

  const stationCenter = rotatePoint(
    {
      x_m: matrixLengthM + stationGapM + input.stationFootprint.length_m / 2,
      y_m: Math.max(matrixWidthM, input.stationFootprint.width_m) / 2,
    },
    orientation
  );
  rawItems.push({
    role: "conversion_station",
    slot: 1,
    center: stationCenter,
    footprint: input.stationFootprint,
    rotation_deg: rotationDeg,
  });

  const items = normalizeToOrigin(rawItems);
  const bounds = templateBounds(items);
  return {
    orientation,
    containerColumns,
    containerRows,
    widthM: bounds.widthM,
    heightM: bounds.heightM,
    items,
  };
}

export type BlockEquipmentRatio = {
  containers: number;
  pcs: number;
  classification: SourceReliability;
};

export type BlockSpacing = {
  bessSpacingM: number;
  stationGapM: number;
  blockGapXM: number;
  blockGapYM: number;
};

export type BlockTemplateEvidence = {
  templateId: string;
  evidence: EvidenceRef[];
};

export type ExtendedBlockTemplate = BlockTemplate & {
  id: string;
  name: string;
  ratio: BlockEquipmentRatio;
  spacing: BlockSpacing;
  evidence: EvidenceRef[];
  warnings?: string[];
};

export const BESS_BLOCK_TEMPLATES: Record<string, ExtendedBlockTemplate> = {
  "bess-del-desierto-reference-8x1": {
    id: "bess-del-desierto-reference-8x1",
    name: "BESS del Desierto Reference 8:1 Block Template",
    ratio: {
      containers: 8,
      pcs: 1,
      classification: "reference_only",
    },
    spacing: {
      bessSpacingM: 3.0,
      stationGapM: 6.0,
      blockGapXM: 8.0,
      blockGapYM: 8.0,
    },
    evidence: [
      {
        documentId: "PROJ-BESS-DESIERTO-1129",
        confidence: "inferred",
        note: "Configuración física de 8 contenedores por inversor basada en el informe de Mínimo Técnico de BESS del Desierto.",
      },
    ],
    warnings: [
      "La proporción 8:1 proviene del caso BESS del Desierto y sirve únicamente como referencia conceptual. Requiere validación del fabricante/EPC.",
    ],
    ...createBessBlockTemplate({
      bessFootprint: { length_m: 9.34, width_m: 1.73 },
      stationFootprint: { length_m: 6.058, width_m: 2.438 },
      containersPerBlock: 8,
      bessSpacingM: 3.0,
      stationGapM: 6.0,
      orientation: "horizontal",
    }),
  },
};

