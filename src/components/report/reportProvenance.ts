/**
 * reportProvenance — minimal, pure provenance + "unavailable" vocabulary for
 * the technical report.
 *
 * The report engine (`buildReportData`) already models how each value was
 * obtained: `EvidenceConfidence` on `EvidencedValue`s, and the coarse
 * `reportKpis.source` discriminant. This module does NOT recompute or change
 * any of that — it only translates those existing signals into:
 *   1. a report-facing classification (mapped to the app's certified /
 *      preliminary / pending semantics) so a value's basis can be shown, not
 *      just asserted in prose, and
 *   2. ONE canonical "not available" sentinel so missing/derived-null values
 *      render identically everywhere instead of ad-hoc "—".
 *
 * Pure and framework-agnostic. The PDF and the preview adopt these helpers in
 * the visual phase; nothing here is wired into rendering yet, so output is
 * unchanged by this commit.
 */
import type { EvidenceConfidence, EvidenceRef } from "@/types/evidence";
import { bestConfidence } from "@/types/evidence";
import type { ReportKpiSource } from "@/lib/report/buildReportData";

/**
 * Report-facing classification. `certified` / `preliminary` / `pending` mirror
 * the mandated product data-classification (and the app's blue/amber/rose
 * tokens); `calculated` is a neutral "derived from other values" basis.
 */
export type ReportClassification =
  | "certified"
  | "calculated"
  | "preliminary"
  | "pending";

const UNAVAILABLE_LABEL: Record<"en" | "es", string> = {
  en: "Not available — requires detailed engineering",
  es: "No disponible — requiere ingeniería de detalle",
};

/** Canonical "not available" text — the single empty-state for report values. */
export function unavailableLabel(locale: "en" | "es"): string {
  return UNAVAILABLE_LABEL[locale];
}

const CLASSIFICATION_LABEL: Record<
  ReportClassification,
  Record<"en" | "es", string>
> = {
  certified: { en: "Certified data", es: "Dato certificado" },
  calculated: { en: "Calculated", es: "Calculado" },
  preliminary: { en: "Preliminary assumption", es: "Supuesto preliminar" },
  pending: { en: "Pending validation", es: "Pendiente de validación" },
};

export function classificationLabel(
  c: ReportClassification,
  locale: "en" | "es"
): string {
  return CLASSIFICATION_LABEL[c][locale];
}

/** Map an evidence confidence level to a report classification. */
export function classifyConfidence(
  confidence: EvidenceConfidence
): ReportClassification {
  switch (confidence) {
    case "documented":
      return "certified";
    case "derived":
    case "inferred":
      return "calculated";
    case "assumption":
      return "preliminary";
    case "missing":
      return "pending";
  }
}

/** Classification for a value, from its strongest evidence reference. */
export function classifyEvidence(refs: EvidenceRef[]): ReportClassification {
  return classifyConfidence(bestConfidence(refs));
}

/**
 * Classification for a headline KPI block: documented targets are certified;
 * layout-derived or mixed values are calculated (never presented as certified).
 */
export function classifyKpiSource(
  source: ReportKpiSource
): ReportClassification {
  return source === "documented_targets" ? "certified" : "calculated";
}

export type PresentedValue = {
  /** Display text: the formatted value, or the canonical unavailable label. */
  text: string;
  /** False when the underlying value was null/undefined (unavailable). */
  isAvailable: boolean;
};

/**
 * Present a possibly-null value: format it when present, otherwise return the
 * canonical "Not available — requires detailed engineering" label. Never
 * fabricates a value.
 */
export function presentValue(
  value: number | null | undefined,
  format: (v: number) => string,
  locale: "en" | "es"
): PresentedValue {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return { text: unavailableLabel(locale), isAvailable: false };
  }
  return { text: format(value), isAvailable: true };
}

/**
 * Build an honest legend listing only the classifications that actually appear
 * in this report (preserves the canonical order).
 */
export function buildProvenanceLegend(
  classifications: Iterable<ReportClassification>,
  locale: "en" | "es"
): { classification: ReportClassification; label: string }[] {
  const present = new Set(classifications);
  const ORDER: ReportClassification[] = [
    "certified",
    "calculated",
    "preliminary",
    "pending",
  ];
  return ORDER.filter((c) => present.has(c)).map((c) => ({
    classification: c,
    label: classificationLabel(c, locale),
  }));
}
