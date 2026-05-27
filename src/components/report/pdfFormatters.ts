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
