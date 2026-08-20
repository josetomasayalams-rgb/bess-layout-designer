/**
 * Apple-DNA stylesheet for the BESS technical report.
 *
 * Near-monochrome ink-on-paper with ONE accent and ONE red, an 8pt spacing
 * grid, a single modular type scale, and 0.5pt hairlines instead of boxes and
 * zebra fills. Every value derives from `reportTheme` (the renderer-neutral
 * token source) so the PDF and the in-app preview cannot drift.
 */

import { StyleSheet } from "@react-pdf/renderer";
import { reportTheme } from "./reportTheme";

// Colors and fonts live in the renderer-neutral `reportTheme`; re-exported here
// unchanged for the many pdf*.tsx consumers that import them from this module.
export const REPORT_COLORS = reportTheme.color;
export const REPORT_FONTS = reportTheme.font;

const C = reportTheme.color;
const F = reportTheme.font;
const T = reportTheme.type;
const S = reportTheme.space;
const R = reportTheme.radius;

export const reportStyles = StyleSheet.create({
  page: {
    backgroundColor: C.paper,
    color: C.body,
    fontFamily: F.body,
    fontSize: T.body,
    paddingTop: S.pageVertical,
    paddingBottom: S.pageVertical,
    paddingHorizontal: S.page,
    lineHeight: 1.45,
  },
  // Cover: calm and confident — a single thin accent band at the very top,
  // no decorative geometry.
  coverPage: {
    backgroundColor: C.paper,
    color: C.body,
    fontFamily: F.body,
    fontSize: T.body,
    paddingTop: S.pageVertical,
    paddingBottom: S.pageVertical,
    paddingHorizontal: S.page,
    lineHeight: 1.45,
    borderTopWidth: 3,
    borderTopColor: C.accent,
  },
  pageHeader: {
    position: "absolute",
    top: 24,
    left: S.page,
    right: S.page,
    fontFamily: F.data,
    fontSize: T.label,
    letterSpacing: 0.3,
    color: C.muted,
    borderBottomWidth: 0.5,
    borderBottomColor: C.ruleFaint,
    paddingBottom: S.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: S.page,
    right: S.page,
    fontFamily: F.data,
    fontSize: T.label,
    letterSpacing: 0.3,
    color: C.muted,
    borderTopWidth: 0.5,
    borderTopColor: C.ruleFaint,
    paddingTop: S.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageFooterDisclaimer: {
    flex: 1,
    paddingRight: S.sm,
  },

  // ──────── Cover ────────
  coverWrap: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    paddingTop: S.sm,
  },
  coverTopLine: {
    fontFamily: F.dataBold,
    fontSize: T.caption,
    letterSpacing: 0.8,
    color: C.muted,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontFamily: F.bodyBold,
    fontSize: T.cover,
    color: C.ink,
    letterSpacing: -0.4,
    lineHeight: 1.12,
    marginTop: S.md,
  },
  coverSubtitle: {
    marginTop: S.sm,
    fontFamily: F.body,
    fontSize: T.coverSub,
    color: C.muted,
  },
  coverMeta: {
    marginTop: S.xl,
    flexDirection: "row",
    gap: S.xl,
  },
  coverMetaItem: {
    minWidth: 130,
  },
  coverMetaLabel: {
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  coverMetaValue: {
    fontFamily: F.data,
    fontSize: 11,
    color: C.ink,
    marginTop: S.xs,
  },
  coverScopeLine: {
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: S.sm,
  },
  coverFooter: {
    fontFamily: F.bodyItalic,
    fontSize: T.caption,
    color: C.muted,
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
    paddingTop: S.md,
    lineHeight: 1.45,
  },

  // ──────── Section ────────
  subTitle: {
    marginTop: S.lg,
    marginBottom: S.sm,
    fontFamily: F.bodyBold,
    fontSize: T.subtitle,
    color: C.ink,
    letterSpacing: -0.1,
  },
  paragraph: {
    fontSize: T.body,
    marginBottom: S.sm,
    textAlign: "left",
  },
  note: {
    fontFamily: F.bodyItalic,
    fontSize: T.caption,
    color: C.muted,
    marginTop: S.xs,
    lineHeight: 1.45,
  },

  // ──────── Table (airy, hairline rows, no zebra) ────────
  table: {
    borderTopWidth: 0.5,
    borderColor: C.rule,
    marginTop: S.sm,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: C.ruleFaint,
  },
  // Retained as a key (legacy callers reference it) but intentionally flat:
  // hierarchy comes from hairline separators, not zebra fills.
  tableRowAlt: {},
  tableHeaderRow: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  tableHeaderCell: {
    color: C.muted,
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingVertical: S.sm,
    paddingHorizontal: S.sm,
  },
  tableCell: {
    fontFamily: F.data,
    fontSize: T.data,
    paddingVertical: S.sm,
    paddingHorizontal: S.sm,
    color: C.body,
  },
  tableCellRight: {
    textAlign: "right",
  },
  tableCellMono: {
    fontFamily: F.mono,
  },

  // ──────── Definition list (hairline grid) ────────
  defGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: C.ruleFaint,
  },
  defCell: {
    width: "50%",
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.ruleFaint,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
  },
  defLabel: {
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  defValue: {
    fontFamily: F.data,
    fontSize: T.data,
    color: C.ink,
    marginTop: S.xs,
  },

  // ──────── Pills (consolidated: flat, no fill) ────────
  pill: {
    paddingHorizontal: S.sm,
    paddingVertical: 1,
    borderRadius: R.pill,
    borderWidth: 0.5,
    fontSize: T.label,
    fontFamily: F.dataBold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // Three surviving roles, all transparent fill, tone via text/border.
  pillNeutral: { borderColor: C.rule, color: C.muted },
  pillAccent: { borderColor: C.rule, color: C.accent },
  pillCriticalTone: { borderColor: C.danger, color: C.danger },
  // Back-compat aliases (callers still reference these names) -> tone roles:
  pillPass: { borderColor: C.rule, color: C.ink },
  pillViolation: { borderColor: C.danger, color: C.danger },
  pillManual: { borderColor: C.rule, color: C.muted },

  // ──────── Bullet list ────────
  bulletRow: {
    flexDirection: "row",
    gap: S.sm,
    marginBottom: S.xs,
  },
  bulletDot: {
    fontFamily: F.bodyBold,
    color: C.accent,
  },
  bulletText: {
    flex: 1,
    fontSize: T.body,
  },

  // ──────── Image / svg ────────
  imageWrap: {
    marginTop: S.lg,
    marginBottom: S.lg,
    borderTopWidth: 0.5,
    borderColor: C.ruleFaint,
    paddingTop: S.sm,
  },
  imageCaption: {
    fontFamily: F.bodyItalic,
    fontSize: T.caption,
    color: C.muted,
    marginTop: S.xs,
    textAlign: "center",
  },

  // ──────── KPI tiles (flat, type-led) ────────
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.lg,
    marginTop: S.sm,
    marginBottom: S.sm,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 100,
    paddingVertical: S.sm,
    paddingRight: S.md,
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
  },
  // Retained key; flat (no accent bar / fill). Emphasis now comes from type.
  kpiCardAccent: {},
  kpiCardLabel: {
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  kpiCardValue: {
    fontFamily: F.bodyBold,
    fontSize: T.kpi,
    color: C.ink,
    letterSpacing: -0.4,
    marginTop: S.xs,
  },
  kpiCardUnit: {
    fontFamily: F.data,
    fontSize: T.caption,
    color: C.muted,
  },

  // ──────── Executive hero ────────
  heroBox: {
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    paddingVertical: S.xs,
    paddingHorizontal: S.md,
    marginBottom: S.md,
  },
  heroResult: {
    fontFamily: F.bodyBold,
    fontSize: 17,
    color: C.ink,
    letterSpacing: -0.2,
    lineHeight: 1.25,
  },
  heroQualifier: {
    fontFamily: F.body,
    fontSize: T.body,
    color: C.muted,
    marginTop: S.xs,
  },
  maturityRow: {
    flexDirection: "row",
    gap: S.sm,
    marginTop: S.sm,
    marginBottom: S.md,
    flexWrap: "wrap",
  },
  maturityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.accent,
  },

  // ──────── Status summary chips ────────
  statusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.md,
    marginTop: S.xs,
    marginBottom: S.sm,
  },
  statusChip: {
    paddingVertical: S.xs,
    paddingRight: S.md,
    minWidth: 70,
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
  },
  statusChipCount: {
    fontFamily: F.bodyBold,
    fontSize: T.subtitle,
    color: C.ink,
  },
  statusChipLabel: {
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
  },

  // ──────── Electrical chain stages ────────
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: S.sm,
    marginBottom: S.md,
  },
  stageBox: {
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: R.sm,
    paddingVertical: S.sm,
    paddingHorizontal: S.sm,
    minWidth: 78,
  },
  stageLabel: {
    fontFamily: F.dataBold,
    fontSize: T.label,
    color: C.ink,
  },
  stageSub: {
    fontFamily: F.data,
    fontSize: 6,
    color: C.muted,
    marginTop: 1,
  },
  stageConnector: {
    fontFamily: F.dataBold,
    fontSize: T.subtitle,
    color: C.muted,
    marginHorizontal: S.xs,
  },

  // ──────── Numbered next-steps list ────────
  stepRow: {
    flexDirection: "row",
    gap: S.sm,
    marginBottom: S.xs,
    alignItems: "flex-start",
  },
  stepNumber: {
    fontFamily: F.dataBold,
    fontSize: T.caption,
    color: C.accent,
    width: 14,
    paddingTop: 1,
  },
  stepText: {
    flex: 1,
    fontSize: T.body,
  },

  // ──────── Grouped category header ────────
  groupHeader: {
    fontFamily: F.dataBold,
    fontSize: T.caption,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: S.md,
    marginBottom: S.xs,
  },

  // ──────── SLD (single-line diagram) frame ────────
  sldWrap: {
    marginTop: S.sm,
    marginBottom: S.xs,
    borderTopWidth: 0.5,
    borderColor: C.ruleFaint,
    paddingTop: S.sm,
  },

  // ──────── Section header (typographic number, hairline rule) ────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: S.sm,
    marginBottom: S.lg,
    paddingBottom: S.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  sectionNumberChip: {
    fontFamily: F.dataBold,
    fontSize: 13,
    color: C.muted,
    marginRight: S.xs,
  },
  sectionHeaderTitle: {
    flex: 1,
    fontFamily: F.bodyBold,
    fontSize: T.title,
    letterSpacing: -0.2,
    color: C.ink,
  },

  // ──────── Alert card (single left-bar channel, white body) ────────
  alertCard: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: R.sm,
    backgroundColor: C.paper,
    marginBottom: S.sm,
    overflow: "hidden",
  },
  alertAccentBar: {
    width: 2.5,
  },
  alertBody: {
    flex: 1,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
  },
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginBottom: S.xs,
  },
  alertBadge: {
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  alertTitle: {
    flex: 1,
    fontFamily: F.dataBold,
    fontSize: T.body,
    color: C.ink,
  },
  alertMessage: {
    fontSize: T.data,
    lineHeight: 1.45,
  },
  alertRecommendationLabel: {
    marginTop: S.xs,
    fontFamily: F.dataBold,
    fontSize: T.label,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  alertRecommendation: {
    fontSize: T.data,
    color: C.body,
  },

  // ──────── Empty state ────────
  emptyState: {
    borderLeftWidth: 2,
    borderLeftColor: C.rule,
    paddingLeft: S.md,
    paddingVertical: S.xs,
    marginTop: S.sm,
    marginBottom: S.sm,
  },
  emptyStateText: {
    fontFamily: F.body,
    fontSize: T.body,
    color: C.muted,
  },
  emptyStateHint: {
    fontFamily: F.body,
    fontSize: T.caption,
    color: C.faint,
    marginTop: 2,
  },
});
