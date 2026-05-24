import { describe, expect, it } from "vitest";
import { bessDelDesiertoCaseStudy } from "@/data/projectCaseStudies";
import { generateCaseStudyConceptualLayout } from "@/lib/layout/caseStudyLayoutGenerator";

describe("generateCaseStudyConceptualLayout", () => {
  it("creates one conceptual MV center plus eight BESS containers per block", () => {
    const placed = generateCaseStudyConceptualLayout(
      bessDelDesiertoCaseStudy,
      { lng0: -69.5, lat0: -22.3 },
      { startPoint: { lng: -69.5, lat: -22.3 } }
    );

    const bess = placed.filter(
      (item) => item.equipmentSpecId === "bess-sungrow-st2752ux-us"
    );
    const centers = placed.filter(
      (item) => item.equipmentSpecId === "mvskid-sungrow-sc5000ud-mv-desierto"
    );
    const groupIds = new Set(placed.map((item) => item.groupId));

    expect(placed).toHaveLength(360);
    expect(bess).toHaveLength(320);
    expect(centers).toHaveLength(40);
    expect(groupIds.size).toBe(40);
    expect([...groupIds].every((id) => id?.startsWith("bess-del-desierto:"))).toBe(
      true
    );
  });
});
