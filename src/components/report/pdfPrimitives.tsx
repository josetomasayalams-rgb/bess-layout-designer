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
import {
  REPORT_COLORS,
  REPORT_FONTS,
  reportStyles as s,
} from "./reportStyles";
import { PageFooter, PageHeader } from "./pdfChrome";
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
      <PageHeader data={data} />
      <View>
        <Text style={s.sectionTitle}>
          <Text style={s.sectionNumber}>{number}.</Text>
          {"  "}
          {title}
        </Text>
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
  const color =
    severity === "critical"
      ? REPORT_COLORS.danger
      : severity === "warning"
        ? REPORT_COLORS.warn
        : REPORT_COLORS.accent;
  return (
    <View
      style={{
        borderWidth: 0.8,
        borderColor: color,
        backgroundColor: severity === "critical" ? "#fff1f2" : "#fffbeb",
        padding: 8,
        marginBottom: 7,
      }}
    >
      <Text style={{ fontFamily: REPORT_FONTS.dataBold, fontSize: 9, color }}>
        {severity.toUpperCase()} · {title}
      </Text>
      <Text style={{ marginTop: 3, fontSize: 8.5 }}>{message}</Text>
      <Text style={{ marginTop: 3, fontSize: 8, color: REPORT_COLORS.muted }}>
        Acción recomendada: {recommendation}
      </Text>
    </View>
  );
}
