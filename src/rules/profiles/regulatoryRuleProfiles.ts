import { regulatoryRulesCatalog } from "@/rules/regulatoryRulesCatalog";
import type { RegulatoryRuleProfile, RegulatoryRuleProfileId } from "@/rules/types";

function ruleIdsForProfile(profileId: RegulatoryRuleProfileId): string[] {
  return regulatoryRulesCatalog
    .filter((rule) => rule.appliesToProfiles.includes(profileId))
    .map((rule) => rule.id);
}

export const regulatoryRuleProfiles: readonly RegulatoryRuleProfile[] = [
  {
    id: "chile-utility-predesign",
    name: "Chile utility-scale BESS predesign",
    description:
      "Candidate rule set for utility-scale Chilean BESS predesign. Rules are not legal certification and remain pending validation unless explicitly implemented.",
    ruleIds: ruleIdsForProfile("chile-utility-predesign"),
  },
  {
    id: "chile-pmgd-predesign",
    name: "Chile PMGD BESS predesign",
    description:
      "Candidate PMGD-oriented checklist. It adds PMGD interconnection items while preserving preliminary BESS layout checks.",
    ruleIds: ruleIdsForProfile("chile-pmgd-predesign"),
  },
  {
    id: "bess-del-desierto-reference",
    name: "BESS del Desierto reference architecture",
    description:
      "Case-study profile for the 200 MW / 800 MWh BESS del Desierto reference architecture.",
    ruleIds: ruleIdsForProfile("bess-del-desierto-reference"),
  },
  {
    id: "international-fire-reference",
    name: "International fire reference",
    description:
      "Reference-only fire safety checklist based on NFPA/UL context. It is not a Chilean legal approval path.",
    ruleIds: ruleIdsForProfile("international-fire-reference"),
  },
];

export function getRegulatoryRuleProfile(
  id: RegulatoryRuleProfileId
): RegulatoryRuleProfile | undefined {
  return regulatoryRuleProfiles.find((profile) => profile.id === id);
}
