/**
 * Evaluador de perfil regulatorio (Fase 10).
 *
 * Toma un `RegulatoryRuleProfileId` y el contexto del proyecto, recorre las
 * reglas del catálogo aplicables al perfil, y produce un breakdown por
 * categoría con el estado final de cada regla:
 *
 *   - `pass`            — regla automatizada que evaluó sin violaciones.
 *   - `violation`       — regla automatizada con violaciones detectadas.
 *   - `manual_check`    — regla que requiere revisión humana (checklist).
 *   - `pending_validation` — regla candidata sin lectura humana de PDF aún.
 *   - `not_evaluable`   — datos insuficientes en el proyecto.
 *   - `out_of_scope`    — regla declarada fuera de alcance v1.
 *
 * Política:
 *   - Una regla `implemented` se mapea contra los outputs de
 *     `validateBessLayout` y `validateElectricalTopology` si están disponibles.
 *   - Una regla con `status != implemented` se reporta tal cual: el motor no
 *     inventa cumplimiento.
 *   - Las citas (`EvidenceRef[]`) se exponen para que la UI las muestre y
 *     para que el export las incluya en `document_registry_refs`.
 */

import { regulatoryRulesCatalog } from "@/rules/regulatoryRulesCatalog";
import { getRegulatoryRuleProfile } from "@/rules/profiles/regulatoryRuleProfiles";
import { diagnosticCatalog } from "./diagnosticCatalog";
import type {
  RegulatoryRuleDefinition,
  RegulatoryRuleProfileId,
  RuleCategory,
  RuleSeverity,
} from "@/rules/types";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import {
  documentInconsistenciesToElectricalIssues,
  validateElectricalTopology,
} from "@/lib/electrical/topologyValidation";
import type { ValidationIssue } from "@/types/bessLayoutTypes";
import type {
  BESSBlock,
  ConversionStation,
  MVBus,
  MVFeeder,
  POI,
} from "@/types/electrical";
import type { DocumentInconsistency } from "@/types/project";
import type { ElectricalCompatibilityIssue } from "@/types/technical";
import type { EvidenceRef } from "@/types/evidence";
import { effectiveSeverity } from "@/rules/severityCeiling";

// ──────────────────────────────────────────────────────────────────
// Tipos del resultado
// ──────────────────────────────────────────────────────────────────

export type RuleOutcome =
  | "pass"
  | "violation"
  | "manual_check"
  | "pending_validation"
  | "not_evaluable"
  | "out_of_scope";

export type EvaluatedRuleEntry = {
  ruleId: string;
  category: RuleCategory;
  /**
   * Effective severity after applying the evidence-level / confidence ceiling
   * defined in `severityCeiling.ts`. Use `declaredSeverity` for the
   * catalog-declared value.
   */
  severity: RuleSeverity;
  /** Severity as declared in the rule catalog, before the ceiling is applied. */
  declaredSeverity: RuleSeverity;
  /**
   * When the declared severity was lowered by the matrix ceiling, this
   * carries the reason; otherwise `null`.
   */
  severityCappedBy: null | {
    from: RuleSeverity;
    by: "document_level" | "confidence";
    detail: string;
  };
  title: string;
  description: string;
  appParameter?: string;
  outcome: RuleOutcome;
  /** Violaciones específicas detectadas por el rule (vacío si pass / manual_check). */
  violations: {
    message: string;
    affectedIds?: string[];
    measured_m?: number;
    required_m?: number;
  }[];
  evidence: EvidenceRef[];
  notes?: string;
  simpleTitle?: { es: string; en: string };
  diagnostic?: { es: string; en: string };
  diagnosticImpact?: { es: string; en: string };
  diagnosticAction?: { es: string; en: string };
  riskLevel?: "critical" | "important" | "om_insurance" | "engineering_pending" | "info";
};

export type RegulatoryEvaluationTotals = {
  pass: number;
  violation: number;
  manualCheck: number;
  pending: number;
  notEvaluable: number;
  outOfScope: number;
  blockingViolations: number;
  warningViolations: number;
};

export type RegulatoryEvaluationByCategory = Record<RuleCategory, EvaluatedRuleEntry[]>;

