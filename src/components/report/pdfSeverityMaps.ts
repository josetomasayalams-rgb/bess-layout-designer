import { reportStyles as s } from "./reportStyles";

export const SEVERITY_PILL: Record<string, keyof typeof s> = {
  blocking: "pillViolation",
  warning: "pillManual",
  info: "pillPending",
  checklist: "pillManual",
  out_of_scope: "pillOut",
};

export const OUTCOME_LABEL: Record<string, { label: string; style: keyof typeof s }> = {
  pass: { label: "Sin inconformidades", style: "pillPass" },
  violation: { label: "Inconformidad", style: "pillViolation" },
  manual_check: { label: "Revisión", style: "pillManual" },
  pending_validation: { label: "Pendiente", style: "pillPending" },
  not_evaluable: { label: "No evaluable", style: "pillOut" },
  out_of_scope: { label: "Fuera de alcance", style: "pillOut" },
};

/** Spanish, lower-noise labels for effective severity codes shown in tables. */
export const SEVERITY_LABEL_ES: Record<string, string> = {
  blocking: "Bloqueante",
  warning: "Aviso",
  info: "Informativa",
  checklist: "Lista de verificación",
  out_of_scope: "Fuera",
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
