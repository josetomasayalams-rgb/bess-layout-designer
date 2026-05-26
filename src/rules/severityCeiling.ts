/**
 * Severity ceiling logic — fase 11.
 *
 * Encodes the matrix §README_CAPA_TECNICA_INTERMEDIA "Reglas de decisión":
 *
 *   L1 (OEM exact equipment)             → may be `blocking`
 *   L2 (OEM same family)                 → max `warning`
 *   L3 (standard / official text)        → max `warning`
 *                                          (if licensed text not yet read in
 *                                          the registry, callers should also
 *                                          inspect confidence and downgrade)
 *   L4 (public project / authority)      → max `warning`
 *   L5 (whitepaper / brochure)           → max `info`
 *   L6 (inferred assumption)             → max `warning` (editable assumption badge)
 *   L7 (unverifiable / pending)          → max `checklist`
 *
 * Additionally, evidence confidence narrows the ceiling further:
 *   - `documented` keeps the level ceiling
 *   - `derived`    — no document; treated as procedural, no ceiling
 *   - `inferred`   — max `warning`
 *   - `assumption` — max `warning`
 *   - `missing`    — max `checklist` (cannot enforce a violation without source)
 *
 * The final effective severity is the strictest (lowest in
 * SEVERITY_RANK) of: `rule.severity`, the level ceiling derived from
 * the strongest cited document, and the confidence ceiling derived
 * from the strongest confidence in the evidence array.
 *
 * Pure-procedural rules (geometric collision, containment, etc.) cite
 * `EVIDENCE_NONE` with confidence `derived`. They get no ceiling — they
 * are not normative rules and may remain `blocking`.
 */

import { findDocument, type DocumentLevel } from "@/data/documentRegistry";
import {
  EVIDENCE_NONE,
  type EvidenceConfidence,
  type EvidenceRef,
} from "@/types/evidence";
import type {
  RegulatoryRuleDefinition,
  RuleSeverity,
} from "@/rules/types";

/** Severity rank — lower index = stricter. */
const SEVERITY_RANK: Record<RuleSeverity, number> = {
  blocking: 0,
  warning: 1,
  info: 2,
  checklist: 3,
  out_of_scope: 4,
};

/** Document level rank — lower index = stronger. */
const LEVEL_RANK: Record<DocumentLevel, number> = {
  L1_oem_exact_equipment: 0,
  L2_oem_same_family: 1,
  L4_public_project_or_authority: 2,
  L3_standard_or_official: 3,
  L5_whitepaper_brochure: 4,
  L6_inferred_assumption: 5,
  L7_unverifiable_pending: 6,
};

/** Confidence rank — lower index = stronger. */
const CONFIDENCE_RANK: Record<EvidenceConfidence, number> = {
  documented: 0,
  derived: 1,
  inferred: 2,
  assumption: 3,
  missing: 4,
};

/**
 * Max severity allowed for a document level. `out_of_scope` is never the
 * ceiling — it would be a declarative status, not a violation outcome.
 */
export function maxSeverityForLevel(level: DocumentLevel): RuleSeverity {
  switch (level) {
    case "L1_oem_exact_equipment":
      return "blocking";
    case "L2_oem_same_family":
    case "L3_standard_or_official":
    case "L4_public_project_or_authority":
    case "L6_inferred_assumption":
      return "warning";
    case "L5_whitepaper_brochure":
      return "info";
    case "L7_unverifiable_pending":
      return "checklist";
  }
}

/**
 * Max severity allowed for a confidence. `derived` carries no ceiling
 * because it indicates a procedural rule with no document to weight against.
 */
export function maxSeverityForConfidence(
  confidence: EvidenceConfidence
): RuleSeverity | null {
  switch (confidence) {
    case "documented":
      return null;
    case "derived":
      return null;
    case "inferred":
    case "assumption":
      return "warning";
    case "missing":
      return "checklist";
  }
}

/** Returns the strongest (lowest L number) registered document level cited. */
export function strongestCitedLevel(refs: EvidenceRef[]): DocumentLevel | null {
  let best: DocumentLevel | null = null;
  for (const ref of refs) {
    if (!ref.documentId || ref.documentId === EVIDENCE_NONE) continue;
    const entry = findDocument(ref.documentId);
    if (!entry) continue;
    if (best === null || LEVEL_RANK[entry.level] < LEVEL_RANK[best]) {
      best = entry.level;
    }
  }
  return best;
}

/** Returns the strongest (lowest rank) confidence appearing in the evidence array. */
export function strongestConfidence(
  refs: EvidenceRef[]
): EvidenceConfidence | null {
  let best: EvidenceConfidence | null = null;
  for (const ref of refs) {
    if (best === null || CONFIDENCE_RANK[ref.confidence] < CONFIDENCE_RANK[best]) {
      best = ref.confidence;
    }
  }
  return best;
}

/**
 * Computes the effective severity of a rule, honouring the matrix ceilings.
 *
 * Semantics: "ceiling = X" means "the strictest severity you are allowed to
 * declare is X". In SEVERITY_RANK, stricter = lower rank, so a ceiling raises
 * (relaxes) any declared severity whose rank is below the ceiling's rank.
 *
 * @param rule the rule definition
 * @returns an object with `severity` (the effective severity) and `cappedBy`
 *          (the reason if the declared severity was relaxed by the matrix).
 */
export function effectiveSeverity(rule: RegulatoryRuleDefinition): {
  severity: RuleSeverity;
  cappedBy: null | {
    from: RuleSeverity;
    by: "document_level" | "confidence";
    detail: string;
  };
} {
  const level = strongestCitedLevel(rule.evidence);
  const confidence = strongestConfidence(rule.evidence);

  const levelCeiling = level ? maxSeverityForLevel(level) : null;
  const confidenceCeiling = confidence ? maxSeverityForConfidence(confidence) : null;

  let effective = rule.severity;
  let cappedBy: ReturnType<typeof effectiveSeverity>["cappedBy"] = null;

  // Apply level ceiling: if declared is *stricter* than the ceiling, relax to ceiling.
  if (levelCeiling && SEVERITY_RANK[effective] < SEVERITY_RANK[levelCeiling]) {
    cappedBy = {
      from: effective,
      by: "document_level",
      detail: `Strongest cited evidence is ${level}; max severity per matrix is ${levelCeiling}.`,
    };
    effective = levelCeiling;
  }

  // Apply confidence ceiling on top: again, if effective is stricter than
  // the confidence ceiling, relax further. The confidence cap can override
  // the level cap (e.g. an L1 doc cited with `inferred` confidence still caps at warning).
  if (
    confidenceCeiling &&
    SEVERITY_RANK[effective] < SEVERITY_RANK[confidenceCeiling]
  ) {
    cappedBy = {
      from: rule.severity,
      by: "confidence",
      detail: `Strongest evidence confidence is ${confidence}; max severity per matrix is ${confidenceCeiling}.`,
    };
    effective = confidenceCeiling;
  }

  return { severity: effective, cappedBy };
}
