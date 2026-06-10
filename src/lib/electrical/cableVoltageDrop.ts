/**
 * Cálculo de caída de tensión en alimentador MV — IEC 60364.
 *
 * ÉPICA 2 (blueprint ingeniería básica): introduce el cálculo de caída de
 * tensión por tramo a partir de la resistencia y reactancia **documentadas**
 * de datasheet, reemplazando la ausencia de este cálculo (RULE-ELEC-009 solo
 * cubría pérdidas de PCS y transformador, no del cable MV).
 *
 * `feederVoltageDropPct` es la función reutilizable para el cálculo por-feeder
 * con la longitud real de la ruta. La constante derivada de referencia
 * (`MV_REFERENCE_VOLTAGE_DROP_PCT_PER_KM`) es un valor de screening conceptual
 * para el cable e instalación de referencia; NO sustituye un estudio de
 * caída de tensión/pérdidas de detalle.
 */

import { asDerived, asDocumented, type EvidencedValue } from "@/types/evidence";
import { MV_REFERENCE_CABLE_AMPACITY_A, MV_REFERENCE_CABLE_DOC_ID } from "@/lib/electrical/cableAmpacity";

/**
 * Parámetros eléctricos **documentados** del cable de referencia
 * NEXANS NA2XS2Y 19/33 (36) kV, Al 630 mm², formación trébol, 90 °C.
 * Fuente: datasheet NEXANS-NA2XS2Y-19-33.
 */
export const NEXANS_NA2XS2Y_630_TREFOIL = {
  /** Resistencia AC del conductor a 90 °C, trébol. */
  resistanceOhmPerKm: 0.064,
  /** Reactancia de fase 60 Hz, trébol. */
  reactanceOhmPerKm: 0.1215,
} as const;

/** Tensión MV de referencia del SC5000UD-MV (kV línea-línea). */
export const MV_REFERENCE_VOLTAGE_KV = 34.5;
/** Factor de potencia de referencia para el screening de caída de tensión. */
export const MV_REFERENCE_POWER_FACTOR = 0.95;

export type FeederVoltageDropInput = {
  /** Corriente de línea (A). */
  currentA: number;
  /** Longitud del tramo (m). */
  lengthM: number;
  /** Tensión nominal línea-línea (V). */
  voltageV: number;
  /** Factor de potencia (cos φ). */
  powerFactor: number;
  /** Resistencia del conductor (Ω/km). */
  resistanceOhmPerKm: number;
  /** Reactancia del conductor (Ω/km). */
  reactanceOhmPerKm: number;
};

/**
 * Caída de tensión trifásica como porcentaje de la tensión nominal.
 *
 * IEC 60364: ΔV = √3 · I · L · (R·cosφ + X·sinφ); ΔV% = 100 · ΔV / V_LL.
 * L en km (lengthM / 1000); R, X en Ω/km; V_LL en V.
 */
export function feederVoltageDropPct(input: FeederVoltageDropInput): number {
  const { currentA, lengthM, voltageV, powerFactor } = input;
  if (voltageV <= 0) return 0;
  const sinPhi = Math.sqrt(Math.max(0, 1 - powerFactor * powerFactor));
  const lengthKm = lengthM / 1000;
  const dropV =
    Math.sqrt(3) *
    currentA *
    lengthKm *
    (input.resistanceOhmPerKm * powerFactor + input.reactanceOhmPerKm * sinPhi);
  return (100 * dropV) / voltageV;
}

/**
 * Pérdida Joule (I²R) trifásica de un tramo de cable, en MW.
 *
 * P = 3 · I² · R · L, con R en Ω/km y L en km. Resultado en MW.
 * Es un cálculo de screening con la resistencia del cable de referencia; no
 * sustituye un estudio de pérdidas de detalle por alimentador.
 */
export function feederI2rLossMW(args: {
  currentA: number;
  lengthM: number;
  resistanceOhmPerKm: number;
}): number {
  const lengthKm = args.lengthM / 1000;
  const lossW = 3 * args.currentA * args.currentA * (args.resistanceOhmPerKm * lengthKm);
  return lossW / 1_000_000;
}

/**
 * Corriente de línea (A) de un alimentador trifásico a partir de su potencia
 * aparente (MVA) y tensión línea-línea (kV): I = S / (√3 · V).
 */
export function feederCurrentA(ratedPowerMVA: number, voltageKv: number): number {
  if (voltageKv <= 0) return 0;
  return (ratedPowerMVA * 1_000_000) / (Math.sqrt(3) * voltageKv * 1000);
}

/**
 * Caída de tensión de referencia por kilómetro (%/km) para el alimentador de
 * referencia: cable NEXANS NA2XS2Y 630 mm² trébol, a la ampacidad derivada
 * (462 A), tensión 34,5 kV, cos φ 0,95.
 *
 * ≈ 0,23 %/km — verificado en `cableVoltageDrop.test.ts`.
 */
export const MV_REFERENCE_VOLTAGE_DROP_PCT_PER_KM =
  Math.round(
    feederVoltageDropPct({
      currentA: MV_REFERENCE_CABLE_AMPACITY_A,
      lengthM: 1000,
      voltageV: MV_REFERENCE_VOLTAGE_KV * 1000,
      powerFactor: MV_REFERENCE_POWER_FACTOR,
      resistanceOhmPerKm: NEXANS_NA2XS2Y_630_TREFOIL.resistanceOhmPerKm,
      reactanceOhmPerKm: NEXANS_NA2XS2Y_630_TREFOIL.reactanceOhmPerKm,
    }) * 100
  ) / 100; // = 0.23

/**
 * Valores evidenciados para la espina de trazabilidad / tablero de madurez.
 * R y X son documentados (datasheet NEXANS); la caída de referencia es
 * derivada (cálculo IEC 60364 sobre R/X documentados).
 */
export const mvReferenceVoltageDrop: {
  resistanceOhmPerKm: EvidencedValue<number>;
  referenceDropPctPerKm: EvidencedValue<number>;
} = {
  resistanceOhmPerKm: asDocumented(
    NEXANS_NA2XS2Y_630_TREFOIL.resistanceOhmPerKm,
    {
      documentId: MV_REFERENCE_CABLE_DOC_ID,
      section: "A.C. conductor resistance at 90 °C — trefoil",
      note: "NA2XS2Y 19/33 kV Al 630 mm², trébol.",
    },
    "Ohm/km"
  ),
  referenceDropPctPerKm: asDerived(
    MV_REFERENCE_VOLTAGE_DROP_PCT_PER_KM,
    "IEC 60364: √3·I·L·(R·cosφ+X·sinφ)/V con R=0,064 Ω/km y X=0,1215 Ω/km (NEXANS-NA2XS2Y-19-33, trébol), I=462 A, V=34,5 kV, cosφ=0,95 ≈ 0,23 %/km. Screening conceptual; no sustituye estudio de detalle.",
    "%/km"
  ),
};