export type RegulatoryEvaluationResult = {
  profileId: RegulatoryRuleProfileId;
  profileName: string;
  evaluatedAt: string;
  rules: EvaluatedRuleEntry[];
  byCategory: RegulatoryEvaluationByCategory;
  totals: RegulatoryEvaluationTotals;
  /** IDs de documentos referenciados por las reglas evaluadas. */
  documentRegistryRefs: string[];
};

// ──────────────────────────────────────────────────────────────────
// Mapeo regla → issue del motor existente
// ──────────────────────────────────────────────────────────────────

/**
 * Diccionario que relaciona `appParameter` de una regla con la llave de
 * `ValidationIssue.ruleId` que produce `validateBessLayout`. La lista refleja
 * las reglas físicas marcadas como `implemented` en el catálogo.
 */
const PHYS_RULE_KEYWORD: Record<string, string[]> = {
  // RULE-PHYS-001: containment
  "validation.containmentCheck": ["bess_inside_polygon", "equipment_inside_polygon"],
  // RULE-PHYS-002: collision
  "collision.detect": ["equipment_collision"],
  // RULE-PHYS-003: container-to-container spacing
  "EquipmentSpec.clearances.sameType_m": ["bess_to_bess_spacing"],
  // RULE-PHYS-004: container-to-PCS spacing (working clearance)
  "EquipmentSpec.clearances.otherType_m": ["electrical_front_working_clearance"],
  // RULE-PHYS-005: boundary fire setback
  "FireSafetyZone.boundary_setback_m": ["bess_to_property_line", "fire_boundary_setback"],
  // RULE-PHYS-006: vehicle access
  "AccessRoad.maxDistanceToEquipment_m": ["vehicle_access_distance"],
  // RULE-PHYS-007: road min width — engine doesn't emit this yet
  // RULE-PHYS-009: cable corridor overlap
  "cableRoutes.noOverlap": ["cable_route_equipment_clearance", "cable_route_access_road_overlap"],
  // RULE-PHYS-011: exclusion zones
  "validation.exclusionZones": ["equipment_in_exclusion"],
};

/**
 * Diccionario para reglas eléctricas implementadas.
 * Las `ElectricalCompatibilityIssue.id` siguen el patrón
 * `rule-elec-XXX-...`, por eso usamos prefijos.
 */
const ELEC_RULE_PREFIX: Record<string, string> = {
  // RULE-ELEC-001: ≤ 8 containers per station
  "ConversionStation.maxContainers": "rule-elec-001-",
  // RULE-ELEC-002: ≤ 4 stations per feeder
  "MVFeeder.maxStations": "rule-elec-002-",
  // RULE-ELEC-003: DC compatibility
  "electrical.compatibility.dcRange": "rule-elec-003-",
  // RULE-ELEC-004: LV match
  "electrical.compatibility.lvMatch": "rule-elec-004-",
  // RULE-ELEC-005: MV consistency
  "mvFeeders.uniformVoltage": "rule-elec-005-",
  // RULE-ELEC-006: Feeder preliminary rating not exceeded
  "mvFeeders.ratingCheck": "rule-elec-006-feeder-power-overload-",
  // Fase 8 — preliminary electrical checks
  // (see docs/phase8-electrical-scope.md §3)
  "mvBuses.capacityCheck": "rule-elec-007-",
  "cableRoutes.ampacityEstimate": "rule-elec-008-",
  "losses.budget": "rule-elec-009-",
  "poi.capacityFit": "rule-elec-013-",
  "ssaa.budget": "rule-elec-014-",
  "ppc.rampRate": "rule-elec-015-",
  "ppc.controlCoverage": "rule-elec-016-",
  "transformer.noLoadAnnual": "rule-elec-017-",
};

// ──────────────────────────────────────────────────────────────────
// Input del evaluador
// ──────────────────────────────────────────────────────────────────

export type RegulatoryEvaluationInput = {
  profileId: RegulatoryRuleProfileId;
  /** Resultados del motor físico, si están disponibles. */
  physicalIssues?: ValidationIssue[];
  /** Resultados del motor eléctrico, si están disponibles. */
  electricalIssues?: ElectricalCompatibilityIssue[];
  /** Bloques eléctricos (para saber si la arquitectura está poblada). */
  blocks?: BESSBlock[];
  conversionStations?: ConversionStation[];
  mvFeeders?: MVFeeder[];
  mvBuses?: MVBus[];
  poi?: POI | null;
  /** Inconsistencias documentales del proyecto (INC-001..). */
  inconsistencies?: DocumentInconsistency[];
  /** Marca de tiempo (opcional, para tests deterministas). */
  evaluatedAt?: string;
};

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function emptyByCategory(): RegulatoryEvaluationByCategory {
  return {
    physical_layout: [],
    electrical: [],
    regulatory_sec: [],
    regulatory_cne_cen: [],
    regulatory_territorial: [],
    regulatory_environmental: [],
    regulatory_fire_safety: [],
    engineering_detail: [],
    manufacturerSpecificRules: [],
  };
}

