/**
 * Estilo "paper técnico clásico" para el reporte BESS (Fase 11).
 *
 * Paleta neutra (negro, gris carbón, azul ingeniería marca de agua),
 * tipografía serif para texto continuo y sans para encabezados/datos,
 * tablas formales con bordes finos.
 */

import { StyleSheet } from "@react-pdf/renderer";

export const REPORT_COLORS = {
  ink: "#0f172a", // negro tinta
  body: "#1f2937", // texto cuerpo
  muted: "#475569", // notas, captions
  rule: "#94a3b8", // líneas separadoras finas
  paper: "#ffffff",
  paperAlt: "#f8fafc", // fondo de tablas alternadas
  accent: "#1e3a8a", // azul ingeniería para titulares
  warn: "#b45309",
  danger: "#991b1b",
  ok: "#166534",
  pendingTone: "#7c2d12",
} as const;

export const REPORT_FONTS = {
  body: "Times-Roman",
  bodyBold: "Times-Bold",
  bodyItalic: "Times-Italic",
  data: "Helvetica",
  dataBold: "Helvetica-Bold",
  dataItalic: "Helvetica-Oblique",
  mono: "Courier",
  monoBold: "Courier-Bold",
} as const;

export const reportStyles = StyleSheet.create({
  page: {
    backgroundColor: REPORT_COLORS.paper,
    color: REPORT_COLORS.body,
    fontFamily: REPORT_FONTS.body,
    fontSize: 9.5,
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 48,
    lineHeight: 1.4,
  },
  pageHeader: {
    position: "absolute",
    top: 22,
    left: 48,
    right: 48,
    fontFamily: REPORT_FONTS.data,
    fontSize: 7.5,
    color: REPORT_COLORS.muted,
    borderBottomWidth: 0.5,
    borderBottomColor: REPORT_COLORS.rule,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontFamily: REPORT_FONTS.data,
    fontSize: 7,
    color: REPORT_COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: REPORT_COLORS.rule,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageFooterDisclaimer: {
    flex: 1,
    paddingRight: 8,
    fontSize: 6.5,
  },

  // ──────── Cover ────────
  coverWrap: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    borderTopWidth: 10,
    borderTopColor: REPORT_COLORS.ink,
    paddingTop: 20,
  },
  coverTopLine: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: REPORT_COLORS.accent,
    textTransform: "uppercase",
  },
  coverDivider: {
    height: 2,
    backgroundColor: REPORT_COLORS.accent,
    marginTop: 14,
    marginBottom: 14,
    width: 80,
  },
  coverTitle: {
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 32,
    color: REPORT_COLORS.ink,
    lineHeight: 1.15,
  },
  coverSubtitle: {
    marginTop: 8,
    fontFamily: REPORT_FONTS.bodyItalic,
    fontSize: 13,
    color: REPORT_COLORS.muted,
  },
  coverMeta: {
    marginTop: 28,
    flexDirection: "row",
    gap: 24,
  },
  coverMetaItem: {
    minWidth: 130,
  },
  coverMetaLabel: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: REPORT_COLORS.muted,
  },
  coverMetaValue: {
    fontFamily: REPORT_FONTS.data,
    fontSize: 11,
    color: REPORT_COLORS.ink,
    marginTop: 2,
  },
  coverKpiGrid: {
    marginTop: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    borderTopWidth: 0.5,
    borderTopColor: REPORT_COLORS.rule,
    borderLeftWidth: 0.5,
    borderLeftColor: REPORT_COLORS.rule,
  },
  coverKpiCell: {
    width: "25%",
    borderRightWidth: 0.5,
    borderRightColor: REPORT_COLORS.rule,
    borderBottomWidth: 0.5,
    borderBottomColor: REPORT_COLORS.rule,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  coverKpiLabel: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: REPORT_COLORS.muted,
  },
  coverKpiValue: {
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 18,
    color: REPORT_COLORS.ink,
    marginTop: 2,
  },
  coverKpiUnit: {
    fontFamily: REPORT_FONTS.data,
    fontSize: 9,
    color: REPORT_COLORS.muted,
    marginLeft: 4,
  },
  coverFooter: {
    fontFamily: REPORT_FONTS.bodyItalic,
    fontSize: 8,
    color: REPORT_COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: REPORT_COLORS.rule,
    paddingTop: 10,
  },

  // ──────── Section ────────
  sectionTitle: {
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 14,
    color: REPORT_COLORS.ink,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: REPORT_COLORS.accent,
  },
  sectionNumber: {
    fontFamily: REPORT_FONTS.dataBold,
    color: REPORT_COLORS.accent,
  },
  subTitle: {
    marginTop: 10,
    marginBottom: 4,
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 11,
    color: REPORT_COLORS.ink,
  },
  paragraph: {
    fontSize: 9.5,
    marginBottom: 6,
    textAlign: "justify",
  },
  note: {
    fontFamily: REPORT_FONTS.bodyItalic,
    fontSize: 8.5,
    color: REPORT_COLORS.muted,
    marginTop: 4,
  },

  // ──────── Table ────────
  table: {
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: REPORT_COLORS.rule,
    marginTop: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: REPORT_COLORS.rule,
  },
  tableRowAlt: {
    backgroundColor: REPORT_COLORS.paperAlt,
  },
  tableHeaderRow: {
    backgroundColor: REPORT_COLORS.ink,
  },
  tableHeaderCell: {
    color: REPORT_COLORS.paper,
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 7.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: REPORT_COLORS.rule,
  },
  tableCell: {
    fontFamily: REPORT_FONTS.data,
    fontSize: 8.5,
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: REPORT_COLORS.body,
    borderRightWidth: 0.5,
    borderRightColor: REPORT_COLORS.rule,
  },
  tableCellRight: {
    textAlign: "right",
    fontFamily: REPORT_FONTS.mono,
  },
  tableCellMono: {
    fontFamily: REPORT_FONTS.mono,
  },

  // ──────── Definition list ────────
  defGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: REPORT_COLORS.rule,
  },
  defCell: {
    width: "50%",
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: REPORT_COLORS.rule,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  defLabel: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: REPORT_COLORS.muted,
  },
  defValue: {
    fontFamily: REPORT_FONTS.mono,
    fontSize: 10,
    color: REPORT_COLORS.ink,
    marginTop: 2,
  },

  // ──────── Pills ────────
  pill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 7,
    fontFamily: REPORT_FONTS.dataBold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pillPass: { backgroundColor: "#dcfce7", color: REPORT_COLORS.ok },
  pillViolation: { backgroundColor: "#fee2e2", color: REPORT_COLORS.danger },
  pillManual: { backgroundColor: "#e0f2fe", color: "#075985" },
  pillPending: { backgroundColor: "#fef3c7", color: REPORT_COLORS.warn },
  pillOut: { backgroundColor: "#e2e8f0", color: REPORT_COLORS.muted },
  pillBlocking: { backgroundColor: "#fecaca", color: REPORT_COLORS.danger },
  pillCritical: { backgroundColor: "#fee2e2", color: REPORT_COLORS.danger },
  pillImportant: { backgroundColor: "#fef3c7", color: REPORT_COLORS.warn },
  pillDesirable: { backgroundColor: "#e2e8f0", color: REPORT_COLORS.muted },

  // ──────── Bullet list ────────
  bulletRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 3,
  },
  bulletDot: {
    fontFamily: REPORT_FONTS.bodyBold,
    color: REPORT_COLORS.accent,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
  },

  // ──────── Image / svg ────────
  imageWrap: {
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: REPORT_COLORS.rule,
    backgroundColor: REPORT_COLORS.paperAlt,
    padding: 4,
  },
  imageCaption: {
    fontFamily: REPORT_FONTS.bodyItalic,
    fontSize: 7.5,
    color: REPORT_COLORS.muted,
    marginTop: 2,
    textAlign: "center",
  },
});
