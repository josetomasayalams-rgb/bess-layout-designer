/**
 * Resolves the `pendingData` list that a technical report should carry.
 *
 * Case-study-specific pending data must NEVER leak into unrelated projects.
 * The BESS del Desierto V1.2 pending-data set (`bessDelDesiertoPendingDataV12`)
 * names that project's specific equipment (e.g. Sungrow models) and documented
 * gaps, so it may only appear when the BESS del Desierto case study is the one
 * actually selected. Any other selected case study contributes its own
 * `pendingData`; a project with no selected case study gets none.
 *
 * Pure and framework-agnostic so both report entry points (the PDF export in
 * `downloadTechnicalReport` and the in-app `ReportPreview`) share one
 * implementation and cannot drift.
 */
import { bessDelDesiertoPendingDataV12 } from "@/data/projectCaseStudies";
import type { PendingDataItem, ProjectCaseStudy } from "@/types/technical";

/** Canonical id of the BESS del Desierto case study (see `bessDelDesierto.ts`). */
export const BESS_DEL_DESIERTO_CASE_STUDY_ID = "bess-del-desierto";

export function resolveReportPendingData(
  selectedCaseStudyId: string | null | undefined,
  caseStudy: Pick<ProjectCaseStudy, "pendingData"> | null | undefined
): PendingDataItem[] {
  if (selectedCaseStudyId === BESS_DEL_DESIERTO_CASE_STUDY_ID) {
    return bessDelDesiertoPendingDataV12;
  }
  return caseStudy?.pendingData ?? [];
}
