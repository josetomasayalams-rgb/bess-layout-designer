/**
 * Resistencia al cortocircuito del cable MV — IEC 60364-5-54 / IEC 60949.
 *
 * ÉPICA 2 (blueprint ingeniería básica): añade la verificación adiabática de
 * cortocircuito (I²t) del conductor, derivada de la sección **documentada** de
 * datasheet y la constante de material `k` de norma. La corriente admisible de
 * la **pantalla** (screen) viene documentada directamente del datasheet.
 *
 * Es un valor de screening conceptual: la verificación real compara esta
 * admisible contra la corriente de falla prospectiva del estudio de
 * cortocircuito de la red (no modelada en esta herramienta).
 */

import { asDerived, asDocumented, type EvidencedValue } from "@/types/evidence";
import { MV_REFERENCE_CABLE_DOC_ID } from "@/lib/electrical/cableAmpacity";

/**
 * Constante de material `k` (A·s^½/mm²) para el cálculo adiabático
 * I·√t = k·S. IEC 60364-5-54 (Tabla 43A) / IEC 60949.
 */
export const SC_K_FACTOR = {
  /** Conductor aluminio, aislación XLPE/EPR (90 °C inicial → 250 °C final). */
  aluminiumXlpe: 94,
  /** Conductor cobre, aislación XLPE/EPR (90 °C → 250 °C). */
  copperXlpe: 143,
} as const;

/**
 * Parámetros documentados del cable de referencia
 * NEXANS NA2XS2Y 19/33 (36) kV, Al 630 mm².
 */
export const NEXANS_NA2XS2Y_630_SC = {
  sectionMm2: 630,
  /** Temperatura máxima de cortocircuito del conductor. */
  maxShortCircuitTempC: 250,
  /** Admisible de cortocircuito de la pantalla, 0,5 s (datasheet). */
  screenWithstandKa_0p5s: 4.5,
} as const;

/** Tiempo de despeje de referencia para la admisible del conductor (s). */
export const SC_REFERENCE_CLEARING_TIME_S = 1;

/**
 * Corriente de cortocircuito admisible (adiabática) del conductor, en A.
 * IEC 60949: I = k · S / √t, con S en mm² y t en s.
 */
export function conductorShortCircuitWithstandA(args: {
  sectionMm2: number;
  kFactor: number;
  clearingTimeS: number;
}): number {
  if (args.clearingTimeS <= 0) return 0;
  return (args.kFactor * args.sectionMm2) / Math.sqrt(args.clearingTimeS);
}

/**
 * Admisible del conductor de referencia (kA, 1 dp): k=94 (Al/XLPE) · 630 mm²
 * a t=1 s ≈ 59,2 kA. Verificado en `cableShortCircuit.test.ts`.
 */
export const MV_CABLE_SHORT_CIRCUIT_WITHSTAND_KA =
  Math.round(
    (conductorShortCircuitWithstandA({
      sectionMm2: NEXANS_NA2XS2Y_630_SC.sectionMm2,
      kFactor: SC_K_FACTOR.aluminiumXlpe,
      clearingTimeS: SC_REFERENCE_CLEARING_TIME_S,
    }) /
      1000) *
      10
  ) / 10; // = 59.2

/**
 * Valores evidenciados para la espina de trazabilidad / tablero de madurez.
 * Sección y admisible de pantalla son documentados (datasheet NEXANS); la
 * admisible del conductor es derivada (cálculo IEC 60949 sobre S documentada).
 */
export const mvCableShortCircuit: {
  screenWithstandKa: EvidencedValue<number>;
  conductorWithstandKa: EvidencedValue<number>;
} = {
  screenWithstandKa: asDocumented(
    NEXANS_NA2XS2Y_630_SC.screenWithstandKa_0p5s,
    {
      documentId: MV_REFERENCE_CABLE_DOC_ID,
      section: "Permissible short circuit current screen 0.5 s",
      note: "NA2XS2Y 19/33 kV Al 630 mm²: admisible de pantalla 4,5 kA / 0,5 s.",
    },
    "kA"
  ),
  conductorWithstandKa: asDerived(
    MV_CABLE_SHORT_CIRCUIT_WITHSTAND_KA,
    "IEC 60949: I=k·S/√t con k=94 (Al/XLPE, 90→250 °C, IEC 60364-5-54) y S=630 mm² (NEXANS-NA2XS2Y-19-33), t=1 s ≈ 59,2 kA. Screening; la verificación final compara contra la falla prospectiva del estudio de cortocircuito de la red.",
    "kA"
  ),
};