function matchPhysicalViolations(
  rule: RegulatoryRuleDefinition,
  issues: ValidationIssue[]
): ValidationIssue[] {
  if (!rule.appParameter) return [];
  const keywords = PHYS_RULE_KEYWORD[rule.appParameter];
  if (!keywords || keywords.length === 0) return [];
  return issues.filter((issue) =>
    keywords.some((kw) => issue.ruleId.includes(kw))
  );
}

function matchElectricalViolations(
  rule: RegulatoryRuleDefinition,
  issues: ElectricalCompatibilityIssue[]
): ElectricalCompatibilityIssue[] {
  if (!rule.appParameter) return [];
  const prefix = ELEC_RULE_PREFIX[rule.appParameter];
  if (!prefix) return [];
  return issues.filter((issue) => issue.id.startsWith(prefix));
}

function architectureIsPopulated(input: RegulatoryEvaluationInput): boolean {
  return (
    (input.conversionStations?.length ?? 0) > 0 ||
    (input.mvFeeders?.length ?? 0) > 0 ||
    (input.mvBuses?.length ?? 0) > 0
  );
}

function evaluateRule(
  rule: RegulatoryRuleDefinition,
  input: RegulatoryEvaluationInput
): EvaluatedRuleEntry {
  const { severity: effSeverity, cappedBy } = effectiveSeverity(rule);
  const diag = diagnosticCatalog[rule.id];
  const base: EvaluatedRuleEntry = {
    ruleId: rule.id,
    category: rule.category,
    severity: effSeverity,
    declaredSeverity: rule.severity,
    severityCappedBy: cappedBy,
    title: rule.title,
    description: rule.description,
    appParameter: rule.appParameter,
    outcome: "pending_validation",
    violations: [],
    evidence: rule.evidence,
    notes: rule.notes,
    simpleTitle: diag?.simpleTitle ?? { es: rule.title, en: rule.title },
    diagnostic: diag?.diagnostic ?? { es: rule.description, en: rule.description },
    diagnosticImpact: diag?.diagnosticImpact,
    diagnosticAction: diag?.diagnosticAction,
    riskLevel: diag?.riskLevel ?? (effSeverity === "blocking" ? "critical" : effSeverity === "warning" ? "important" : "info"),
  };

  // Reglas explícitamente fuera de alcance v1.
  if (rule.status === "out_of_scope") {
    return { ...base, outcome: "out_of_scope" };
  }

  // Reglas de checklist manual — siempre se reportan como manual_check.
  if (rule.status === "manual_check") {
    return { ...base, outcome: "manual_check" };
  }

  // Reglas implementadas: comparar contra outputs del motor.
  if (rule.status === "implemented") {
    if (
      rule.category === "physical_layout" ||
      rule.category === "regulatory_fire_safety" ||
      rule.category === "manufacturerSpecificRules"
    ) {
      const matched = matchPhysicalViolations(rule, input.physicalIssues ?? []);
      if (matched.length === 0) {
        return { ...base, outcome: "pass" };
      }
      return {
        ...base,
        outcome: "violation",
        violations: matched.map((m) => ({
          message: m.message,
          affectedIds: [m.objectAId, m.objectBId].filter(
            (x): x is string => Boolean(x)
          ),
          measured_m: m.measured_m,
          required_m: m.required_m,
        })),
      };
    }

    if (rule.category === "electrical") {
      if (!architectureIsPopulated(input)) {
        return { ...base, outcome: "not_evaluable" };
      }
      const matched = matchElectricalViolations(rule, input.electricalIssues ?? []);
      if (matched.length === 0) {
        return { ...base, outcome: "pass" };
      }
      return {
        ...base,
        outcome: "violation",
        violations: matched.map((m) => ({
          message: m.message,
          affectedIds: m.affectedIds,
        })),
      };
    }

    if (rule.category === "engineering_detail") {
      if (rule.id === "RULE-REP-001") {
        return { ...base, outcome: "pass" };
      }
    }

    // implemented pero sin handler conocido → pending_validation defensivo.
    return { ...base, outcome: "pending_validation" };
  }

  // Default (candidate / pending_validation / not_automatable): se reporta tal cual.
  if (rule.status === "not_automatable") {
    return { ...base, outcome: "manual_check" };
  }
  return { ...base, outcome: "pending_validation" };
}

