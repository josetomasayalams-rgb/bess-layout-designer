/**
 * pdfPrimitives — generic structural building blocks for the technical PDF
 * report: `SectionPage`, `Table`, `DefGrid`, `AlertCard`.
 *
 * Extracted from `ReportDocument.tsx` in Phase 12A (commit phase12a.3) so
 * that the upcoming per-section files under `sections/` can compose them
 * without pulling the entire 1k-LOC monolith.
 *
 * All four components are byte-equivalent to their originals in
 * `ReportDocument.tsx` of commit `a334552` (lines 32–170 of head pre-extract):
 *   - SectionPage  - lines 32–57
 *   - Table        - lines 70–115 (with local `Col` type at lines 63–68)
 *   - DefGrid      - lines 117–132
 *   - AlertCard    - lines 134–170
 *
 * `SectionPage` depends on `PageHeader` and `PageFooter` from `./pdfChrome`.
 * That dependency is one-directional: `pdfPrimitives` imports from
 * `pdfChrome`, never the reverse, preserving the strict DAG established in
 * commit `a334552`.
 *
 * The `Col` type is kept local because no consumer outside this module needs
 * it (verified by `grep '\bCol\b' src/components/report/ReportDocument.tsx`
 * which returned only the two in-file uses pre-extraction).
 */

import type React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { REPORT_COLORS, reportStyles as s } from "./reportStyles";
import { PageFooter, PageHeader, Watermark } from "./pdfChrome";
import type { TechnicalReportData } from "@/lib/report/buildReportData";

// ──────────────────────────────────────────────────────────────────
// Generic section page wrapper
// ──────────────────────────────────────────────────────────────────

export function SectionPage({
  data,
  number,
  title,
  children,
}: {
  data: TechnicalReportData;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={s.page}>
      <Watermark />
      <PageHeader data={data} />
      <View>
        <View style={s.sectionHeader}>
          <Text style={s.sectionNumberChip}>{number}</Text>
          <Text style={s.sectionHeaderTitle}>{title}</Text>
        </View>
        {children}
      </View>
      <PageFooter data={data} />
    </Page>
  );
}

// ──────────────────────────────────────────────────────────────────
// Tabular helpers
// ──────────────────────────────────────────────────────────────────

type Col = {
  header: string;
  width: string;
  align?: "left" | "right";
  mono?: boolean;
};

export function Table({
  cols,
  rows,
}: {
  cols: Col[];
  rows: (string | number)[][];
}) {
  return (
    <View style={s.table} wrap>
      <View style={[s.tableRow, s.tableHeaderRow]}>
        {cols.map((c) => (
          <Text
            key={c.header}
            style={[
              s.tableHeaderCell,
              { width: c.width },
              c.align === "right" ? { textAlign: "right" as const } : {},
            ]}
          >
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View
          key={`row-${i}`}
          style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
        >
          {cols.map((c, j) => (
            <Text
              key={c.header + j}
              style={[
                s.tableCell,
                { width: c.width },
                c.align === "right" ? s.tableCellRight : {},
                c.mono ? s.tableCellMono : {},
              ]}
            >
              {String(r[j] ?? "—")}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function DefGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <View style={s.defGrid}>
      {items.map((it) => (
        <View key={it.label} style={s.defCell}>
          <Text style={s.defLabel}>{it.label}</Text>
          <Text style={s.defValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function AlertCard({
  severity,
  title,
  message,
  recommendation,
}: {
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  recommendation: string;
}) {
  const tone = {
    critical: {
      color: REPORT_COLORS.danger,
      bg: "#fff1f2",
      badgeBg: "#fee2e2",
      badgeFg: REPORT_COLORS.danger,
      label: "Crítico",
    },
    warning: {
      color: REPORT_COLORS.warn,
      bg: "#fffbeb",
      badgeBg: "#fef3c7",
      badgeFg: REPORT_COLORS.warn,
      label: "Aviso",
    },
    info: {
      color: REPORT_COLORS.accent,
      bg: "#eff6ff",
      badgeBg: "#e0f2fe",
      badgeFg: "#075985",
      label: "Informativo",
    },
  }[severity];

  return (
    <View style={[s.alertCard, { borderColor: tone.color, backgroundColor: tone.bg }]}>
      <View style={[s.alertAccentBar, { backgroundColor: tone.color }]} />
      <View style={s.alertBody}>
        <View style={s.alertHeaderRow}>
          <Text
            style={[s.alertBadge, { backgroundColor: tone.badgeBg, color: tone.badgeFg }]}
          >
            {tone.label}
          </Text>
          <Text style={s.alertTitle}>{title}</Text>
        </View>
        <Text style={s.alertMessage}>{message}</Text>
        <Text style={s.alertRecommendation}>
          Acción recomendada: {recommendation}
        </Text>
      </View>
    </View>
  );
}
