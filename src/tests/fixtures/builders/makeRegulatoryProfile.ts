import type { RegulatoryRuleProfile } from "@/rules/types";

/**
 * Build a minimal regulatory profile for tests that exercise the
 * regulatory store / evaluator. Rule ids must exist in the real
 * `regulatoryRulesCatalog` if they will be evaluated — for store
 * lifecycle tests an empty `ruleIds` array is acceptable.
 */
export function makeRegulatoryProfile(
  overrides: Partial<RegulatoryRuleProfile> = {}
): RegulatoryRuleProfile {
  return {
    id: overrides.id ?? "chile-utility-predesign",
    name: overrides.name ?? "Test profile",
    description:
      overrides.description ??
      "Synthetic regulatory profile used by Phase 14 tests.",
    ruleIds: overrides.ruleIds ?? [],
  };
}
