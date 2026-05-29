/**
 * Numeric input parsing helpers.
 *
 * These keep UI numeric fields editable: while typing, a field can hold a
 * temporary empty/partial string without being coerced to 0. Conversion to a
 * real number happens on blur/submit/calculation via these helpers.
 */

/** Parse a finite number from a raw input string. Returns null when empty/invalid. */
export function parseFiniteNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse a strictly positive number. Returns null when empty/invalid/non-positive. */
export function parsePositiveNumber(value: string): number | null {
  const parsed = parseFiniteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

/** Parse a number within an inclusive range. Returns null when out of range/invalid. */
export function parseNumberInRange(
  value: string,
  min: number,
  max: number
): number | null {
  const parsed = parseFiniteNumber(value);
  if (parsed === null) return null;
  return parsed >= min && parsed <= max ? parsed : null;
}
