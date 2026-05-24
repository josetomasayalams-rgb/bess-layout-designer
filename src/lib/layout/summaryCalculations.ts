import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectSummary, SiteArea } from "@/types/project";
import { equipmentCatalog, type EquipmentSpec } from "@/data/equipmentCatalog";

function specById(id: string): EquipmentSpec | undefined {
  return equipmentCatalog.find((e) => e.id === id);
}

export function computeSummary(
  placed: PlacedEquipment[],
  siteArea: SiteArea | null
): ProjectSummary {
  let battery_container_count = 0;
  let pcs_count = 0;
  let total_apparent_power_mva = 0;
  let total_energy_mwh_dc_bol = 0;
  let occupied_area_m2 = 0;

  for (const p of placed) {
    const spec = specById(p.equipmentSpecId);
    if (!spec) continue;
    occupied_area_m2 += spec.footprint.length_m * spec.footprint.width_m;
    if (spec.type === "battery_container") {
      battery_container_count += 1;
      total_energy_mwh_dc_bol += spec.electrical?.energy_mwh_dc_bol ?? 0;
    }
    if (spec.type === "pcs_mv_station") {
      pcs_count += 1;
      total_apparent_power_mva += spec.electrical?.apparent_power_mva ?? 0;
    }
  }

  const duration_hours_gross =
    total_apparent_power_mva > 0
      ? total_energy_mwh_dc_bol / total_apparent_power_mva
      : null;

  const occupation_ratio =
    siteArea && siteArea.area_m2 > 0 ? occupied_area_m2 / siteArea.area_m2 : null;

  return {
    battery_container_count,
    pcs_count,
    total_apparent_power_mva,
    total_energy_mwh_dc_bol,
    duration_hours_gross,
    site_area: siteArea,
    occupied_area_m2,
    occupation_ratio,
  };
}
