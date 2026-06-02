/**
 * pdfFormatters — leaf formatting helpers shared across the technical PDF
 * report tree (cover, chrome, section pages).
 *
 * Extracted from `ReportDocument.tsx` in Phase 12A to allow `pdfChrome.tsx`
 * (and future per-section files under `sections/`) to depend on a shared
 * helper module instead of importing through a circular module graph.
 *
 * All exports are pure functions with no side effects, no React, no
 * `@react-pdf/renderer` dependency. They are byte-equivalent to the
 * originals that lived in `ReportDocument.tsx` lines 26–58 of merge
 * commit `c8bf0e2`.
 */

import type { TechnicalReportData } from "@/lib/report/buildReportData";
import type { ProjectExclusion } from "@/types/technical";
import type { EvaluatedRuleEntry } from "@/rules/regulatoryProfileEvaluator";

export const fmtNum = (v: number | undefined, digits = 2): string =>
  v === undefined || !Number.isFinite(v) ? "—" : v.toFixed(digits);

export const fmtInt = (v: number | undefined): string =>
  v === undefined ? "—" : String(Math.round(v));

export const formatIsoDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const kpiSourceLabel = (
  source: TechnicalReportData["reportKpis"]["source"],
): string => {
  switch (source) {
    case "documented_targets":
      return "targets documentados";
    case "layout_inventory":
      return "inventario del layout";
    case "mixed":
      return "fuente mixta";
    default:
      return source;
  }
};

// ──────────────────────────────────────────────────────────────────
// Agrupación temática de exclusiones (cuerpo ejecutivo)
//
// El cuerpo del reporte muestra las exclusiones agrupadas en categorías
// estándar de un predimensionamiento BESS, con ejemplos representativos.
// El listado completo, ítem por ítem, se conserva en el anexo.
// ──────────────────────────────────────────────────────────────────

export type ExclusionGroup = {
  /** Etiqueta de la categoría (es). */
  category: string;
  /** Exclusiones que caen en esta categoría. */
  items: ProjectExclusion[];
};

type ExclusionCategoryDef = {
  category: string;
  /** Palabras clave (minúsculas) buscadas en id + scope. */
  keywords: string[];
};

const EXCLUSION_CATEGORY_ORDER: ExclusionCategoryDef[] = [
  {
    category: "Estudios eléctricos",
    keywords: [
      "load-flow",
      "load flow",
      "flujo",
      "short-circuit",
      "short circuit",
      "cortocircuito",
      "protection",
      "protección",
      "proteccion",
      "rms",
      "emt",
      "stability",
      "estabilidad",
      "harmonic",
      "armónico",
      "armonico",
      "grounding",
      "tierra",
      "arc-flash",
      "arc flash",
      "insulation",
      "aislación",
      "aislacion",
      "power-quality",
      "calidad",
      "pcc",
      "electric",
      "eléctric",
      "electric",
    ],
  },
  {
    category: "Civil y geotecnia",
    keywords: [
      "geotech",
      "geotec",
      "civil",
      "foundation",
      "fundación",
      "fundacion",
      "hydrolog",
      "hidrolog",
      "drain",
      "drenaje",
      "structural",
      "estructur",
      "seismic",
      "sismic",
    ],
  },
  {
    category: "HSE e incendio",
    keywords: ["fire", "incendio", "hse", "safety", "seguridad", "nfpa", "ul 9540", "ahj"],
  },
  {
    category: "Permisos y medio ambiente",
    keywords: ["environment", "ambient", "permit", "permiso", "regulator", "licen"],
  },
  {
    category: "Interconexión",
    keywords: ["interconnect", "interconex", "grid-connection", "conexion", "conexion", "-hv", " hv", "transmis"],
  },
  {
    category: "Operación y mantenimiento",
    keywords: ["operation", "operación", "operacion", "maintenance", "mantención", "mantencion", "mantenimiento", "o&m", "scada"],
  },
];

const EXCLUSION_FALLBACK_CATEGORY = "Otros estudios pendientes";

function classifyExclusion(ex: ProjectExclusion): string {
  const haystack = `${ex.id} ${ex.scope} ${ex.reason}`.toLowerCase();
  for (const def of EXCLUSION_CATEGORY_ORDER) {
    if (def.keywords.some((kw) => haystack.includes(kw))) {
      return def.category;
    }
  }
  return EXCLUSION_FALLBACK_CATEGORY;
}

/**
 * Agrupa las exclusiones del proyecto en categorías temáticas estándar.
 * Devuelve sólo los grupos que tienen al menos un ítem, preservando el
 * orden canónico; un grupo de respaldo recoge cualquier exclusión que no
 * encaje en las seis categorías estándar.
 */
export function groupExclusions(exclusions: ProjectExclusion[]): ExclusionGroup[] {
  const byCategory = new Map<string, ProjectExclusion[]>();
  for (const ex of exclusions) {
    const cat = classifyExclusion(ex);
    const arr = byCategory.get(cat);
    if (arr) arr.push(ex);
    else byCategory.set(cat, [ex]);
  }

  const ordered: ExclusionGroup[] = [];
  for (const def of EXCLUSION_CATEGORY_ORDER) {
    const items = byCategory.get(def.category);
    if (items && items.length > 0) {
      ordered.push({ category: def.category, items });
    }
  }
  const fallback = byCategory.get(EXCLUSION_FALLBACK_CATEGORY);
  if (fallback && fallback.length > 0) {
    ordered.push({ category: EXCLUSION_FALLBACK_CATEGORY, items: fallback });
  }
  return ordered;
}

// ──────────────────────────────────────────────────────────────────
// Madurez del prediseño y frase de resultado ejecutivo
// ──────────────────────────────────────────────────────────────────

