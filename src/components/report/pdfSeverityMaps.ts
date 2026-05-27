import { reportStyles as s } from "./reportStyles";

export const SEVERITY_PILL: Record<string, keyof typeof s> = {
  blocking: "pillViolation",
  warning: "pillManual",
  info: "pillPending",
  checklist: "pillManual",
  out_of_scope: "pillOut",
};

export const OUTCOME_LABEL: Record<string, { label: string; style: keyof typeof s }> = {
  pass: { label: "PASS", style: "pillPass" },
  violation: { label: "VIOLATION", style: "pillViolation" },
  manual_check: { label: "MANUAL", style: "pillManual" },
  pending_validation: { label: "PENDING", style: "pillPending" },
  not_evaluable: { label: "N/A", style: "pillOut" },
  out_of_scope: { label: "OUT", style: "pillOut" },
};

export function outcomePillStyle(style: keyof typeof s) {
  switch (style) {
    case "pillPass":
      return s.pillPass;
    case "pillViolation":
      return s.pillViolation;
    case "pillManual":
      return s.pillManual;
    case "pillPending":
      return s.pillPending;
    case "pillOut":
    default:
      return s.pillOut;
  }
}
