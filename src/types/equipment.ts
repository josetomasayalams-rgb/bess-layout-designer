import type { LngLat } from "./geometry";
import type { SourceReliability } from "@/data/equipmentCatalog";

export type PlacedEquipment = {
  id: string;
  equipmentSpecId: string;
  anchor: LngLat;
  rotation_deg: number;
  groupId?: string;
  /** When true the equipment is protected: edits skip it. */
  locked?: boolean;
  sourceReliability: SourceReliability;
};
