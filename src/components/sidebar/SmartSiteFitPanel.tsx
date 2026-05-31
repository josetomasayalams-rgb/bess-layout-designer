"use client";

import React, { useState } from "react";
import { Compass, Info, AlertCircle } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { TargetSizingTab } from "./smart-site-fit/TargetSizingTab";
import { TerrainSizingTab } from "./smart-site-fit/TerrainSizingTab";

export function SmartSiteFitPanel() {
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const [activeTab, setActiveTab] = useState<"target" | "terrain">("target");

  const polygon = useProjectStore((s) => s.polygon);
  const anchor = useProjectStore((s) => s.anchor);
  const smartSiteFit = useProjectStore((s) => s.smartSiteFit);
  const smartSiteFitApplied = useProjectStore((s) => s.smartSiteFitApplied);

  const runSmartSiteFitAnalysis = useProjectStore((s) => s.runSmartSiteFitAnalysis);
  const selectSmartSiteFitAlternative = useProjectStore((s) => s.selectSmartSiteFitAlternative);
  const updateSmartSiteFitOverrides = useProjectStore((s) => s.updateSmartSiteFitOverrides);
  const recalculateSmartSiteFitPreview = useProjectStore((s) => s.recalculateSmartSiteFitPreview);
  const applySmartSiteFitAlternative = useProjectStore((s) => s.applySmartSiteFitAlternative);
  const discardSmartSiteFit = useProjectStore((s) => s.discardSmartSiteFit);

  const hasPolygon = polygon.length >= 3;

  // Architecture-aware applied-layout banner. Integrated presets (e.g. Tesla
  // Megapack) carry their own power conversion, so pcsCount === 0 — the banner
  // must report integrated units instead of an misleading "0 PCS". Derived from
  // the applied counts since the metadata has no explicit architecture flag.
  const appliedIsIntegrated =
    !!smartSiteFitApplied &&
    smartSiteFitApplied.pcsCount === 0 &&
    smartSiteFitApplied.bessCount > 0;
  const appliedBannerText = !smartSiteFitApplied
    ? ""
    : appliedIsIntegrated
    ? isEs
      ? `Estrategia: ${smartSiteFitApplied.strategy}. Unidades integradas: ${smartSiteFitApplied.bessCount} (conversión integrada). Puntaje: ${smartSiteFitApplied.score}/100.`
      : `Strategy: ${smartSiteFitApplied.strategy}. Integrated units: ${smartSiteFitApplied.bessCount} (integrated conversion). Score: ${smartSiteFitApplied.score}/100.`
    : isEs
    ? `Estrategia: ${smartSiteFitApplied.strategy}. Contenedores: ${smartSiteFitApplied.bessCount} BESS, Conversión: ${smartSiteFitApplied.pcsCount} PCS. Puntaje: ${smartSiteFitApplied.score}/100.`
    : `Strategy: ${smartSiteFitApplied.strategy}. Containers: ${smartSiteFitApplied.bessCount} BESS, Stations: ${smartSiteFitApplied.pcsCount} PCS. Score: ${smartSiteFitApplied.score}/100.`;

  return (
    <CollapsibleSection
      icon={Compass}
      iconColor="text-cyan-400"
      title={isEs ? "Dimensionamiento inteligente" : "Smart sizing"}
      description={isEs ? "Por objetivo o por terreno" : "By target or by terrain"}
    >
      <div className="space-y-4 pt-1">
        {/* Disclaimer / Warning Box */}
        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2.5 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
          <p className="text-[10px] leading-normal text-slate-500">
            {isEs
              ? "Predimensionamiento preliminar. No reemplaza ingeniería de detalle ni estudios de interconexión definitivos. Las especificaciones corresponden a supuestos preliminares y deben ser validadas por el fabricante o EPC."
              : "Preliminary sizing. Not a substitute for detailed engineering or final interconnection studies. Specifications represent preliminary assumptions and must be validated by the manufacturer or EPC."}
          </p>
        </div>

        {/* Applied layout alert if available */}
        {smartSiteFitApplied && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2.5 space-y-1 text-[11px] text-emerald-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{isEs ? "Layout predimensionado aplicado" : "Sizing layout applied"}</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              {appliedBannerText}
            </p>
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => {
              setActiveTab("target");
              discardSmartSiteFit();
            }}
            className={`flex-1 pb-2 text-center text-xs font-semibold border-b-2 transition-all ${
              activeTab === "target"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {isEs ? "Por objetivo" : "By target"}
          </button>
          <button
            onClick={() => {
              setActiveTab("terrain");
              discardSmartSiteFit();
            }}
            className={`flex-1 pb-2 text-center text-xs font-semibold border-b-2 transition-all ${
              activeTab === "terrain"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {isEs ? "Por terreno" : "By terrain"}
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "target" ? (
          <TargetSizingTab
            result={smartSiteFit.result}
            selectedAlternativeId={smartSiteFit.selectedAlternativeId}
            overrides={smartSiteFit.overrides}
            isDirty={smartSiteFit.dirty}
            onRunAnalysis={runSmartSiteFitAnalysis}
            onSelectAlternative={selectSmartSiteFitAlternative}
            onUpdateOverrides={updateSmartSiteFitOverrides}
            onRecalculate={recalculateSmartSiteFitPreview}
            onApply={applySmartSiteFitAlternative}
            onDiscard={discardSmartSiteFit}
            locale={locale}
            polygon={polygon}
            anchor={anchor ?? undefined}
          />
        ) : (
          <TerrainSizingTab
            hasPolygon={hasPolygon}
            result={smartSiteFit.result}
            selectedAlternativeId={smartSiteFit.selectedAlternativeId}
            overrides={smartSiteFit.overrides}
            isDirty={smartSiteFit.dirty}
            onRunAnalysis={runSmartSiteFitAnalysis}
            onSelectAlternative={selectSmartSiteFitAlternative}
            onUpdateOverrides={updateSmartSiteFitOverrides}
            onRecalculate={recalculateSmartSiteFitPreview}
            onApply={applySmartSiteFitAlternative}
            onDiscard={discardSmartSiteFit}
            locale={locale}
            polygon={polygon}
            anchor={anchor ?? undefined}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}
