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
 * Font role → family. The sans roles now point at the self-hosted Inter brand
 * face (registered in `registerReportFonts.ts`, each weight as its own family),
 * matching the app's Inter identity. Mono roles stay on standard Courier (Inter
 * ships no monospace). Role names are stable so every consumer is unaffected.
 */
const font = {
  body: "Inter",
  bodyBold: "Inter Bold",
  bodyItalic: "Inter Italic",
  data: "Inter",
  dataBold: "Inter SemiBold",
  dataItalic: "Inter Italic",
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

/**
 * Data-classification palette, carried verbatim from the app's semantic tokens
 * (globals.css: certified #3b82f6, preliminary #f59e0b, pending #f43f5e) but
 * darkened 1–2 steps for legible contrast on white paper. Each role is a
 * text / fill / border triplet so a value's basis is shown, not asserted.
 * `calculated` is the neutral "derived from other values" tone.
 */
const classification = {
  certified: { text: "#1d4ed8", fill: "#eff6ff", border: "#bfdbfe" },
  preliminary: { text: "#b45309", fill: "#fffbeb", border: "#fde68a" },
  pending: { text: "#be123c", fill: "#fff1f2", border: "#fecdd3" },
  calculated: { text: "#475569", fill: "#f8fafc", border: "#e2e8f0" },
} as const;

/** Semantic status palette (print-tuned), mirroring the app's status tokens. */
const status = {
  compliant: { text: "#15803d", fill: "#f0fdf4", border: "#bbf7d0" },
  warning: { text: "#b45309", fill: "#fffbeb", border: "#fde68a" },
  critical: { text: "#be123c", fill: "#fff1f2", border: "#fecdd3" },
  info: { text: "#075985", fill: "#f0f9ff", border: "#bae6fd" },
} as const;

/** Diagonal "preliminary" page watermark. */
const watermark = {
  text: "PRELIMINAR · BORRADOR CONCEPTUAL",
  color: "#0f172a",
  opacity: 0.05,
} as const;

export const reportTheme = {
  color,
  font,
  type,
  space,
  radius,
  classification,
  status,
  watermark,
} as const;

export type ReportTheme = typeof reportTheme;
