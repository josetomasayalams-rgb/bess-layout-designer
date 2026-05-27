import { CheckCircle2, AlertTriangle } from "lucide-react";
import { localizedIssue } from "./helpers";
import { formatLength } from "@/lib/units/formatUnits";
import type { ValidationIssue } from "@/types/bessLayoutTypes";
import type { Locale } from "@/lib/i18n";

interface ComplianceIssuesListProps {
  issues: ValidationIssue[];
  isEs: boolean;
  locale: Locale;
  severityClass: Record<string, string>;
}

export function ComplianceIssuesList({
  issues,
  isEs,
  locale,
  severityClass,
}: ComplianceIssuesListProps) {
  return (
    <ul className="mt-3 space-y-2">
      {issues.length === 0 ? (
        <li className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {isEs
            ? "No hay conflictos normativos activos para las reglas implementadas."
            : "No active regulatory conflicts for the implemented rules."}
        </li>
      ) : null}
      {issues.slice(0, 8).map((issue) => {
        const copy = localizedIssue(issue, isEs);
        return (
          <li
            key={issue.id}
            className={`rounded-lg border p-3 text-[11px] leading-snug ${severityClass[issue.severity]}`}
          >
            <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[9px]">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {issue.severity === "critical"
                ? isEs
                  ? "crítico"
                  : "critical"
                : isEs
                  ? "advertencia"
                  : "warning"} ·{" "}
              {copy.ruleLabel}
            </div>
            <div>{copy.message}</div>
            {issue.measured_m !== undefined && issue.required_m !== undefined ? (
              <div className="mt-1 font-mono text-[10px] opacity-90">
                {isEs ? "Medido" : "Measured"}{" "}
                {formatLength(issue.measured_m, {
                  digits: 2,
                  locale,
                })}{" "}
                /{" "}
                {isEs ? "requerido" : "required"}{" "}
                {formatLength(issue.required_m, {
                  digits: 2,
                  locale,
                })}
              </div>
            ) : null}
            <div className="mt-1 text-[10px] opacity-80">
              {isEs ? "Acción" : "Action"}: {copy.recommendation}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
