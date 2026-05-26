import { FileDown } from "lucide-react";
import { exportRegulatoryReport } from "./helpers";
import { validateBessLayout } from "@/rules/bessValidationEngine";

interface ComplianceSummaryProps {
  result: ReturnType<typeof validateBessLayout>;
  profile: {
    name: string;
    notes: string;
  };
  isEs: boolean;
  statusCopy: {
    label: string;
    className: string;
  };
  statusLabel: string;
}

export function ComplianceSummary({
  result,
  profile,
  isEs,
  statusCopy,
  statusLabel,
}: ComplianceSummaryProps) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
            {isEs ? "Cumplimiento normativo" : "Regulatory compliance"}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {isEs
              ? "Motor de reglas activo: distancias BESS, límite del sitio y clearances eléctricos preliminares."
              : "Active rule engine: BESS distances, site boundary and preliminary electrical clearances."}
          </p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${statusCopy.className}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          [isEs ? "Reglas" : "Rules", result.checkedRules],
          [isEs ? "Críticos" : "Critical", result.criticalCount],
          [isEs ? "Avisos" : "Warnings", result.warningCount],
          [isEs ? "Cumple" : "Pass", result.compliantCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-2"
          >
            <div className="font-mono text-lg font-semibold text-slate-50">
              {value}
            </div>
            <div className="text-[10px] text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => exportRegulatoryReport(result)}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 hover:border-slate-500"
        >
          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Exportar reporte" : "Export report"}
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="text-[11px] font-medium text-slate-300">
          {isEs ? "Perfil activo" : "Active profile"}
        </div>
        <div className="mt-1 text-xs text-slate-100">{profile.name}</div>
        <p className="mt-1 text-[10px] leading-snug text-slate-500">
          {profile.notes}
        </p>
      </div>
    </>
  );
}
