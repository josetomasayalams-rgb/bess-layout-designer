"use client";

import { useState } from "react";
import {
  BookOpen,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { regulatoryRuleProfiles } from "@/rules/profiles/regulatoryRuleProfiles";
import type { RegulatoryRuleProfileId } from "@/rules/types";
import type { RegulatoryEvaluationResult, EvaluatedRuleEntry } from "@/rules/regulatoryProfileEvaluator";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { citeLabel, EFFECTIVE_SEVERITY_LABEL } from "./helpers";

export interface CandidateRuleMatrixProps {
  ruleEvaluation: RegulatoryEvaluationResult;
  activeRuleProfileId: RegulatoryRuleProfileId;
  setActiveRuleProfileId: (profileId: RegulatoryRuleProfileId) => void;
  isEs: boolean;
}

export function CandidateRuleMatrix({
  ruleEvaluation,
  activeRuleProfileId,
  setActiveRuleProfileId,
  isEs,
}: CandidateRuleMatrixProps) {
  const [showPassed, setShowPassed] = useState(false);
  const [showChecklists, setShowChecklists] = useState(false);
  const [showExclusions, setShowExclusions] = useState(false);

  // Sub-profile filters (Phase P4)
  const showFmGlobal = useRegulatoryStore((s) => s.showFmGlobal);
  const showSecOnly = useRegulatoryStore((s) => s.showSecOnly);
  const showTerritorial = useRegulatoryStore((s) => s.showTerritorial);
  const setShowFmGlobal = useRegulatoryStore((s) => s.setShowFmGlobal);
  const setShowSecOnly = useRegulatoryStore((s) => s.setShowSecOnly);
  const setShowTerritorial = useRegulatoryStore((s) => s.setShowTerritorial);

  // Group rules by outcome/type
  const failures = ruleEvaluation.rules.filter((r) => r.outcome === "violation");
  const checklists = ruleEvaluation.rules.filter(
    (r) => r.outcome === "manual_check" || r.ruleId.startsWith("RULE-PHYS-008") || r.ruleId.startsWith("RULE-PHYS-010")
  );
  const exclusions = ruleEvaluation.rules.filter((r) => r.outcome === "out_of_scope");
  const passed = ruleEvaluation.rules.filter((r) => r.outcome === "pass");

  // Sort failures by risk level priority: critical -> important -> om_insurance -> engineering_pending -> info
  const riskPriority = {
    critical: 0,
    important: 1,
    om_insurance: 2,
    engineering_pending: 3,
    info: 4,
  };
  const sortedFailures = [...failures].sort((a, b) => {
    const aPri = riskPriority[a.riskLevel ?? "info"] ?? 4;
    const bPri = riskPriority[b.riskLevel ?? "info"] ?? 4;
    return aPri - bPri;
  });

  // Calculate executive summary
  const hasCritical = failures.some((f) => f.riskLevel === "critical");
  const hasImportant = failures.some((f) => f.riskLevel === "important" || f.riskLevel === "om_insurance");

  let summaryStyle = "border-emerald-500/30 bg-emerald-500/5 text-emerald-200";
  let SummaryIcon = CheckCircle2;
  let summaryText = isEs
    ? "Sin inconformidades automáticas críticas. El layout preliminar cumple con las validaciones de contención y distanciamiento evaluadas."
    : "No critical automated nonconformities. The preliminary layout complies with the evaluated containment and spacing constraints.";

  if (hasCritical) {
    summaryStyle = "border-rose-500/30 bg-rose-500/5 text-rose-200";
    SummaryIcon = AlertTriangle;
    summaryText = isEs
      ? "Inconformidades críticas detectadas. El layout físico presenta solapamientos o invasiones de límites que impiden el predimensionamiento viable."
      : "Critical nonconformities detected. The physical layout contains overlaps or boundary crossings that block a viable predesign.";
  } else if (hasImportant) {
    summaryStyle = "border-amber-500/30 bg-amber-500/5 text-amber-200";
    SummaryIcon = AlertTriangle;
    summaryText = isEs
      ? "Advertencias de prefactibilidad activas. El terreno está contenido correctamente, pero existen criterios de distanciamiento de seguridad o fabricante que requieren revisión."
      : "Prefeasibility warnings active. Physical containment is correct, but safety or manufacturer clearances require review.";
  }

  return (
    <div className="mt-5 border-t border-slate-800 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
          <BookOpen className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
          {isEs ? "Diagnóstico normativo inteligente" : "Smart Regulatory Diagnosis"}
        </h3>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
          {ruleEvaluation.rules.length} {isEs ? "reglas" : "rules"}
        </span>
      </div>

      {/* Resumen Ejecutivo */}
      <div className={`mb-4 rounded-lg border p-3 text-[11px] leading-normal flex gap-2.5 items-start ${summaryStyle}`}>
        <SummaryIcon className="h-4.5 w-4.5 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-semibold block mb-0.5">
            {isEs ? "Estado general" : "Overall Status"}
          </span>
          <p className="opacity-90">{summaryText}</p>
        </div>
      </div>

      <label className="block text-[10px] uppercase tracking-wide text-slate-500">
        {isEs ? "Perfil de reglas" : "Rule profile"}
        <select
          value={activeRuleProfileId}
          onChange={(event) =>
            setActiveRuleProfileId(
              event.target.value as RegulatoryRuleProfileId
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

      {/* Sub-profile checkboxes */}
      <div className="mt-3.5 space-y-1.5 border-t border-slate-800/60 pt-3">
        <span className="block text-[9px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
          {isEs ? "Filtros de subperfiles" : "Sub-profile Filters"}
        </span>
        <label className="flex items-center gap-2 text-[10.5px] text-slate-300 hover:text-slate-100 cursor-pointer">
          <input
            type="checkbox"
            checked={showSecOnly}
            onChange={(e) => setShowSecOnly(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-violet-500 focus:ring-violet-500 h-3.5 w-3.5"
          />
          <span>{isEs ? "Exclusivo SEC (solo Chile)" : "SEC Only (Chile Only)"}</span>
        </label>
        <label className="flex items-center gap-2 text-[10.5px] text-slate-300 hover:text-slate-100 cursor-pointer">
          <input
            type="checkbox"
            checked={showFmGlobal}
            disabled={showSecOnly}
            onChange={(e) => setShowFmGlobal(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-violet-500 focus:ring-violet-500 h-3.5 w-3.5 disabled:opacity-40"
          />
          <span className={showSecOnly ? "opacity-40" : ""}>
            {isEs ? "Seguridad contra incendios (FM Global)" : "Fire Safety / FM Global"}
          </span>
        </label>
        <label className="flex items-center gap-2 text-[10.5px] text-slate-300 hover:text-slate-100 cursor-pointer">
          <input
            type="checkbox"
            checked={showTerritorial}
            disabled={showSecOnly}
            onChange={(e) => setShowTerritorial(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-violet-500 focus:ring-violet-500 h-3.5 w-3.5 disabled:opacity-40"
          />
          <span className={showSecOnly ? "opacity-40" : ""}>
            {isEs ? "Fajas Territoriales y Exclusiones" : "Territorial Strips & Exclusions"}
          </span>
        </label>
      </div>

      {/* Grid de conteo */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <CountTile
          value={ruleEvaluation.totals.pass}
          label={isEs ? "Sin inconf." : "No nonconf."}
          className="text-emerald-200"
        />
        <CountTile
          value={ruleEvaluation.totals.violation}
          label={isEs ? "Inconformid." : "Nonconform."}
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

      {/* Tarjetas de Diagnóstico Inteligente (Active issues/failures) */}
      <div className="mt-4 space-y-2.5">
        {sortedFailures.length > 0 ? (
          sortedFailures.map((entry) => (
            <DiagnosticCard key={entry.ruleId} entry={entry} isEs={isEs} />
          ))
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-3 text-center text-slate-500 text-[11px]">
            {isEs
              ? "No se detectaron inconformidades en las reglas automatizadas."
              : "No nonconformities detected in automated rules."}
          </div>
        )}
      </div>

      {/* Acordeón: lista de verificación de validación manual */}
      {checklists.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowChecklists(!showChecklists)}
            className="flex w-full items-center justify-between text-left text-[11px] font-semibold text-slate-300 hover:text-slate-100"
          >
            <span>
              {isEs ? "Lista de verificación de validación manual" : "Manual validation checklist"} ({checklists.length})
            </span>
            {showChecklists ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showChecklists && (
            <ul className="mt-2 space-y-2">
              {checklists.map((entry) => (
                <li key={entry.ruleId} className="rounded border border-slate-800 bg-slate-900/30 p-2 text-[10.5px]">
                  <div className="font-semibold text-slate-200">
                    {isEs ? (entry.simpleTitle?.es ?? entry.title) : (entry.simpleTitle?.en ?? entry.title)}
                  </div>
                  <p className="mt-0.5 text-slate-400 leading-normal">
                    {isEs ? (entry.diagnostic?.es ?? entry.description) : (entry.diagnostic?.en ?? entry.description)}
                  </p>
                  <div className="mt-1 font-mono text-[8.5px] text-slate-500">
                    {entry.ruleId} · {isEs ? "Revisión física manual" : "Manual physical review"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Acordeón: Exclusiones y fuera de alcance */}
      {exclusions.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowExclusions(!showExclusions)}
            className="flex w-full items-center justify-between text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200"
          >
            <span>
              {isEs ? "Criterios fuera de alcance" : "Out of scope criteria"} ({exclusions.length})
            </span>
            {showExclusions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showExclusions && (
            <ul className="mt-2 space-y-1">
              {exclusions.map((entry) => (
                <li key={entry.ruleId} className="py-1 text-[10px] text-slate-500 border-b border-slate-900">
                  <span className="font-medium text-slate-400">
                    {isEs ? (entry.simpleTitle?.es ?? entry.title) : (entry.simpleTitle?.en ?? entry.title)}
                  </span>
                  <span className="font-mono text-[8.5px] ml-1">({entry.ruleId})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Acordeón: Criterios aprobados (sin observaciones) */}
      {passed.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowPassed(!showPassed)}
            className="flex w-full items-center justify-between text-left text-[11px] font-semibold text-emerald-400/90 hover:text-emerald-300"
          >
            <span>
              {isEs
                ? `✓ ${passed.length} criterios evaluados sin observaciones`
                : `✓ ${passed.length} criteria evaluated with no remarks`}
            </span>
            {showPassed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showPassed && (
            <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {passed.map((entry) => (
                <li key={entry.ruleId} className="flex items-start gap-1.5 py-0.5 text-[10.5px] text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-300">
                      {isEs ? (entry.simpleTitle?.es ?? entry.title) : (entry.simpleTitle?.en ?? entry.title)}
                    </span>
                    <span className="font-mono text-[8.5px] text-slate-600 ml-1">({entry.ruleId})</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-snug text-slate-500 border-t border-slate-900 pt-3">
        {isEs
          ? "Reglas candidatas: la mayoría requiere lectura humana del PDF primario antes de promoverse a regla certificada. Algunas reglas pueden aparecer como advertencias o listas de verificación debido al alcance preliminar del diseño o a la falta de evidencia certificada. Su severidad final debe confirmarse durante la ingeniería de detalle."
          : "Candidate rules. Most require human reading of the primary PDF before promotion. Some rules may appear as warnings or checklist items due to the preliminary design scope or missing certified evidence. Their final severity must be confirmed during detailed engineering."}
      </p>
    </div>
  );
}

function DiagnosticCard({
  entry,
  isEs,
}: {
  entry: EvaluatedRuleEntry;
  isEs: boolean;
}) {
  const riskLabels = {
    critical: {
      es: "Riesgo Crítico",
      en: "Critical Risk",
      style: "border-red-500/30 bg-red-500/5 text-red-200",
      tagStyle: "border-red-500/40 bg-red-500/10 text-red-300",
    },
    important: {
      es: "Riesgo Importante",
      en: "Important Risk",
      style: "border-amber-500/30 bg-amber-500/5 text-amber-200",
      tagStyle: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    },
    om_insurance: {
      es: "Asegurabilidad y O&M",
      en: "Insurance & O&M",
      style: "border-violet-500/30 bg-violet-500/5 text-violet-200",
      tagStyle: "border-violet-500/40 bg-violet-500/10 text-violet-300",
    },
    engineering_pending: {
      es: "Pendiente de Ingeniería",
      en: "Engineering Pending",
      style: "border-slate-800 bg-slate-900/40 text-slate-300",
      tagStyle: "border-slate-700 bg-slate-800/40 text-slate-300",
    },
    info: {
      es: "Informativo",
      en: "Info",
      style: "border-slate-800 bg-slate-900/30 text-slate-400",
      tagStyle: "border-slate-800 bg-slate-900/40 text-slate-400",
    },
  };

  const risk = riskLabels[entry.riskLevel ?? "info"];
  const title = isEs ? (entry.simpleTitle?.es ?? entry.title) : (entry.simpleTitle?.en ?? entry.title);
  const diagText = isEs ? (entry.diagnostic?.es ?? entry.description) : (entry.diagnostic?.en ?? entry.description);
  const impact = isEs ? entry.diagnosticImpact?.es : entry.diagnosticImpact?.en;
  const action = isEs ? entry.diagnosticAction?.es : entry.diagnosticAction?.en;
  const cite = citeLabel(entry);

  return (
    <div className={`rounded-lg border p-3 text-[11px] leading-snug space-y-2 ${risk.style}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-xs text-slate-100">{title}</span>
        <span className={`shrink-0 rounded-sm border px-1.5 py-px text-[8.5px] uppercase tracking-wider font-semibold ${risk.tagStyle}`}>
          {isEs ? risk.es : risk.en}
        </span>
      </div>

      <p className="text-slate-300 leading-normal">{diagText}</p>

      {entry.violations.length > 0 && (
        <div className="rounded border border-slate-800 bg-black/10 p-1.5 font-mono text-[9px] leading-normal space-y-0.5 text-slate-400">
          {entry.violations.map((v, i) => (
            <div key={i} className="opacity-90">
              · {v.message}
            </div>
          ))}
        </div>
      )}

      {entry.severityCappedBy && (
        <div className="rounded border border-slate-800/40 bg-slate-950/20 px-2 py-1 text-[9px] leading-snug text-slate-400">
          {isEs ? "Severidad limitada" : "Severity capped"}:{" "}
          <span className="font-mono">
            {isEs
              ? (EFFECTIVE_SEVERITY_LABEL[entry.severityCappedBy.from]?.es ?? entry.severityCappedBy.from)
              : (EFFECTIVE_SEVERITY_LABEL[entry.severityCappedBy.from]?.en ?? entry.severityCappedBy.from)}
          </span> →{" "}
          <span className="font-mono">
            {isEs
              ? (EFFECTIVE_SEVERITY_LABEL[entry.severity]?.es ?? entry.severity)
              : (EFFECTIVE_SEVERITY_LABEL[entry.severity]?.en ?? entry.severity)}
          </span>{" "}
          ({entry.severityCappedBy.by === "document_level"
            ? isEs ? "nivel documental" : "document level"
            : isEs ? "confianza de evidencia" : "evidence confidence"})
          <div className="mt-0.5 opacity-80">{entry.severityCappedBy.detail}</div>
        </div>
      )}

      {impact && (
        <div className="text-slate-400 text-[10px] leading-normal">
          <strong className="text-slate-300">{isEs ? "Impacto: " : "Impact: "}</strong>
          {impact}
        </div>
      )}

      {action && (
        <div className="text-cyan-200 text-[10px] leading-normal font-medium bg-cyan-950/30 border border-cyan-500/10 rounded px-2.5 py-1.5">
          <strong className="text-cyan-100 block mb-0.5">{isEs ? "Mitigación recomendada:" : "Recommended mitigation:"}</strong>
          {action}
        </div>
      )}

      {cite && (
        <div className="pt-1.5 border-t border-slate-800/30 flex items-center gap-1 text-[9px] text-slate-500">
          <HelpCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{cite}</span>
        </div>
      )}
    </div>
  );
}

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
    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 min-w-0">
      <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={`font-mono text-sm font-semibold shrink-0 ml-2 ${className}`}>
        {value}
      </span>
    </div>
  );
}
