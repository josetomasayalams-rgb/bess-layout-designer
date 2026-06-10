import { useMemo } from "react";
import { Zap, HelpCircle } from "lucide-react";
import { citeLabel, OUTCOME_LABEL, EFFECTIVE_SEVERITY_CLASS, EFFECTIVE_SEVERITY_LABEL } from "./helpers";
import type { EvaluatedRuleEntry } from "@/rules/regulatoryProfileEvaluator";

interface PreliminaryElectricalSectionProps {
  entries: EvaluatedRuleEntry[];
  isEs: boolean;
  architecturePopulated: boolean;
}

export function PreliminaryElectricalSection({
  entries,
  isEs,
  architecturePopulated,
}: PreliminaryElectricalSectionProps) {
  // Stable sort by id so display ordering matches the docs (007, 008, 009,
  // 013, 014, 015, 016, 017).
  const ordered = useMemo(
    () => [...entries].sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
    [entries]
  );

  return (
    <div className="mt-5 border-t border-slate-800 pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
          <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          {isEs
            ? "Validaciones eléctricas preliminares"
            : "Preliminary electrical checks"}
        </h3>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
          {ordered.length} {isEs ? "verificaciones" : "checks"}
        </span>
      </div>

      <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[10px] leading-snug text-amber-100/90">
        {isEs
          ? "Estimaciones preliminares de referencia. No reemplazan estudios eléctricos de detalle (flujo de potencia, cortocircuito, coordinación de protecciones, armónicos, estabilidad RMS/EMT, arc-flash, calidad de potencia en el PCC, coordinación de aislamiento)."
          : "Reference-only preliminary estimates. They do not replace detailed electrical studies (load flow, short circuit, protection coordination, harmonics, RMS/EMT stability, arc flash, power quality at the PCC, insulation coordination)."}
      </p>

      {ordered.length === 0 ? (
        <p className="rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-2 text-[11px] text-slate-400">
          {isEs
            ? "El perfil activo no incluye reglas eléctricas preliminares."
            : "The active profile carries no preliminary electrical rules."}
        </p>
      ) : !architecturePopulated ? (
        <p className="rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-2 text-[11px] text-slate-400">
          {isEs
            ? "Cargar la arquitectura v1.2 (preconfiguración BESS del Desierto o equivalente) para evaluar las 8 verificaciones."
            : "Load the v1.2 architecture (BESS del Desierto preset or equivalent) to evaluate the 8 checks."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {ordered.map((entry) => {
            const sevClass =
              EFFECTIVE_SEVERITY_CLASS[entry.severity] ??
              EFFECTIVE_SEVERITY_CLASS.info;
            const sevLabel =
              EFFECTIVE_SEVERITY_LABEL[entry.severity] ??
              EFFECTIVE_SEVERITY_LABEL.info;
            const outcome = OUTCOME_LABEL[entry.outcome];
            const outcomeLabel = isEs ? outcome.es : outcome.en;
            const cite = citeLabel(entry);
            const capped = entry.severityCappedBy;
            return (
              <li
                key={entry.ruleId}
                className={`rounded-md border px-2 py-1.5 text-[11px] leading-snug ${sevClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{entry.title}</span>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="rounded-sm border border-current/40 bg-black/10 px-1.5 py-px text-[9px] uppercase tracking-wider">
                      {isEs ? sevLabel.es : sevLabel.en}
                    </span>
                    <span className="rounded-sm border border-slate-600/40 bg-slate-900/40 px-1.5 py-px text-[8.5px] uppercase tracking-wider text-slate-300">
                      {outcomeLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-0.5 font-mono text-[9px] opacity-80">
                  {entry.ruleId}
                  {entry.appParameter ? ` · ${entry.appParameter}` : ""}
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
                {capped ? (
                  <div className="mt-1 rounded-sm border border-slate-600/30 bg-slate-900/40 px-1.5 py-1 text-[9px] leading-snug text-slate-300">
                    {isEs ? "Severidad limitada" : "Severity capped"}:{" "}
                    <span className="font-mono">
                      {isEs
                        ? (EFFECTIVE_SEVERITY_LABEL[capped.from]?.es ?? capped.from)
                        : (EFFECTIVE_SEVERITY_LABEL[capped.from]?.en ?? capped.from)}
                    </span> →{" "}
                    <span className="font-mono">
                      {isEs
                        ? (EFFECTIVE_SEVERITY_LABEL[entry.severity]?.es ?? entry.severity)
                        : (EFFECTIVE_SEVERITY_LABEL[entry.severity]?.en ?? entry.severity)}
                    </span>{" "}
                    ({capped.by === "document_level"
                      ? isEs ? "nivel documental" : "document level"
                      : isEs ? "confianza de evidencia" : "evidence confidence"})
                    <div className="mt-0.5 opacity-80">{capped.detail}</div>
                  </div>
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
        </ul>
      )}
    </div>
  );
}
