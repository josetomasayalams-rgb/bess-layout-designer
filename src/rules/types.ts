import type { EvidenceRef } from "@/types/evidence";

export type RuleSeverity =
  | "blocking"
  | "warning"
  | "info"
  | "checklist"
  | "out_of_scope";

export type RuleCategory =
  | "physical_layout"
  | "electrical"
  | "regulatory_sec"
  | "regulatory_cne_cen"
  | "regulatory_territorial"
  | "regulatory_environmental"
  | "regulatory_fire_safety"
  | "engineering_detail"
  | "manufacturerSpecificRules";

export type RuleStatus =
  | "candidate"
  | "pending_validation"
  | "manual_check"
  | "implemented"
  | "not_automatable"
  | "out_of_scope";

export type RuleAutomation = "yes" | "partial" | "no";

export type RulePriority = "P1" | "P2" | "P3" | "P4";

export type RegulatoryRuleDefinition = {
  id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  title: string;
  description: string;
  appParameter?: string;
  automation: RuleAutomation;
  status: RuleStatus;
  priority: RulePriority;
  evidence: EvidenceRef[];
  notes?: string;
  appliesToProfiles: string[];
  simpleTitle?: { es: string; en: string };
  diagnostic?: { es: string; en: string };
  diagnosticImpact?: { es: string; en: string };
  diagnosticAction?: { es: string; en: string };
  riskLevel?: "critical" | "important" | "om_insurance" | "engineering_pending" | "info";
};

export type RegulatoryRuleProfileId =
  | "chile-utility-predesign"
  | "chile-pmgd-predesign"
  | "bess-del-desierto-reference"
  | "international-fire-reference";

export type RegulatoryRuleProfile = {
  id: RegulatoryRuleProfileId;
  name: string;
  description: string;
  ruleIds: string[];
};

export type RuleViolation = {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  affectedEntityIds?: string[];
  remediation?: string;
};
