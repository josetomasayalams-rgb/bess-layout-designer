"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileDown,
  HelpCircle,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import { getRegulatoryProfile } from "@/rules/bessRegulatoryProfiles";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { regulatoryRuleProfiles } from "@/rules/profiles/regulatoryRuleProfiles";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import { formatLength } from "@/lib/units/formatUnits";
import { DEFAULT_UNIT_SYSTEM } from "@/data/unitSystem";
import { findDocument } from "@/data/documentRegistry";
import type { ValidationIssue } from "@/types/bessLayoutTypes";
import type {
  EvaluatedRuleEntry,
  RuleOutcome,
} from "@/rules/regulatoryProfileEvaluator";
import type { RuleCategory } from "@/rules/types";

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

function localizedIssue(issue: ValidationIssue, isEs: boolean) {
  if (!isEs) {
    return {
      ruleLabel: issue.ruleLabel,
      message: issue.message,
      recommendation: issue.recommendation,
    };
  }

  const objectA = issue.objectAId.slice(0, 6);
  const objectB = issue.objectBId?.slice(0, 6);
  const measured =
    issue.measured_m !== undefined
      ? formatLength(issue.measured_m, { digits: 2, locale: "es" })
      : null;
  const required =
    issue.required_m !== undefined
      ? formatLength(issue.required_m, { digits: 2, locale: "es" })
      : null;

  switch (issue.ruleId) {
    case "equipment_inside_polygon":
    case "bess_inside_polygon":
      return {
        ruleLabel: "Validación geométrica interna del layout",
        message: `Equipo fuera del polígono del sitio: el equipo ${objectA} sobresale o está fuera de los límites del terreno.`,
        recommendation: "Corregir posición, rotación o distribución del equipo para mantenerlo dentro del polígono.",
      };
    case "equipment_collision":
      return {
        ruleLabel: "Validación geométrica interna del layout",
        message: `Solapamiento entre equipos: colisión física detectada entre el equipo ${objectA} y el equipo ${objectB}.`,
        recommendation: "Corregir posición, rotación o distribución del equipo para evitar la superposición de footprints.",
      };
    case "vehicle_access_distance":
      return {
        ruleLabel: "Validación geométrica interna del layout",
        message: `Acceso vehicular: el equipo ${objectA} está a ${measured} de un camino de acceso conceptual (máximo permitido: ${required}).`,
        recommendation: "Corregir posición, rotación o distribución del equipo, o bien trazar un camino adicional.",
      };
    case "cable_route_equipment_clearance":
      return {
        ruleLabel: "Validación geométrica interna del layout",
        message: `Interferencia de cable y equipo: el corredor de cables MT ${objectA} pasa a menos de ${required} del equipo ${objectB}.`,
        recommendation: "Corregir posición, rotación o distribución del equipo, o desviar el trazado de cables.",
      };
    case "cable_route_access_road_overlap":
      return {
        ruleLabel: "Validación geométrica interna del layout",
        message: `Superposición de cables y caminos: el corredor de cables MT ${objectA} se superpone con el camino de acceso ${objectB}.`,
        recommendation: "Trazar un cruce coordinado o desplazar el corredor para evitar el paralelismo sobre el camino.",
      };
    case "fire_boundary_setback":
      return {
        ruleLabel: "Validación geométrica interna del layout",
        message: "No se puede evaluar el setback perimetral de incendio debido a que no se ha definido el polígono del sitio.",
        recommendation: "Definir el polígono de terreno para evaluar distancias físicas perimetrales.",
      };
    case "bess_to_bess_spacing":
      return {
        ruleLabel: "Separación BESS a BESS",
        message: `BESS ${objectA} está a ${measured} de BESS ${objectB}. El criterio conservador activo exige ${required}.`,
        recommendation:
          issue.severity === "warning"
            ? "Mantener la advertencia visible y adjuntar respaldo UL 9540A, HMA, LSFT, AHJ o fabricante antes de reducir la separación conservadora."
            : "Aumentar la separación o declarar respaldo validado UL 9540A/HMA/LSFT/AHJ/fabricante antes de usar una distancia reducida.",
      };
    case "bess_to_property_line":
      return {
        ruleLabel: "Separación BESS a límite del terreno",
        message: `BESS ${objectA} está a ${measured} del límite del sitio. El criterio conservador activo exige ${required}.`,
        recommendation:
          issue.severity === "warning"
            ? "Mantener la advertencia visible y adjuntar respaldo de aprobación AHJ o del proyecto."
            : "Mover el bloque BESS más lejos del límite o conseguir validación específica de autoridad competente/proyecto.",
      };
    case "electrical_front_working_clearance":
      return {
        ruleLabel: "Espacio de trabajo de equipo eléctrico",
        message: `PCS ${objectA} tiene ${measured} libres respecto de ${objectB}. El despeje preliminar requerido es ${required}.`,
        recommendation:
          "Entregar al menos 0,9 m libres de trabajo o respaldo de fabricante/ingeniería eléctrica para la disposición final.",
      };
    case "manufacturer_manual_required":
      return {
        ruleLabel: "Validación con manual de fabricante",
        message:
          "No se declaró manual de instalación del fabricante. Las distancias reales pueden ser más restrictivas que el perfil conservador activo.",
        recommendation:
          "Adjuntar requisitos de instalación del fabricante y compararlos contra el perfil normativo conservador.",
      };
    default:
      return {
        ruleLabel: issue.ruleLabel,
        message: issue.message,
        recommendation: issue.recommendation,
      };
  }
}

