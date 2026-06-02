/**
 * Estilo "paper técnico clásico" para el reporte BESS (Fase 11).
 *
 * Paleta neutra (negro, gris carbón, azul ingeniería marca de agua),
 * tipografía serif para texto continuo y sans para encabezados/datos,
 * tablas formales con bordes finos.
 */

import { StyleSheet } from "@react-pdf/renderer";
import { reportTheme } from "./reportTheme";

// Colors and fonts now live in the renderer-neutral `reportTheme` (so the
// in-app preview can share them); re-exported here unchanged for the many
// pdf*.tsx consumers that import them from this module.
export const REPORT_COLORS = reportTheme.color;

export const REPORT_FONTS = reportTheme.font;

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
    backgroundColor: REPORT_COLORS.paperAlt,
    borderBottomWidth: 1,
    borderBottomColor: REPORT_COLORS.accent,
  },
  tableHeaderCell: {
    color: REPORT_COLORS.ink,
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
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: reportTheme.radius.pill,
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

  // ──────── KPI cards (executive dashboard) ────────
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 96,
    borderWidth: 0.5,
    borderColor: REPORT_COLORS.rule,
    borderRadius: 4,
    backgroundColor: REPORT_COLORS.paperAlt,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  kpiCardAccent: {
    borderTopWidth: 2,
    borderTopColor: REPORT_COLORS.accent,
  },
  kpiCardLabel: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 6.5,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: REPORT_COLORS.muted,
  },
  kpiCardValue: {
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 16,
    color: REPORT_COLORS.ink,
    marginTop: 3,
  },
  kpiCardUnit: {
    fontFamily: REPORT_FONTS.data,
    fontSize: 8,
    color: REPORT_COLORS.muted,
  },

  // ──────── Executive hero ────────
  heroBox: {
    borderLeftWidth: 3,
    borderLeftColor: REPORT_COLORS.accent,
    backgroundColor: REPORT_COLORS.paperAlt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  heroResult: {
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 11.5,
    color: REPORT_COLORS.ink,
    lineHeight: 1.35,
  },
  maturityRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  maturityBadge: {
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 7,
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 7.5,
    letterSpacing: 0.4,
    backgroundColor: "#e0f2fe",
    color: "#075985",
  },

  // ──────── Status summary chips ────────
  statusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  statusChip: {
    borderRadius: 3,
    borderWidth: 0.5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    minWidth: 70,
  },
  statusChipCount: {
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 13,
  },
  statusChipLabel: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 6.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // ──────── Electrical chain stages ────────
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 8,
  },
  stageBox: {
    borderWidth: 0.6,
    borderColor: REPORT_COLORS.accent,
    borderRadius: 4,
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 78,
  },
  stageLabel: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 7.5,
    color: REPORT_COLORS.ink,
  },
  stageSub: {
    fontFamily: REPORT_FONTS.data,
    fontSize: 6,
    color: REPORT_COLORS.muted,
    marginTop: 1,
  },
  stageConnector: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 12,
    color: REPORT_COLORS.accent,
    marginHorizontal: 4,
  },

  // ──────── Numbered next-steps list ────────
  stepRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  stepNumber: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 8,
    color: REPORT_COLORS.paper,
    backgroundColor: REPORT_COLORS.accent,
    borderRadius: 7,
    width: 14,
    height: 14,
    textAlign: "center",
    paddingTop: 2,
  },
  stepText: {
    flex: 1,
    fontSize: 9,
  },

  // ──────── Grouped exclusion category ────────
  groupHeader: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 8.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: REPORT_COLORS.accent,
    marginTop: 8,
    marginBottom: 3,
  },

  // ──────── SLD (single-line diagram) frame ────────
  sldWrap: {
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: REPORT_COLORS.rule,
    borderRadius: 4,
    backgroundColor: REPORT_COLORS.paperAlt,
    padding: 6,
  },

  // ──────── Section header (numbered chip) ────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: REPORT_COLORS.accent,
  },
  sectionNumberChip: {
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 9.5,
    color: REPORT_COLORS.paper,
    backgroundColor: REPORT_COLORS.accent,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    textAlign: "center",
  },
  sectionHeaderTitle: {
    flex: 1,
    fontFamily: REPORT_FONTS.bodyBold,
    fontSize: 14,
    color: REPORT_COLORS.ink,
  },

  // ──────── Alert card (left accent bar + severity badge) ────────
  alertCard: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderRadius: 4,
    marginBottom: 7,
    overflow: "hidden",
  },
  alertAccentBar: {
    width: 3,
  },
  alertBody: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  alertBadge: {
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 5,
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 6.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  alertTitle: {
    flex: 1,
    fontFamily: REPORT_FONTS.dataBold,
    fontSize: 9,
    color: REPORT_COLORS.ink,
  },
  alertMessage: {
    fontSize: 8.5,
  },
  alertRecommendation: {
    marginTop: 3,
    fontSize: 8,
    color: REPORT_COLORS.muted,
  },
});
