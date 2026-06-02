import { describe, expect, it } from "vitest";
import {
  BESS_DEL_DESIERTO_CASE_STUDY_ID,
  resolveReportPendingData,
} from "./resolveReportPendingData";
import { bessDelDesiertoPendingDataV12 } from "@/data/projectCaseStudies";
import type { PendingDataItem } from "@/types/technical";

const delDesiertoIds = new Set(bessDelDesiertoPendingDataV12.map((p) => p.id));

const fakePending: PendingDataItem[] = [
  {
    id: "fake-pending-1",
    topic: "Generic pending item",
    reason: "Some project-specific gap",
    priority: "important",
    suggestedSource: "Project EPC",
  } as PendingDataItem,
];

describe("resolveReportPendingData", () => {
  it("returns the del Desierto V12 pending set only when that case study is selected", () => {
    const result = resolveReportPendingData(
      BESS_DEL_DESIERTO_CASE_STUDY_ID,
      null
    );
    expect(result).toBe(bessDelDesiertoPendingDataV12);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns no pending data for a project with no selected case study", () => {
    expect(resolveReportPendingData(null, null)).toEqual([]);
    expect(resolveReportPendingData(undefined, null)).toEqual([]);
  });

  it("does NOT leak del Desierto / Sungrow pending data into a non-case-study project", () => {
    // Even with a case study object present, a non-del-Desierto id must not
    // pull in the del Desierto V12 set.
    const result = resolveReportPendingData(null, { pendingData: fakePending });
    const leaked = result.filter((p) => delDesiertoIds.has(p.id));
    expect(leaked).toEqual([]);
  });

  it("uses another case study's own pendingData, never the del Desierto set", () => {
    const result = resolveReportPendingData("some-other-case", {
      pendingData: fakePending,
    });
    expect(result).toBe(fakePending);
    expect(result.some((p) => delDesiertoIds.has(p.id))).toBe(false);
  });

  it("returns empty when a non-del-Desierto case study has no pendingData", () => {
    expect(resolveReportPendingData("some-other-case", { pendingData: undefined as unknown as PendingDataItem[] })).toEqual([]);
    expect(resolveReportPendingData("some-other-case", null)).toEqual([]);
  });
});