function exportRegulatoryReport(result: ReturnType<typeof validateBessLayout>) {
  const report = {
    schema_version: "1.0",
    exported_at: new Date().toISOString(),
    unit_system: DEFAULT_UNIT_SYSTEM,
    profile: {
      id: result.profile.id,
      name: result.profile.name,
      standards: result.profile.baseStandards,
      source: result.profile.source,
    },
    summary: {
      status: result.projectStatus,
      checked_rules: result.checkedRules,
      critical_conflicts: result.criticalCount,
      warnings: result.warningCount,
      compliant_items: result.compliantCount,
    },
    conflicts: result.issues.map((issue) => ({
      ...issue,
      measured:
        issue.measured_m === undefined
          ? undefined
          : {
              value: issue.measured_m,
              unit: "m",
              data_classification: "preliminary_assumption",
            },
      required:
        issue.required_m === undefined
          ? undefined
          : {
              value: issue.required_m,
              unit: "m",
              data_classification: "preliminary_assumption",
            },
    })),
    external_validation_required: result.issues.filter(
      (issue) => issue.basis === "requires_validation"
    ),
    disclaimer:
      "Esta herramienta entrega una revisión preliminar de layout BESS basada en criterios normativos y de prediseño. No reemplaza ingeniería de detalle, manuales de fabricante, estudios UL 9540A/LSFT, Hazard Mitigation Analysis, aprobación AHJ, revisión SEC, permisos locales ni validación de bomberos o autoridad competente.",
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bess-regulatory-report-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────────────────────
// Helpers para la sección "Matriz normativa candidata"
// ──────────────────────────────────────────────────────────────────

const OUTCOME_LABEL: Record<RuleOutcome, { es: string; en: string; className: string }> = {
  pass: {
    es: "Cumple",
    en: "Pass",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
  violation: {
    es: "Violación",
    en: "Violation",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  },
  manual_check: {
    es: "Revisión manual",
    en: "Manual check",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  },
  pending_validation: {
    es: "Pendiente",
    en: "Pending",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  not_evaluable: {
    es: "No evaluable",
    en: "Not evaluable",
    className: "border-slate-700 bg-slate-900 text-slate-300",
  },
  out_of_scope: {
    es: "Fuera de alcance",
    en: "Out of scope",
    className: "border-slate-700 bg-slate-900/60 text-slate-400",
  },
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

function citeLabel(entry: EvaluatedRuleEntry): string | null {
  const ref = entry.evidence.find(
    (e) => e.documentId !== "__none__" && e.documentId
  );
  if (!ref) return null;
  const doc = findDocument(ref.documentId);
  const docTitle = doc?.title ?? ref.documentId;
  const page = ref.page ? ` · p.${ref.page}` : "";
  const section = ref.section ? ` · ${ref.section}` : "";
  return `${docTitle}${page}${section}`;
}

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
      }),
    [blocks, conversionStations, mvFeeders, mvBuses, poi]
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
        <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${status.className}`}>
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

      <ul className="mt-3 space-y-2">
        {result.issues.length === 0 ? (
          <li className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isEs
              ? "No hay conflictos normativos activos para las reglas implementadas."
              : "No active regulatory conflicts for the implemented rules."}
          </li>
        ) : null}
        {result.issues.slice(0, 8).map((issue) => {
          const copy = localizedIssue(issue, isEs);
          return (
            <li
              key={issue.id}
              className={`rounded-lg border p-3 text-[11px] leading-snug ${SEVERITY_CLASS[issue.severity]}`}
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
