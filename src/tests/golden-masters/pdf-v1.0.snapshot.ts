/**
 * Phase 15.4 — v1.0 golden-master frozen fixture.
 *
 * This module is consumed by `pdf-v1.0.test.tsx`. It builds the
 * canonical `BuildReportDataArgs` for the v1 release and freezes the
 * structural signature the report MUST emit.
 *
 * Rationale
 * ---------
 * Phase 12A pins page sequence; Phase 14.7 pins per-section titles.
 * This file goes one level higher: it pins the **whole report
 * signature** (page count, section ids, disclaimer ids, exclusion ids,
 * KPI presence, regulatory annex presence) as the v1 contract.
 *
 * If anything mutates the structural surface area of the report,
 * `pdf-v1.0.test.tsx` will fail and the change must be acknowledged
 * before v1.0 ships.
 *
 * Strategy
 * --------
 * - No pixel snapshots.
 * - No Chromium.
 * - No Playwright.
 * - No PDF byte snapshots.
 * - Structural only — section ids, disclaimer ids, exclusion ids.
 */

import type { BuildReportDataArgs } from "@/lib/report/buildReportData";
import { makeAnchor, makePolygon } from "@/tests/fixtures";

/** Deterministic input set for the v1 golden master. */
export const GOLDEN_MASTER_INPUT: BuildReportDataArgs = Object.freeze({
  projectName: "GOLDEN-MASTER-v1.0",
  appVersion: "1.0.0-rc.1",
  locale: "es",
  polygon: makePolygon({ anchor: makeAnchor(), width_m: 200, height_m: 100 }),
  anchor: makeAnchor(),
  placed: [],
  designTargets: {},
  blocks: [],
  conversionStations: [],
  mvFeeders: [],
  mvBuses: [],
  poi: null,
  mainTransformer: null,
  auxiliaryServices: null,
  ppc: null,
  operationalLimits: null,
  lossEstimates: [],
  assumptions: [],
  inconsistencies: [],
  pendingData: [],
  regulatoryEvaluation: null,
  caseStudy: null,
  mapCapture: null,
  geocode: null,
}) as BuildReportDataArgs;

/**
 * Frozen canonical page sequence — must match
 * `ReportDocument.snapshot.test.tsx` (Phase 12A). Duplicated here so
 * the v1 master and the structural snapshot can drift-detect each
 * other if either is mutated without the other.
 */
export const GOLDEN_MASTER_PAGES = Object.freeze([
  { kind: "cover" },
  { number: "1", title: "Resumen ejecutivo" },
  { number: "2", title: "Sitio y layout" },
  { number: "3", title: "Configuración BESS y arquitectura eléctrica" },
  { number: "4", title: "Hallazgos y validación normativa" },
  { number: "5", title: "Alcance, exclusiones y próximos estudios" },
  { number: "A1", title: "Anexo: tabla completa de reglas" },
  { number: "A2", title: "Anexo técnico: validaciones eléctricas y referencias" },
] as const);

/**
 * Frozen set of disclaimer ids the v1 report MUST surface, matching
 * the literal `id` field assigned in `buildReportData.ts` (DISC-*).
 *
 * Source of truth: `src/lib/report/buildReportData.ts` lines ~950-970.
 * 9 disclaimers in both locales.
 */
export const GOLDEN_MASTER_DISCLAIMER_IDS = Object.freeze([
  "DISC-GEN",
  "DISC-SIZ",
  "DISC-TRACE",
  "DISC-UNCERT",
  "DISC-FIRE",
  "DISC-COMPAT",
  "DISC-LAYOUT",
  "DISC-INFRA",
  "DISC-INT",
  // Basic-engineering disclaimers added in v1.1 (E4-S04 + troncal wiring)
  "DISC-IB-SCOPE",
  "DISC-IB-NODETAIL",
  "DISC-IB-NOAPPROVAL",
  "DISC-IB-NFPAUL",
  "DISC-IB-OEM",
  "DISC-IB-FIRE",
  "DISC-IB-SEP",
  "DISC-IB-MATURITY",
] as const);

/**
 * Frozen exclusion ids. Source of truth lives in
 * `src/data/exclusionRegistry.ts`. The report transforms `ex-*` →
 * `EXC-*` upper-case (see `getReportDefaultExclusions`).
 */
export const GOLDEN_MASTER_EXCLUSION_IDS = Object.freeze([
  "EXC-LOAD-FLOW",
  "EXC-SHORT-CIRCUIT",
  "EXC-PROTECTIONS-COORDINATION",
  "EXC-RMS-EMT-STABILITY",
  "EXC-HARMONICS",
  "EXC-GROUNDING-GRID",
  "EXC-GEOTECHNICAL-CIVIL",
  "EXC-HYDROLOGY-DRAINAGE",
  "EXC-DETAILED-FIRE-SAFETY",
  "EXC-ENVIRONMENTAL-PERMITTING",
  "EXC-DETAILED-INTERCONNECTION-HV",
  "EXC-ARC-FLASH",
  "EXC-INSULATION-COORDINATION",
  "EXC-POWER-QUALITY-PCC",
] as const);
