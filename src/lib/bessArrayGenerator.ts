import { nanoid } from "nanoid";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { bessEquipmentSpecId } from "@/lib/bessCalculations";
import { toLocal, toLngLat } from "@/lib/geometry/projection";
import type { BessArrayInput } from "@/types/bess";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";

export function generateBessArray(
  input: BessArrayInput,
  anchor: ProjectAnchor
): PlacedEquipment[] {
  const specId = bessEquipmentSpecId(input.modelId);
  const spec = equipmentCatalog.find((item) => item.id === specId);
  if (!spec) return [];

  const start = toLocal(input.startPoint, anchor);
  const rowSpacing = input.rowSpacingM ?? input.separationM;
  const columnSpacing = input.columnSpacingM ?? input.separationM;
  const radians = (input.orientationDeg * Math.PI) / 180;
  const alongColumn = {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };
  const alongRow = {
    x: -Math.sin(radians),
    y: Math.cos(radians),
  };

  const items: PlacedEquipment[] = [];
  for (let index = 0; index < input.quantity; index++) {
    const row = Math.floor(index / input.columns);
    const column = index % input.columns;
    if (row >= input.rows) break;

    const columnOffset = column * (spec.footprint.length_m + columnSpacing);
    const rowOffset = row * (spec.footprint.width_m + rowSpacing);
    const local = {
      x_m: start.x_m + alongColumn.x * columnOffset + alongRow.x * rowOffset,
      y_m: start.y_m + alongColumn.y * columnOffset + alongRow.y * rowOffset,
    };

    items.push({
      id: nanoid(8),
      equipmentSpecId: specId,
      anchor: toLngLat(local, anchor),
      rotation_deg: input.orientationDeg,
      sourceReliability: spec.source.reliability,
    });
  }

  return items;
}
