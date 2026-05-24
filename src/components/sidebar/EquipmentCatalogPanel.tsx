"use client";

import { BatteryCharging, Cpu } from "lucide-react";
import { equipmentCatalog, type SourceReliability } from "@/data/equipmentCatalog";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

function reliabilityVariant(
  r: SourceReliability
): "certified" | "preliminary" | "pending" {
  if (r === "certified_data") return "certified";
  if (r === "pending_validation") return "pending";
  return "preliminary";
}
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { copyFor, reliabilityLabel } from "@/lib/i18n";
import {
  formatApparentPowerMva,
  formatEnergyMWh,
  formatLength,
} from "@/lib/units/formatUnits";

export function EquipmentCatalogPanel() {
  const pendingId = useProjectStore((s) => s.pendingPlacementSpecId);
  const setPlacementSpec = useProjectStore((s) => s.setPlacementSpec);
  const locale = useUiStore((s) => s.locale);
  const t = copyFor(locale);

  return (
    <CollapsibleSection
      icon={BatteryCharging}
      iconColor="text-emerald-300"
      title={t.equipment.title}
      description={t.equipment.description}
    >
      <ul className="space-y-2">
        {equipmentCatalog.filter((spec) => spec.type !== "battery_container").map((spec) => {
          const isActive = pendingId === spec.id;
          const Icon = spec.type === "battery_container" ? BatteryCharging : Cpu;
          return (
            <li key={spec.id}>
              <button
                type="button"
                onClick={() => setPlacementSpec(isActive ? null : spec.id)}
                className={`w-full rounded-lg border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isActive
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-slate-800 bg-slate-900/70 hover:border-slate-600"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isActive ? "text-emerald-300" : "text-slate-500"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100">
                      {spec.manufacturer} {spec.model}
                    </div>
                    <div className="text-xs text-slate-400">
                      {spec.type === "battery_container"
                        ? `${t.equipment.batteryContainer} · ${
                            spec.electrical?.energy_mwh_dc_bol
                              ? formatEnergyMWh(
                                  spec.electrical.energy_mwh_dc_bol,
                                  { digits: 2, locale }
                                )
                              : "-"
                          } DC BOL`
                        : `${t.equipment.pcs} · ${
                            spec.electrical?.apparent_power_mva
                              ? formatApparentPowerMva(
                                  spec.electrical.apparent_power_mva,
                                  { digits: 2, locale }
                                )
                              : "-"
                          }`}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  {formatLength(spec.footprint.length_m, {
                    digits: 2,
                    locale,
                  })} ×{" "}
                  {formatLength(spec.footprint.width_m, {
                    digits: 2,
                    locale,
                  })}
                  {spec.footprint.height_m
                    ? ` · h ${formatLength(spec.footprint.height_m, {
                        digits: 2,
                        locale,
                      })}`
                    : null}
                </div>
                <Badge
                  variant={reliabilityVariant(spec.source.reliability)}
                  className="mt-2"
                >
                  {reliabilityLabel(spec.source.reliability, locale)}
                </Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </CollapsibleSection>
  );
}