function collectDocRefs(rules: EvaluatedRuleEntry[]): string[] {
  const ids = new Set<string>();
  for (const r of rules) {
    for (const ev of r.evidence) {
      if (ev.documentId && ev.documentId !== "__none__") {
        ids.add(ev.documentId);
      }
    }
  }
  return [...ids].sort();
}

function tally(rules: EvaluatedRuleEntry[]): RegulatoryEvaluationTotals {
  let pass = 0;
  let violation = 0;
  let manualCheck = 0;
  let pending = 0;
  let notEvaluable = 0;
  let outOfScope = 0;
  let blockingViolations = 0;
  let warningViolations = 0;

  for (const r of rules) {
    switch (r.outcome) {
      case "pass":
        pass++;
        break;
      case "violation":
        violation++;
        if (r.severity === "blocking") blockingViolations++;
        else if (r.severity === "warning") warningViolations++;
        break;
      case "manual_check":
        manualCheck++;
        break;
      case "pending_validation":
        pending++;
        break;
      case "not_evaluable":
        notEvaluable++;
        break;
      case "out_of_scope":
        outOfScope++;
        break;
    }
  }

  return {
    pass,
    violation,
    manualCheck,
    pending,
    notEvaluable,
    outOfScope,
    blockingViolations,
    warningViolations,
  };
}

// ──────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────

export function evaluateRegulatoryProfile(
  input: RegulatoryEvaluationInput
): RegulatoryEvaluationResult {
  const profile = getRegulatoryRuleProfile(input.profileId);
  if (!profile) {
    throw new Error(`Unknown regulatory rule profile: ${input.profileId}`);
  }

  // Sumar las inconsistencias documentales como issues eléctricos virtuales
  // (Codex ya provee este conversor en topologyValidation.ts).
  const allElectricalIssues = [
    ...(input.electricalIssues ?? []),
    ...documentInconsistenciesToElectricalIssues(input.inconsistencies ?? []),
  ];

  const inputWithDocIssues: RegulatoryEvaluationInput = {
    ...input,
    electricalIssues: allElectricalIssues,
  };

  const rulesInProfile = regulatoryRulesCatalog.filter((rule) =>
    profile.ruleIds.includes(rule.id)
  );

  const evaluated = rulesInProfile.map((rule) =>
    evaluateRule(rule, inputWithDocIssues)
  );

  const byCategory = emptyByCategory();
  for (const r of evaluated) {
    byCategory[r.category].push(r);
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
    rules: evaluated,
    byCategory,
    totals: tally(evaluated),
    documentRegistryRefs: collectDocRefs(evaluated),
  };
}

/**
 * Helper para ejecutar evaluación completa: corre los motores físico y
 * eléctrico, luego pasa los resultados al evaluador del perfil.
 *
 * Permite a la UI llamar una sola función sin coordinar los tres pasos.
 */
export function runRegulatoryEvaluation(args: {
  profileId: RegulatoryRuleProfileId;
  layoutValidation?: ReturnType<typeof validateBessLayout>;
  electricalValidation?: ReturnType<typeof validateElectricalTopology>;
  blocks?: BESSBlock[];
  conversionStations?: ConversionStation[];
  mvFeeders?: MVFeeder[];
  mvBuses?: MVBus[];
  poi?: POI | null;
  inconsistencies?: DocumentInconsistency[];
  evaluatedAt?: string;
}): RegulatoryEvaluationResult {
  return evaluateRegulatoryProfile({
    profileId: args.profileId,
    physicalIssues: args.layoutValidation?.issues ?? [],
    electricalIssues: args.electricalValidation?.issues ?? [],
    blocks: args.blocks,
    conversionStations: args.conversionStations,
    mvFeeders: args.mvFeeders,
    mvBuses: args.mvBuses,
    poi: args.poi,
    inconsistencies: args.inconsistencies,
    evaluatedAt: args.evaluatedAt,
  });
}
