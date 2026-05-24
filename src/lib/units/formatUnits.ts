import { DEFAULT_UNIT_SYSTEM, type UnitSystemId } from "@/data/unitSystem";
import { kgToTonnes, m2ToHa } from "@/lib/units/conversions";
import type { Locale } from "@/lib/i18n";

export type UnitValue<TUnit extends string = string> = {
  value: number;
  unit: TUnit;
};

export type ClassifiedUnitValue<TUnit extends string = string> =
  UnitValue<TUnit> & {
    data_classification: "certified_data" | "preliminary_assumption" | "pending_validation";
    source_note?: string;
  };

type FormatOptions = {
  digits?: number;
  locale?: Locale;
  unitSystem?: UnitSystemId;
};

export function formatNumber(
  value: number,
  digits = 2,
  locale: Locale = "en"
): string {
  return value.toLocaleString(locale === "es" ? "es-CL" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function withUnit<TUnit extends string>(
  value: number,
  unit: TUnit
): UnitValue<TUnit> {
  return { value, unit };
}

export function formatUnitValue(
  quantity: UnitValue,
  options: FormatOptions = {}
): string {
  return `${formatNumber(quantity.value, options.digits ?? 2, options.locale)} ${quantity.unit}`;
}

export function formatLength(valueM: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueM, "m"), options);
}

export function formatAreaM2(valueM2: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueM2, "m²"), options);
}

export function formatAreaHa(valueM2: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(m2ToHa(valueM2), "ha"), options);
}

export function formatAreaDual(valueM2: number, options: FormatOptions = {}): string {
  const locale = options.locale;
  const unitSystem = options.unitSystem;
  return `${formatAreaM2(valueM2, {
    digits: options.digits ?? 0,
    locale,
    unitSystem,
  })} / ${formatAreaHa(valueM2, { digits: 2, locale, unitSystem })}`;
}

export function formatPowerMW(valueMw: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueMw, "MW"), options);
}

export function formatApparentPowerMva(
  valueMva: number,
  options: FormatOptions = {}
): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueMva, "MVA"), options);
}

export function formatEnergyMWh(valueMwh: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueMwh, "MWh"), options);
}

export function formatVoltageKv(valueKv: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueKv, "kV"), options);
}

export function formatVoltageV(valueV: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueV, "V"), options);
}

export function formatFrequencyHz(valueHz: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueHz, "Hz"), options);
}

export function formatMassKg(valueKg: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueKg, "kg"), options);
}

export function formatMassTonnes(valueKg: number, options: FormatOptions = {}): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(kgToTonnes(valueKg), "t"), options);
}

export function formatTemperatureC(
  valueC: number,
  options: FormatOptions = {}
): string {
  assertMetric(options.unitSystem);
  return formatUnitValue(withUnit(valueC, "°C"), options);
}

export function formatPercentage(
  value: number,
  options: FormatOptions = {}
): string {
  const percent = options.digits === undefined ? value : Number(value);
  return `${formatNumber(percent, options.digits ?? 1, options.locale)} %`;
}

export function formatRatioAsPercentage(
  ratio: number,
  options: FormatOptions = {}
): string {
  return formatPercentage(ratio * 100, options);
}

function assertMetric(unitSystem: UnitSystemId = DEFAULT_UNIT_SYSTEM): void {
  if (unitSystem !== "metric_si") {
    throw new Error(`Unsupported unit system: ${unitSystem}`);
  }
}
