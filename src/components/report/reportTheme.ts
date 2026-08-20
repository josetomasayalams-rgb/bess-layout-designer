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
 * Design DNA (Apple): "less but better". A near-monochrome palette — near-black
 * ink, three neutral greys, white — plus ONE restrained accent (Apple blue) and
 * ONE disciplined red reserved for genuinely critical states. Severity and data
 * classification are communicated with grey tints + the single accent + type
 * weight, never a rainbow of hues. Whitespace and 0.5pt hairlines do the work
 * that heavy boxes and zebra fills used to.
 */

/**
 * Core palette — near-monochrome + one accent + one red.
 * `warn`/`ok` are retained as role keys (many call sites read them) but are
 * deliberately remapped onto the neutral system: caution reads as grey + weight,
 * "pass/compliant" reads as plain ink + a glyph. The only surviving non-neutral
 * status color is `danger`, reserved for blocking/critical.
 */
const color = {
  ink: "#1d1d1f", // near-black — all primary text and values
  body: "#3a3a3c", // body prose (hue-neutral graphite)
  muted: "#57637a", // labels, captions (≥7pt); darkened for AA contrast
  faint: "#94a3b8", // unavailable / pending placeholders only
  rule: "#d2d2d7", // 0.5pt hairlines (separators, card borders)
  ruleFaint: "#e2e8f0", // faintest hairlines (table rows, chrome rules)
  paper: "#ffffff",
  paperAlt: "#f5f5f7", // rare subtle surface — never table zebra
  accent: "#0071e3", // the single accent (Apple blue)
  danger: "#d70015", // the only non-neutral status — critical / blocking only
  // Demoted to neutral so legacy callers go monochrome without edits:
  warn: "#57637a", // caution = weight + grey, not amber
  ok: "#1d1d1f", // compliant = ink + checkmark, not green
} as const;

/**
 * Font role -> family. Sans roles point at the self-hosted Inter brand face
 * (registered in `registerReportFonts.ts`, each weight its own family). Mono
 * roles stay on Courier (Inter ships no monospace) and are reserved for true
 * identifiers, coordinates and model codes — never general numerics.
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
 * Type scale (pt) — one modular ladder, consumed by `reportStyles.ts`.
 * Weights are limited to the registered 400 / 600 / 700 Inter families; there
 * is no Medium (500) or tabular face, so "calm emphasis" uses 600.
 */
const type = {
  cover: 34, // cover title only
  coverSub: 15, // cover subtitle (upright, not italic)
  title: 18, // section header title (single role)
  subtitle: 12, // sub-section titles, qualifiers
  kpi: 21, // hero KPI values (cover); 18 for secondary
  kpiSecondary: 18,
  body: 9.5, // base prose
  data: 9, // table / definition cells
  caption: 7.5, // notes, captions
  label: 7, // uppercase small-caps labels (hard floor)
} as const;

/** Spacing rhythm (pt) on a 4/8 grid. Consumed by `reportStyles.ts`. */
const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  page: 56, // horizontal page margin
  pageVertical: 64, // top / bottom page margin
} as const;

/** Corner radii (pt). Flat by default; small radius only for rare callouts. */
const radius = {
  sm: 2,
  md: 4,
  pill: 999,
} as const;

/**
 * Unified tone scale — ONE 4-role system that replaces the former parallel
 * `classification` and `status` triplet blocks. No saturated fills: text color
 * and a hairline border carry meaning, the accent and weight do the emphasis.
 *
 * Role mapping:
 *   neutral  -> calculated / warning / info / out / manual / pending-data
 *   accent   -> certified / active-info / emphasised pass
 *   ink      -> pending-validation / compliant (paired with bold + a glyph)
 *   critical -> blocking / critical (the only red; hairline border, no fill)
 */
const tone = {
  neutral: { text: color.muted, border: color.rule, fill: "transparent" },
  accent: { text: color.accent, border: color.rule, fill: "transparent" },
  ink: { text: color.ink, border: color.rule, fill: "transparent" },
  critical: { text: color.danger, border: color.danger, fill: "transparent" },
} as const;

export const reportTheme = {
  color,
  font,
  type,
  space,
  radius,
  tone,
} as const;

export type ReportTheme = typeof reportTheme;
export type ToneRole = keyof typeof tone;
