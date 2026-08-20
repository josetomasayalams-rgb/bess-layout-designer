import { reportStyles as s } from "./reportStyles";

/**
 * Severity / outcome -> pill style. Consolidated onto the Apple tone set: a
 * single red for genuinely critical states, the accent for active emphasis, and
 * neutral grey for everything else. Pills are flat (transparent fill); meaning
 * comes from text color + a hairline border, not a saturated background.
 */
export const SEVERITY_PILL: Record<string, keyof typeof s> = {
  blocking: "pillCriticalTone",
  warning: "pillNeutral",
  info: "pillNeutral",
  checklist: "pillNeutral",
  out_of_scope: "pillNeutral",
};

export const OUTCOME_LABEL: Record<string, { label: string; style: keyof typeof s }> = {
  pass: { label: "Sin inconformidades", style: "pillPass" },
  violation: { label: "Inconformidad", style: "pillCriticalTone" },
  manual_check: { label: "Revisión", style: "pillNeutral" },
  pending_validation: { label: "Pendiente", style: "pillNeutral" },
  not_evaluable: { label: "No evaluable", style: "pillNeutral" },
  out_of_scope: { label: "Fuera de alcance", style: "pillNeutral" },
};

/** Spanish, lower-noise labels for effective severity codes shown in tables. */
export const SEVERITY_LABEL: Record<string, string> = {
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
    case "pillCriticalTone":
      return s.pillCriticalTone;
    case "pillAccent":
      return s.pillAccent;
    case "pillNeutral":
    default:
      return s.pillNeutral;
  }
}
