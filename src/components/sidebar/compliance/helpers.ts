import { formatLength } from "@/lib/units/formatUnits";
import { DEFAULT_UNIT_SYSTEM } from "@/data/unitSystem";
import { findDocument } from "@/data/documentRegistry";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import type { ValidationIssue } from "@/types/bessLayoutTypes";
import type { EvaluatedRuleEntry, RuleOutcome } from "@/rules/regulatoryProfileEvaluator";

export const OUTCOME_LABEL: Record<RuleOutcome, { es: string; en: string; className: string }> = {
  pass: {
    es: "Sin inconformidades",
    en: "No nonconformities",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
  violation: {
    es: "Inconformidad",
    en: "Nonconformity",
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

export const EFFECTIVE_SEVERITY_CLASS: Record<string, string> = {
  blocking: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  checklist: "border-violet-500/40 bg-violet-500/10 text-violet-200",
  out_of_scope: "border-slate-700 bg-slate-900/60 text-slate-400",
};

export const EFFECTIVE_SEVERITY_LABEL: Record<string, { es: string; en: string }> = {
  blocking: { es: "Bloqueante", en: "Blocking" },
  warning: { es: "Advertencia", en: "Warning" },
  info: { es: "Informativo", en: "Info" },
  checklist: { es: "Checklist", en: "Checklist" },
  out_of_scope: { es: "Fuera alcance", en: "Out of scope" },
};

export function localizedIssue(issue: ValidationIssue, isEs: boolean) {
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
    case "bess_to_bess_submetric_warning":
      return {
        ruleLabel: "Advertencia de espaciamiento submétrico de fabricante",
        message: `La separación entre BESS ${objectA} y BESS ${objectB} es submétrica (${measured} < 1.0 m) y está basada en el despeje de fabricante.`,
        recommendation:
          "La separación cumple el despeje mecánico o de ventilación del fabricante seleccionado, pero puede ser inferior a criterios de asegurabilidad o protección contra propagación de incendio. Validar el layout con el fabricante, aseguradora y equipo de ingeniería de detalle.",
      };
    default:
      return {
        ruleLabel: issue.ruleLabel,
        message: issue.message,
        recommendation: issue.recommendation,
      };
  }
}

export function exportRegulatoryReport(result: ReturnType<typeof validateBessLayout>) {
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

export function citeLabel(entry: EvaluatedRuleEntry): string | null {
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