export type MaturityLevel = {
  /** Etiqueta corta para badge. */
  label: string;
  /** Descripción de una línea. */
  description: string;
};

/**
 * Nivel de madurez declarado del entregable. Siempre preliminar: la escala
 * va de "Prefactibilidad" a "Prediseño preliminar", y nunca declara
 * ingeniería de detalle resuelta.
 */
export function maturityLevel(data: TechnicalReportData): MaturityLevel {
  const hasArchitecture = data.electrical.blocks > 0 || data.electrical.stations.length > 0;
  const hasLayout = data.equipmentInventory.length > 0;
  if (hasArchitecture && hasLayout) {
    return {
      label: "Prediseño preliminar",
      description:
        "Layout y arquitectura conceptual definidos; pendiente de ingeniería de detalle.",
    };
  }
  return {
    label: "Prefactibilidad",
    description:
      "Dimensionamiento conceptual inicial; pendiente de layout y arquitectura completos.",
  };
}

/**
 * Frase de resultado para el resumen ejecutivo. Resume el estado del
 * prediseño sin lenguaje de garantía ni de cumplimiento definitivo.
 */
export function resultSentence(data: TechnicalReportData): string {
  const k = data.reportKpis;
  const power = fmtNum(k.poiPowerMW ?? undefined, 1);
  const energy = fmtNum(k.commercialEnergyMWh ?? undefined, 1);
  const dur = fmtNum(k.durationHours ?? undefined, 1);
  const criticals = data.consistencyAlerts.filter((a) => a.severity === "critical").length;
  const base =
    `Prediseño preliminar para un BESS de ${power} MW / ${energy} MWh ` +
    `(≈ ${dur} h de duración nominal estimada).`;
  if (criticals > 0) {
    return `${base} Se identificaron ${criticals} alerta(s) crítica(s) que requieren revisión técnica antes de avanzar.`;
  }
  return `${base} No se identificaron alertas críticas de consistencia en esta revisión preliminar.`;
}

/**
 * Próximos pasos recomendados (cuerpo ejecutivo). Se derivan del estado del
 * reporte: alertas de consistencia, pendientes documentales y resultado de
 * la evaluación normativa. Siempre se cierra con la nota de ingeniería de
 * detalle. Devuelve viñetas en lenguaje preliminar.
 */
export function buildNextSteps(data: TechnicalReportData): string[] {
  const steps: string[] = [];

  const criticals = data.consistencyAlerts.filter((a) => a.severity === "critical");
  if (criticals.length > 0) {
    steps.push(
      `Resolver ${criticals.length} alerta(s) crítica(s) de consistencia entre KPIs, inventario y arquitectura.`,
    );
  }

  const ev = data.regulatoryEvaluation;
  if (ev) {
    if (ev.totals.blockingViolations > 0) {
      steps.push(
        `Revisar ${ev.totals.blockingViolations} incumplimiento(s) bloqueante(s) del perfil normativo aplicado.`,
      );
    }
    if (ev.totals.manualCheck > 0) {
      steps.push(
        `Completar ${ev.totals.manualCheck} verificación(es) de revisión manual del perfil normativo.`,
      );
    }
  }

  if (data.pendingData.length > 0) {
    steps.push(
      `Confirmar ${data.pendingData.length} dato(s) pendiente(s) de validación con fabricante / EPC.`,
    );
  }

  if (!data.electrical.poi) {
    steps.push(
      "Definir punto de conexión (POI) y condiciones de interconexión con el operador de red.",
    );
  }

  steps.push(
    "Avanzar a ingeniería de detalle: estudios eléctricos, civiles, geotécnicos y de protección contra incendios.",
  );

  return steps;
}

export type RuleGroup = {
  title: string;
  items: EvaluatedRuleEntry[];
};

export function groupEvaluatedRules(rules: EvaluatedRuleEntry[]): RuleGroup[] {
  const manufacturerIds = ["RULE-PHYS-003", "RULE-PHYS-004", "RULE-FIRE-002", "RULE-FIRE-003", "RULE-FIRE-005"];
  const insuranceIds = ["RULE-PHYS-005", "RULE-FIRE-001", "RULE-FIRE-004"];
  const automatedIds = [
    "RULE-PHYS-001",
    "RULE-PHYS-002",
    "RULE-PHYS-011",
    "RULE-ELEC-003",
    "RULE-ELEC-004",
    "RULE-ELEC-005",
    "RULE-ELEC-006",
    "RULE-ELEC-013",
    "RULE-ELEC-015",
    "RULE-ELEC-016"
  ];

  const automated: EvaluatedRuleEntry[] = [];
  const technical: EvaluatedRuleEntry[] = [];
  const manufacturer: EvaluatedRuleEntry[] = [];
  const insurance: EvaluatedRuleEntry[] = [];

  for (const rule of rules) {
    if (manufacturerIds.includes(rule.ruleId)) {
      manufacturer.push(rule);
    } else if (insuranceIds.includes(rule.ruleId)) {
      insurance.push(rule);
    } else if (automatedIds.includes(rule.ruleId)) {
      automated.push(rule);
    } else {
      technical.push(rule);
    }
  }

  const groups: RuleGroup[] = [];
  if (automated.length > 0) groups.push({ title: "Reglas automáticas evaluadas", items: automated });
  if (technical.length > 0) groups.push({ title: "Advertencias técnicas preliminares", items: technical });
  if (manufacturer.length > 0) groups.push({ title: "Criterios dependientes de fabricante", items: manufacturer });
  if (insurance.length > 0) groups.push({ title: "Criterios de asegurabilidad", items: insurance });

  return groups;
}
