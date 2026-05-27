import type { BuildReportDataArgs } from "@/lib/report/buildReportData";
import { makeAnchor } from "./makeAnchor";
import { makePolygon } from "./makePolygon";

/**
 * Build a valid minimal `BuildReportDataArgs` for the report pipeline.
 *
 * Returns the smallest input set that produces a valid
 * `TechnicalReportData` from `buildReportData()` without requiring any
 * stored electrical architecture, equipment, regulatory evaluation, or
 * map capture.
 *
 * Useful for snapshot and structural tests of the report.
 */
export function makeBuildReportDataArgs(
  overrides: Partial<BuildReportDataArgs> = {}
): BuildReportDataArgs {
  return {
    projectName: overrides.projectName ?? "Phase 14 fixture project",
    appVersion: overrides.appVersion ?? "test-1.0.0",
    locale: overrides.locale ?? "es",
    polygon: overrides.polygon ?? makePolygon(),
    anchor: overrides.anchor ?? makeAnchor(),
    placed: overrides.placed ?? [],
    designTargets: overrides.designTargets ?? {},
    blocks: overrides.blocks ?? [],
    conversionStations: overrides.conversionStations ?? [],
    mvFeeders: overrides.mvFeeders ?? [],
    mvBuses: overrides.mvBuses ?? [],
    poi: overrides.poi ?? null,
    mainTransformer: overrides.mainTransformer ?? null,
    auxiliaryServices: overrides.auxiliaryServices ?? null,
    ppc: overrides.ppc ?? null,
    operationalLimits: overrides.operationalLimits ?? null,
    lossEstimates: overrides.lossEstimates ?? [],
    assumptions: overrides.assumptions ?? [],
    inconsistencies: overrides.inconsistencies ?? [],
    pendingData: overrides.pendingData ?? [],
    regulatoryEvaluation: overrides.regulatoryEvaluation ?? null,
    caseStudy: overrides.caseStudy ?? null,
    mapCapture: overrides.mapCapture ?? null,
    geocode: overrides.geocode ?? null,
  };
}
