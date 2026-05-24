import { bessContainerCatalog } from "@/data/catalogs/bessContainerCatalog";
import { mvSkidCatalog } from "@/data/catalogs/mvSkidCatalog";
import { pcsCatalog } from "@/data/catalogs/pcsCatalog";
import { transformerCatalog } from "@/data/catalogs/transformerCatalog";
import {
  bessContainerToEquipmentSpec,
  mvSkidToEquipmentSpec,
  pcsToEquipmentSpec,
  transformerToEquipmentSpec,
} from "@/data/catalogs/adapters";
import type { EquipmentSpec } from "@/data/equipmentCatalog";

export { bessContainerCatalog } from "@/data/catalogs/bessContainerCatalog";
export { pcsCatalog } from "@/data/catalogs/pcsCatalog";
export { mvSkidCatalog } from "@/data/catalogs/mvSkidCatalog";
export { transformerCatalog } from "@/data/catalogs/transformerCatalog";
export * from "@/data/catalogs/sources";
export * from "@/data/catalogs/adapters";

// Fase 2 — catálogos auxiliares (cables MT, switchgear, main transformer).
// Estos no se integran como `EquipmentSpec` con footprint — son referencias
// documentales y de parametrización para `CableRoute`, `MVBus.switchgear`,
// y `MainTransformer`.
export {
  mvCablesCatalog,
  findMVCable,
  cablesForMV33kV,
  type MVCableSpec,
  type CableInsulation,
  type CableShield,
  type CableSheath,
} from "@/data/catalogs/cables";
export {
  mvSwitchgearCatalog,
  findSwitchgear,
  type SwitchgearSpec,
  type SwitchgearTechnology,
} from "@/data/catalogs/switchgear";
export {
  mainTransformerCatalog,
  findMainTransformer,
  type MainTransformerSpec,
  type TransformerCooling,
} from "@/data/catalogs/mainTransformer";

export const technicalEquipmentSpecs: EquipmentSpec[] = [
  ...bessContainerCatalog.map(bessContainerToEquipmentSpec),
  ...pcsCatalog.map(pcsToEquipmentSpec),
  ...mvSkidCatalog.map(mvSkidToEquipmentSpec),
  ...transformerCatalog.map(transformerToEquipmentSpec),
].filter((spec): spec is EquipmentSpec => spec !== null);
