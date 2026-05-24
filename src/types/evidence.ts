/**
 * Evidence and traceability types.
 *
 * Adds a uniform way to cite the provenance of any value, independent of the
 * existing `DataClassification` (which labels what the value *is*).
 *
 * `EvidenceConfidence` describes *how* a value was obtained:
 * - `documented`: cited from a primary PDF in the DocumentRegistry (page + section).
 * - `derived`: calculated from documented values (formula recorded in `note`).
 * - `inferred`: deduced from a pattern (e.g. visual unifilar) without explicit text.
 * - `assumption`: editable preliminary value, no source.
 * - `missing`: no source yet, must be validated.
 *
 * This type is *additive*: it coexists with `DataClassification` in
 * `src/types/technical.ts`. Both can live on the same field.
 */

export type EvidenceConfidence =
  | "documented"
  | "derived"
  | "inferred"
  | "assumption"
  | "missing";

/**
 * Reference to a primary source document.
 * `documentId` should match an entry in `documentRegistry.ts`. The sentinel
 * `"__none__"` is reserved for assumptions/derivations without a primary source.
 */
export type EvidenceRef = {
  /** ID present in DocumentRegistry, or `"__none__"` for assumption/derived. */
  documentId: string;
  /** 1-indexed page within the PDF. */
  page?: number;
  /** Citing section, numeral, table or figure (e.g. "Art. 3.2", "Tabla 4"). */
  section?: string;
  /** Free-form note from the evaluator (interpretation, not the source itself). */
  note?: string;
  /** Confidence level of this evidence. */
  confidence: EvidenceConfidence;
};

/** A value paired with its evidence trail. */
export type EvidencedValue<T> = {
  value: T;
  /** Optional unit string (e.g. "MW", "kV", "m"). */
  unit?: string;
  /** One or more references. May be empty only when the value is provisional. */
  evidence: EvidenceRef[];
  /** Flag set true when this value cannot be used for IFC engineering without re-validation. */
  mustVerifyBeforeIFC?: boolean;
};

/** Sentinel documentId used by helpers for non-cited evidence. */
export const EVIDENCE_NONE = "__none__" as const;

/** Builds an EvidencedValue marked as an editable assumption. */
export function asAssumption<T>(
  value: T,
  note?: string,
  unit?: string
): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ documentId: EVIDENCE_NONE, confidence: "assumption", note }],
  };
}

/** Builds an EvidencedValue marked as derived (formula in `note`). */
export function asDerived<T>(
  value: T,
  note: string,
  unit?: string
): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ documentId: EVIDENCE_NONE, confidence: "derived", note }],
  };
}

/** Builds an EvidencedValue marked as inferred (e.g. from a visual pattern). */
export function asInferred<T>(
  value: T,
  note: string,
  unit?: string
): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ documentId: EVIDENCE_NONE, confidence: "inferred", note }],
  };
}

/** Builds an EvidencedValue from a single primary citation. */
export function asDocumented<T>(
  value: T,
  ref: Omit<EvidenceRef, "confidence"> & { confidence?: "documented" },
  unit?: string
): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ ...ref, confidence: "documented" }],
  };
}

/** Builds an EvidencedValue marked as missing (must be sourced). */
export function asMissing<T>(
  fallback: T,
  note?: string,
  unit?: string
): EvidencedValue<T> {
  return {
    value: fallback,
    unit,
    evidence: [
      { documentId: EVIDENCE_NONE, confidence: "missing", note },
    ],
    mustVerifyBeforeIFC: true,
  };
}

/** Highest confidence level appearing in a list of evidence (lower index = stronger). */
const CONFIDENCE_RANK: Record<EvidenceConfidence, number> = {
  documented: 0,
  derived: 1,
  inferred: 2,
  assumption: 3,
  missing: 4,
};

export function bestConfidence(refs: EvidenceRef[]): EvidenceConfidence {
  if (refs.length === 0) return "missing";
  return refs.reduce<EvidenceConfidence>((best, ref) => {
    return CONFIDENCE_RANK[ref.confidence] < CONFIDENCE_RANK[best]
      ? ref.confidence
      : best;
  }, "missing");
}
