/**
 * Cálculo de ampacidad de cable MV — derating IEC 60287.
 *
 * ÉPICA 2 (blueprint ingeniería básica): reemplaza la ampacidad de referencia
 * MV que antes era un `preliminary_assumption` de 460 A por un valor
 * **derivado** (`derived`) a partir de una ampacidad base **documentada** de
 * datasheet y factores de corrección estándar IEC 60287.
 *
 * Esto es un valor de *screening* conceptual, no un cálculo de ingeniería de
 * detalle: la ampacidad final del proyecto depende del cable elegido, el
 * método de instalación real, el agrupamiento exacto, la resistividad térmica
 * del suelo y la temperatura ambiente del sitio. La función
 * `deriveCorrectedAmpacity` es reutilizable para ese cálculo por-cable futuro.
 */

import { asDerived, asDocumented, type EvidencedValue } from "@/types/evidence";

/**
 * Ampacidades base **documentadas** del cable de referencia
 * NEXANS NA2XS2Y 19/33 (36) kV, conductor Al 630 mm².
 *
 * Fuente: datasheet NEXANS-NA2XS2Y-19-33 (cálculo según IEC 60502-2 /
 * ABNT NBR 14039). Condiciones de tabla: conductor 90 °C, aire 30 °C,
 * suelo 20 °C, profundidad 0,9 m, resistividad térmica del suelo 1,5 K·m/W,
 * formación trébol.
 */
export const NEXANS_NA2XS2Y_630_BASE_A = {
  /** En aire, 30 °C, trébol. */
  inAirTrefoil30C: 845,
  /** Enterrado directo, 20 °C, trébol. */
  buriedDirectTrefoil20C: 577,
  /** Enterrado en ducto, 20 °C, trébol. */
  buriedDuctTrefoil20C: 450,
} as const;

/** Documento de respaldo de la ampacidad base. */
export const MV_REFERENCE_CABLE_DOC_ID = "NEXANS-NA2XS2Y-19-33";

/**
 * Factores de corrección (derating) IEC 60287. Cada factor es ≤ 1 y reduce
 * la ampacidad base según la desviación respecto de las condiciones de tabla.
 */
export type AmpacityDeratingFactors = {
  /** Corrección por temperatura ambiente/suelo respecto de la de tabla. */
  ambient: number;
  /** Corrección por agrupamiento de circuitos (proximidad térmica). */
  grouping: number;
  /** Corrección por resistividad térmica del suelo (instalación enterrada). */
  soil: number;
};

/**
 * Ampacidad corregida = ampacidad base × producto de factores de derating.
 * (IEC 60287: I_z = I_base · k_ambient · k_grouping · k_soil).
 */
export function deriveCorrectedAmpacity(
  baseAmpacityA: number,
  factors: AmpacityDeratingFactors
): number {
  return baseAmpacityA * factors.ambient * factors.grouping * factors.soil;
}

/**
 * Escenario de referencia para el screening conceptual MV: cable enterrado
 * directo en trébol (la instalación típica de un alimentador MV en sitio
 * BESS), con un factor de agrupamiento conservador para 2–3 circuitos en
 * proximidad. Ambiente y suelo ya están en las condiciones de tabla del
 * datasheet, por lo que sus factores son 1,0.
 */
export const MV_REFERENCE_DERATING: AmpacityDeratingFactors = {
  ambient: 1.0,
  grouping: 0.8, // 2–3 circuitos en proximidad (IEC 60287-2-1 / IEC 60364-5-52)
  soil: 1.0,
};

/**
 * Ampacidad de referencia MV **derivada** (redondeada al entero más cercano).
 * 577 A (base enterrada trébol, NEXANS) × 0,80 (agrupamiento) ≈ 462 A.
 *
 * Verificado en `cableAmpacity.test.ts` contra `deriveCorrectedAmpacity`.
 */
export const MV_REFERENCE_CABLE_AMPACITY_A = Math.round(
  deriveCorrectedAmpacity(
    NEXANS_NA2XS2Y_630_BASE_A.buriedDirectTrefoil20C,
    MV_REFERENCE_DERATING
  )
); // = 462

/**
 * Valores evidenciados para la espina de trazabilidad / tablero de madurez.
 * `baseAmpacityA` es documentado (datasheet NEXANS); `referenceAmpacityA` es
 * derivado (cálculo IEC 60287 sobre la base documentada).
 */
export const mvReferenceCableAmpacity: {
  baseAmpacityA: EvidencedValue<number>;
  referenceAmpacityA: EvidencedValue<number>;
} = {
  baseAmpacityA: asDocumented(
    NEXANS_NA2XS2Y_630_BASE_A.buriedDirectTrefoil20C,
    {
      documentId: MV_REFERENCE_CABLE_DOC_ID,
      section:
        "Permissible current rating buried 20°C — trefoil (IEC 60502-2 / ABNT NBR 14039)",
      note: "Cable Al 630 mm² 19/33 kV, enterrado directo, trébol, suelo 1,5 K·m/W.",
    },
    "A"
  ),
  referenceAmpacityA: asDerived(
    MV_REFERENCE_CABLE_AMPACITY_A,
    "IEC 60287: base 577 A (NEXANS-NA2XS2Y-19-33, enterrado trébol) × agrupamiento 0,80 ≈ 462 A. Screening conceptual; ampacidad final depende del cable e instalación reales.",
    "A"
  ),
};
