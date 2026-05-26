"use client";

import { useMemo } from "react";
import { BookOpen, HelpCircle } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { regulatoryRuleProfiles } from "@/rules/profiles/regulatoryRuleProfiles";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { isPhase8ElectricalRuleId } from "@/rules/regulatoryRulesCatalog";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import type { RuleCategory } from "@/rules/types";

import {
  ComplianceSummary,
  ComplianceIssuesList,
  PreliminaryElectricalSection,
  OUTCOME_LABEL,
  citeLabel,
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

const CATEGORY_LABEL: Record<RuleCategory, { es: string; en: string }> = {
  physical_layout: { es: "Layout físico", en: "Physical layout" },
  electrical: { es: "Eléctrica", en: "Electrical" },
  regulatory_sec: { es: "SEC", en: "SEC" },
  regulatory_cne_cen: { es: "CNE / CEN", en: "CNE / CEN" },
  regulatory_territorial: { es: "Territorial", en: "Territorial" },
  regulatory_environmental: { es: "Ambiental", en: "Environmental" },
  regulatory_fire_safety: { es: "Incendio", en: "Fire safety" },
  engineering_detail: { es: "Ing. detalle", en: "Detail eng." },
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
      <div className="mt-5 border-t border-slate-800 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
            <BookOpen className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
            {isEs ? "Matriz normativa candidata" : "Candidate rule matrix"}
          </h3>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
            {ruleEvaluation.rules.length} {isEs ? "reglas" : "rules"}
          </span>
        </div>

        <PresetLoader isEs={isEs} hasArchitecture={conversionStations.length > 0} />

        <label className="block text-[10px] uppercase tracking-wide text-slate-500">
          {isEs ? "Perfil de reglas" : "Rule profile"}
          <select
            value={activeRuleProfileId}
            onChange={(event) =>
              setActiveRuleProfileId(
                event.target.value as typeof activeRuleProfileId
              )
            }
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            {regulatoryRuleProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <CountTile
            value={ruleEvaluation.totals.pass}
            label={isEs ? "Cumple" : "Pass"}
            className="text-emerald-200"
          />
          <CountTile
            value={ruleEvaluation.totals.violation}
            label={isEs ? "Violación" : "Violation"}
            className="text-rose-200"
          />
          <CountTile
            value={ruleEvaluation.totals.manualCheck}
            label={isEs ? "Manual" : "Manual"}
            className="text-sky-200"
          />
          <CountTile
            value={ruleEvaluation.totals.pending}
            label={isEs ? "Pendiente" : "Pending"}
            className="text-amber-200"
          />
          <CountTile
            value={ruleEvaluation.totals.notEvaluable}
            label={isEs ? "No eval." : "Not eval."}
            className="text-slate-300"
          />
          <CountTile
            value={ruleEvaluation.totals.outOfScope}
            label={isEs ? "Fuera" : "Out"}
            className="text-slate-400"
          />
        </div>

        {ruleEvaluation.totals.blockingViolations > 0 ||
        ruleEvaluation.totals.warningViolations > 0 ? (
          <p className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[10px] text-rose-100">
            {isEs ? "Severidad" : "Severity"}:{" "}
            <span className="font-mono">
              {ruleEvaluation.totals.blockingViolations} {isEs ? "bloqueantes" : "blocking"}
            </span>{" "}
            ·{" "}
            <span className="font-mono">
              {ruleEvaluation.totals.warningViolations} {isEs ? "avisos" : "warning"}
            </span>
          </p>
        ) : null}

        <div className="mt-3 space-y-3">
          {(Object.keys(ruleEvaluation.byCategory) as RuleCategory[])
            .filter((cat) => ruleEvaluation.byCategory[cat].length > 0)
            .map((cat) => (
              <div
                key={cat}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                  <span>{isEs ? CATEGORY_LABEL[cat].es : CATEGORY_LABEL[cat].en}</span>
                  <span className="font-mono text-slate-500">
                    {ruleEvaluation.byCategory[cat].length}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {ruleEvaluation.byCategory[cat].slice(0, 6).map((entry) => {
                    const outcome = OUTCOME_LABEL[entry.outcome];
                    const outcomeLabel = isEs ? outcome.es : outcome.en;
                    const cite = citeLabel(entry);
                    return (
                      <li
                        key={entry.ruleId}
                        className={`rounded-md border px-2 py-1.5 text-[11px] leading-snug ${outcome.className}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{entry.title}</span>
                          <span className="shrink-0 rounded-sm border border-current/40 bg-black/10 px-1.5 py-px text-[9px] uppercase tracking-wider">
                            {outcomeLabel}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[9px] opacity-80">
                          {entry.ruleId}
                          {entry.severity !== "info" ? ` · ${entry.severity}` : ""}
                        </div>
                        {entry.violations.length > 0 ? (
                          <ul className="mt-1 space-y-0.5">
                            {entry.violations.slice(0, 3).map((v, i) => (
                              <li
                                key={`${entry.ruleId}-v${i}`}
                                className="opacity-90"
                              >
                                · {v.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {cite ? (
                          <div className="mt-1 text-[9px] opacity-70">
                            <HelpCircle
                              className="mr-1 inline h-2.5 w-2.5"
                              aria-hidden="true"
                            />
                            {cite}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                  {ruleEvaluation.byCategory[cat].length > 6 ? (
                    <li className="text-[10px] text-slate-500">
                      +{ruleEvaluation.byCategory[cat].length - 6}{" "}
                      {isEs ? "más" : "more"}
                    </li>
                  ) : null}
                </ul>
              </div>
            ))}
        </div>

        <p className="mt-3 text-[10px] leading-snug text-slate-500">
          {isEs
            ? "Reglas candidatas: la mayoría requiere lectura humana del PDF primario antes de promoverse a regla certificada. Esta sección no sustituye revisión legal."
            : "Candidate rules. Most require human reading of the primary PDF before promotion. This section is not a legal review."}
        </p>
      </div>
    </section>
  );
}

function PresetLoader({
  isEs,
  hasArchitecture,
}: {
  isEs: boolean;
  hasArchitecture: boolean;
}) {
  const loadPreset = useProjectStore((s) => s.loadBessDelDesiertoPresetV12);
  const clearPreset = useProjectStore((s) => s.clearProjectV12Slices);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-2">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {isEs ? "Arquitectura v1.2" : "v1.2 architecture"}
      </span>
      <button
        type="button"
        onClick={loadPreset}
        className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-100 hover:border-violet-300"
      >
        {isEs ? "Cargar BESS del Desierto" : "Load BESS del Desierto"}
      </button>
      {hasArchitecture ? (
        <button
          type="button"
          onClick={clearPreset}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500"
        >
          {isEs ? "Limpiar" : "Clear"}
        </button>
      ) : null}
      <span className="ml-auto text-[10px] text-slate-500">
        {hasArchitecture
          ? isEs
            ? "Cargada"
            : "Loaded"
          : isEs
            ? "No cargada"
            : "Not loaded"}
      </span>
    </div>
  );
}

/**
 * Renders the 8 Fase-8 preliminary electrical checks as a dedicated subsection.
 *
 * Surfacing rules:
 *  - Effective severity badge (post `severityCeiling`), NOT declared severity.
 *  - If the severity was capped, show the reason inline so the reader sees
 *    that the rule is preliminary by design.
 *  - The whole block is framed as "preliminary / referential / not certifying"
 *    so a user cannot mistake it for a load-flow, short-circuit, harmonics or
 *    EMT study (which are explicitly out of scope per `exclusionRegistry`).
 */


function CountTile({
  value,
  label,
  className = "",
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
      <div className={`font-mono text-base font-semibold ${className}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
