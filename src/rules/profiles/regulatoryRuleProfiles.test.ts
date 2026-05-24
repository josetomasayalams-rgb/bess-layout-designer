import { describe, expect, it } from "vitest";
import { regulatoryRulesCatalog } from "@/rules/regulatoryRulesCatalog";
import {
  getRegulatoryRuleProfile,
  regulatoryRuleProfiles,
} from "@/rules/profiles/regulatoryRuleProfiles";

const ruleIds = new Set(regulatoryRulesCatalog.map((rule) => rule.id));

describe("regulatoryRuleProfiles", () => {
  it("defines the Phase 9 regulatory profiles", () => {
    expect(regulatoryRuleProfiles.map((profile) => profile.id)).toEqual([
      "chile-utility-predesign",
      "chile-pmgd-predesign",
      "bess-del-desierto-reference",
      "international-fire-reference",
    ]);
  });

  it("only references existing rules", () => {
    for (const profile of regulatoryRuleProfiles) {
      expect(profile.ruleIds.length).toBeGreaterThan(0);
      for (const ruleId of profile.ruleIds) {
        expect(ruleIds.has(ruleId), `${profile.id} -> ${ruleId}`).toBe(true);
      }
    }
  });

  it("exposes utility and PMGD profiles with distinct content", () => {
    const utility = getRegulatoryRuleProfile("chile-utility-predesign");
    const pmgd = getRegulatoryRuleProfile("chile-pmgd-predesign");

    expect(utility?.ruleIds).toContain("RULE-SEC-001");
    expect(utility?.ruleIds).toContain("RULE-CEN-002");
    expect(pmgd?.ruleIds).toContain("RULE-CEN-003");
  });

  it("keeps the fire profile limited to reference rules", () => {
    const fire = getRegulatoryRuleProfile("international-fire-reference");

    expect(fire?.ruleIds).toContain("RULE-FIRE-001");
    expect(fire?.description).toContain("not a Chilean legal approval");
  });
});
