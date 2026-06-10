"use client";

import { Info, MapPinned, Ruler, Settings2 } from "lucide-react";
import { EquipmentCatalogPanel } from "@/components/sidebar/EquipmentCatalogPanel";
import { BessModelLibraryPanel } from "@/components/sidebar/BessModelLibraryPanel";
import { CaseStudyPanel } from "@/components/sidebar/CaseStudyPanel";
import { PreliminaryDesignToolsPanel } from "@/components/sidebar/PreliminaryDesignToolsPanel";
import { LayoutComparisonPanel } from "@/components/sidebar/LayoutComparisonPanel";
import { MVArchitecturePanel } from "@/components/sidebar/MVArchitecturePanel";
import { ParametricTerrainPanel } from "@/components/sidebar/ParametricTerrainPanel";
import { RegulatoryConfigPanel } from "@/components/sidebar/RegulatoryConfigPanel";
import { SmartSiteFitPanel } from "@/components/sidebar/SmartSiteFitPanel";
import { SizingComparisonPanel } from "@/components/sidebar/SizingComparisonPanel";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { constraintCopy, copyFor } from "@/lib/i18n";
import { getProjectMetrics } from "@/lib/layout/projectMetrics";
import { defaultConstraints } from "@/data/defaultConstraints";
import { formatAreaDual, formatLength } from "@/lib/units/formatUnits";

export function ConfigurationSidebar() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const locale = useUiStore((s) => s.locale);
  const metrics = getProjectMetrics(polygon, placed, anchor);
  const t = copyFor(locale);

  return (
    <aside className="flex w-full max-w-full min-w-0 flex-col overflow-x-hidden bg-slate-950 text-slate-100 lg:min-h-0 lg:border-r lg:border-slate-800">
      {/* FlowStepper relocated to AppShell (Fase 11A.1) so it stays visible
       * regardless of the sidebar collapse state. */}
      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto">
        <CollapsibleSection
          icon={MapPinned}
          title={t.terrain.title}
          description={t.terrain.description}
        >
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">{t.terrain.status}</dt>
                <dd className="mt-1 font-medium text-slate-100">
                  {metrics.hasTerrain
                    ? t.terrain.polygonReady
                    : t.terrain.noTerrain}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.terrain.vertices}</dt>
                <dd className="mt-1 font-mono text-slate-100">
                  {polygon.length}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.terrain.area}</dt>
                <dd className="mt-1 font-mono text-slate-100">
                  {metrics.siteArea
                    ? formatAreaDual(metrics.siteArea.area_m2, {
                        digits: 0,
                        locale,
                      })
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.terrain.coordinateRef}</dt>
                <dd className="mt-1 font-mono text-slate-100">
                  {anchor ? t.terrain.localEnu : "-"}
                </dd>
              </div>
            </dl>
            {!metrics.hasTerrain ? (
              <p className="mt-3 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-[11px] leading-snug text-cyan-100">
                {t.terrain.empty}
              </p>
            ) : null}
          </div>
          <ParametricTerrainPanel />
        </CollapsibleSection>

        <SmartSiteFitPanel />
        <SizingComparisonPanel />

        <PreliminaryDesignToolsPanel />
        <BessModelLibraryPanel />
        <CaseStudyPanel />
        <MVArchitecturePanel />
        <LayoutComparisonPanel />
        <EquipmentCatalogPanel />
        <RegulatoryConfigPanel />

        <CollapsibleSection
          icon={Ruler}
          title={t.spacing.title}
          description={t.spacing.description}
        >
          <div className="space-y-2">
            {defaultConstraints.map((constraint) => {
              const translated = constraintCopy(constraint.id, locale);
              return (
                <div
                  key={constraint.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-slate-200">
                      {translated.label}
                    </div>
                    <div className="font-mono text-xs text-cyan-200">
                      {formatLength(constraint.value_m, {
                        digits: 1,
                        locale,
                      })}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {translated.notes || constraint.notes}
                  </p>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={Settings2}
          title={t.advanced.title}
          description={t.advanced.description}
        >
          <div className="space-y-2 text-[11px] text-slate-400">
            {t.advanced.checks.map((item) => (
              <div
                key={item}
                className="flex gap-2 rounded-md border border-slate-800 bg-slate-900/50 p-2"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </aside>
  );
}
