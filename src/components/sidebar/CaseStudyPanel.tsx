"use client";

import { AlertTriangle, Database, Grid3X3, ShieldAlert } from "lucide-react";
import { projectCaseStudies } from "@/data/projectCaseStudies";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { generatedCaseStudyGroupPrefix } from "@/lib/layout/caseStudyLayoutGenerator";
import { calculateCaseStudySizing } from "@/lib/sizing/preliminarySizing";
import { evaluateCaseStudyCompatibility } from "@/lib/electrical/compatibility";
import {
  formatApparentPowerMva,
  formatEnergyMWh,
  formatNumber,
  formatPowerMW,
} from "@/lib/units/formatUnits";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Badge } from "@/components/ui/Badge";

function issueClass(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return "border-rose-500/40 bg-rose-500/10 text-rose-100";
  if (severity === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  return "border-sky-500/30 bg-sky-500/10 text-sky-100";
}

export function CaseStudyPanel() {
  const anchor = useProjectStore((s) => s.anchor);
  const polygon = useProjectStore((s) => s.polygon);
  const placedEquipment = useProjectStore((s) => s.placedEquipment);
  const selectedCaseStudyId = useProjectStore((s) => s.selectedCaseStudyId);
  const selectCaseStudy = useProjectStore((s) => s.selectCaseStudy);
  const insertCaseStudyLayout = useProjectStore((s) => s.insertCaseStudyLayout);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";
  const caseStudy = projectCaseStudies[0];
  const isActive = selectedCaseStudyId === caseStudy.id;
  const hasPlacementAnchor = polygon.length > 0 || anchor !== null;
  const groupPrefix = generatedCaseStudyGroupPrefix(caseStudy.id);
  const insertedCount = placedEquipment.filter((item) =>
    item.groupId?.startsWith(groupPrefix)
  ).length;
  const sizing = calculateCaseStudySizing(caseStudy);
  const issues = evaluateCaseStudyCompatibility(caseStudy, sizing);
  const warnings = issues.filter((issue) => issue.severity !== "info");

  return (
    <CollapsibleSection
      icon={Database}
      iconColor="text-violet-300"
      title={isEs ? "Caso BESS del Desierto" : "BESS del Desierto case"}
      description={
        isEs
          ? "Validación conceptual con datos reportados del proyecto."
          : "Conceptual validation using reported project data."
      }
    >
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">
              {caseStudy.projectName}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {isEs ? "Modo" : "Mode"}: {caseStudy.designIntent.designMode}
            </div>
          </div>
          <Badge variant={isActive ? "compliant" : "neutral"}>
            {isActive ? (isEs ? "activo" : "active") : (isEs ? "preconfiguración" : "preset")}
          </Badge>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <dt className="text-slate-500">MW</dt>
            <dd className="font-mono text-slate-100">
              {formatPowerMW(caseStudy.designIntent.targetPowerMW, { digits: 0, locale })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">MWh</dt>
            <dd className="font-mono text-slate-100">
              {formatEnergyMWh(caseStudy.designIntent.targetEnergyMWh, {
                digits: 0,
                locale,
              })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">BESS</dt>
            <dd className="font-mono text-slate-100">{sizing.totalBessContainers}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{isEs ? "Centros" : "Centers"}</dt>
            <dd className="font-mono text-slate-100">{sizing.totalPcsOrMvCenters}</dd>
          </div>
          <div>
            <dt className="text-slate-500">MVA</dt>
            <dd className="font-mono text-slate-100">
              {formatApparentPowerMva(sizing.installedApparentPowerMva, {
                digits: 0,
                locale,
              })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">DC MWh</dt>
            <dd className="font-mono text-slate-100">
              {formatEnergyMWh(sizing.totalNominalEnergyMWhDc, { digits: 1, locale })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">h</dt>
            <dd className="font-mono text-slate-100">
              {formatNumber(sizing.calculatedDurationFromDeclaredEnergyHours ?? 0, 2, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">C-rate</dt>
            <dd className="font-mono text-slate-100">
              {sizing.approximateCRateFromDeclaredEnergy === null
                ? "-"
                : `${formatNumber(sizing.approximateCRateFromDeclaredEnergy, 3, locale)}C`}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => selectCaseStudy(isActive ? null : caseStudy.id)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-violet-400/40 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-100 hover:border-violet-300"
        >
          <Database className="h-4 w-4" aria-hidden="true" />
          {isActive
            ? isEs
              ? "Quitar caso del reporte"
              : "Remove case from report"
            : isEs
              ? "Activar caso en reporte"
              : "Activate case in report"}
        </button>

        <button
          type="button"
          onClick={() => insertCaseStudyLayout(caseStudy.id)}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:border-emerald-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/60 disabled:text-slate-500"
        >
          <Grid3X3 className="h-4 w-4" aria-hidden="true" />
          {insertedCount > 0
            ? isEs
              ? `Actualizar layout conceptual (${insertedCount})`
              : `Update conceptual layout (${insertedCount})`
            : isEs
              ? "Insertar layout conceptual"
              : "Insert conceptual layout"}
        </button>
        {!hasPlacementAnchor ? (
          <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-100">
            {isEs
              ? "Sin terreno dibujado, se insertara en una referencia temporal. Luego puedes limpiar y repetirlo dentro de un polígono."
              : "Without a drawn site, it will be inserted at a temporary reference point. You can clear and repeat it inside a polygon later."}
          </p>
        ) : null}
      </div>

      <div className="mt-2 space-y-2">
        {warnings.slice(0, 4).map((compatibilityIssue) => (
          <div
            key={compatibilityIssue.id}
            className={`rounded-md border p-2 text-[10px] leading-snug ${issueClass(
              compatibilityIssue.severity
            )}`}
          >
            <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {compatibilityIssue.severity} · {compatibilityIssue.basis}
            </div>
            <div>{compatibilityIssue.message}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          {isEs ? "Pendientes y exclusiones" : "Pending data and exclusions"}
        </div>
        <ul className="space-y-1.5 text-[10px] leading-snug text-slate-400">
          {caseStudy.pendingData.slice(0, 3).map((item) => (
            <li key={item.id}>
              <span className="text-amber-200">{item.priority}</span>: {item.topic}
            </li>
          ))}
          {caseStudy.exclusions.slice(0, 3).map((item) => (
            <li key={item.id}>
              <span className="text-slate-200">{isEs ? "Excluido" : "Excluded"}</span>:{" "}
              {item.scope}
            </li>
          ))}
        </ul>
      </div>
    </CollapsibleSection>
  );
}
