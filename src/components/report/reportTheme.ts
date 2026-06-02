/**
 * reportTheme — the single, renderer-neutral source of design tokens for the
 * BESS technical report.
 *
 * Plain values only (hex strings, point numbers, role names): NO dependency on
 * `@react-pdf/renderer` or the DOM, so BOTH report renderers can consume it —
 * `reportStyles.ts` derives the react-pdf `StyleSheet`, and the in-app preview
 * derives inline styles. This is what stops the PDF and the preview from
 * drifting on palette/type/spacing.
 *
 * Phase 2 (this commit) is intentionally value-preserving: `color` and `font`
 * hold the EXACT values previously inlined in `reportStyles.ts`, so the
 * rendered PDF — and every snapshot — is byte-identical. Later phases re-point
 * `font` at the registered Inter families (Phase 4) and introduce the branded
 * palette (Phase 5) here, in one place.
 */

/** Core ink/paper palette (current "paper técnico clásico" values, unchanged). */
const color = {
  ink: "#0f172a", // negro tinta (slate-900)
  body: "#334155", // texto cuerpo (slate-700)
  muted: "#64748b", // notas, captions (slate-500)
  rule: "#cbd5e1", // líneas separadoras finas (slate-300)
  paper: "#ffffff",
  paperAlt: "#f8fafc", // fondo de tablas alternadas (slate-50)
  accent: "#0284c7", // azul de ingeniería (sky-600)
  warn: "#b45309",
  danger: "#991b1b",
  ok: "#166534",
  pendingTone: "#7c2d12",
} as const;

/**
 * Font role → family. Phase 2 keeps the 14 standard PDF families so output is
 * unchanged; Phase 4 re-points the `body*`/`data*` roles at registered Inter
 * families while keeping these role names stable for every consumer.
 */
const font = {
  body: "Times-Roman",
  bodyBold: "Times-Bold",
  bodyItalic: "Times-Italic",
  data: "Helvetica",
  dataBold: "Helvetica-Bold",
  dataItalic: "Helvetica-Oblique",
  mono: "Courier",
  monoBold: "Courier-Bold",
} as const;

/**
 * Semantic type scale (pt), derived from the sizes already used across the
 * report StyleSheet. Available for consumers to reference; wiring individual
 * styles to it is done incrementally without changing values.
 */
const type = {
  display: 32,
  h1: 14,
  h2: 11,
  body: 9.5,
  label: 7,
  data: 10,
  caption: 7.5,
} as const;

/** Spacing rhythm (pt), aligned to the report's existing margins/gaps. */
const space = {
  page: 48,
  section: 14,
  block: 8,
  tight: 4,
} as const;

/** Corner radii (pt). */
const radius = {
  sm: 2,
  md: 4,
  lg: 6,
  pill: 999,
} as const;

export const reportTheme = { color, font, type, space, radius } as const;

export type ReportTheme = typeof reportTheme;
