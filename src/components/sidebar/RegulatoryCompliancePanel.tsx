"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { isPhase8ElectricalRuleId } from "@/rules/regulatoryRulesCatalog";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";

import {
  ComplianceSummary,
  ComplianceIssuesList,
  PreliminaryElectricalSection,
  CandidateRuleMatrix,
} from "./compliance";

const STATUS_COPY = {
  compliant: {
    label: "Cumple",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  compliant_with_warnings: {
    label: "Cumple con advertencias",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  non_compliant: {
    label: "No cumple",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  },
  not_evaluated: {
    label: "No evaluado",
    className: "border-slate-700 bg-slate-900 text-slate-300",
  },
};

const SEVERITY_CLASS = {
  compliant: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

// ──────────────────────────────────────────────────────────────────
// Panel
// ──────────────────────────────────────────────────────────────────

export function RegulatoryCompliancePanel() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const blocks = useProjectStore((s) => s.blocks);
  const conversionStations = useProjectStore((s) => s.conversionStations);
  const mvFeeders = useProjectStore((s) => s.mvFeeders);
  const mvBuses = useProjectStore((s) => s.mvBuses);
  const poi = useProjectStore((s) => s.poi);
  // Phase 8 — auxiliary slices required by RULE-ELEC-014/015/016. Without
  // these, the engine silently skips those checks. Selecting them here keeps
  // the panel in sync with what the report assembler already receives.
  const auxiliaryServices = useProjectStore((s) => s.auxiliaryServices);
  const operationalLimits = useProjectStore((s) => s.operationalLimits);
  const ppc = useProjectStore((s) => s.ppc);
  const inconsistencies = useProjectStore((s) => s.inconsistencies);
  const activeProfileId = useRegulatoryStore((s) => s.activeProfileId);
  const activeRuleProfileId = useRegulatoryStore((s) => s.activeRuleProfileId);
  const setActiveRuleProfileId = useRegulatoryStore((s) => s.setActiveRuleProfileId);
  const context = useRegulatoryStore((s) => s.context);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const loadPreset = useProjectStore((s) => s.loadBessDelDesiertoPresetV12);
  const clearPreset = useProjectStore((s) => s.clearProjectV12Slices);

  const profile = getRegulatoryProfile(activeProfileId);
  const result = validateBessLayout({ placed, polygon, anchor, profile, context });

  const electricalValidation = useMemo(
    () =>
      validateElectricalTopology({
        blocks,
        conversionStations,
        mvFeeders,
        mvBuses,
        poi,
        auxiliaryServices,
        operationalLimits,
        ppc,
      }),
    [
      blocks,
      conversionStations,
      mvFeeders,
      mvBuses,
      poi,
      auxiliaryServices,
      operationalLimits,
      ppc,
    ]
  );

  const ruleEvaluation = useMemo(
    () =>
      runRegulatoryEvaluation({
        profileId: activeRuleProfileId,
        layoutValidation: result,
        electricalValidation,
        blocks,
        conversionStations,
        mvFeeders,
        mvBuses,
        poi,
        inconsistencies,
      }),
    [
      activeRuleProfileId,
      result,
      electricalValidation,
      blocks,
      conversionStations,
      mvFeeders,
      mvBuses,
      poi,
      inconsistencies,
    ]
  );
  const status = STATUS_COPY[result.projectStatus];
  const statusLabel = isEs
    ? status.label
    : {
        compliant: "Compliant",
        compliant_with_warnings: "Compliant with warnings",
        non_compliant: "Non-compliant",
        not_evaluated: "Not evaluated",
      }[result.projectStatus];

  return (
    <section className="border-b border-slate-800 p-4">
      <ComplianceSummary
        result={result}
        profile={profile}
        isEs={isEs}
        statusCopy={status}
        statusLabel={statusLabel}
      />

      <ComplianceIssuesList
        issues={result.issues}
        isEs={isEs}
        locale={locale}
        severityClass={SEVERITY_CLASS}
      />

      <PreliminaryElectricalSection
        entries={ruleEvaluation.byCategory.electrical.filter((e) =>
          isPhase8ElectricalRuleId(e.ruleId)
        )}
        isEs={isEs}
        architecturePopulated={conversionStations.length > 0 || mvBuses.length > 0}
      />

      {/* ──── Matriz normativa candidata (Fase 10) ──── */}
      <CandidateRuleMatrix
        ruleEvaluation={ruleEvaluation}
        activeRuleProfileId={activeRuleProfileId}
        setActiveRuleProfileId={setActiveRuleProfileId}
        isEs={isEs}
        hasArchitecture={conversionStations.length > 0}
        onLoadPreset={loadPreset}
        onClearPreset={clearPreset}
      />
    </section>
  );
}
