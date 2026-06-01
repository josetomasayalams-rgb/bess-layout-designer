"use client";

import { useState } from "react";
import { parseFiniteNumber } from "@/lib/units/parseNumber";

interface NumberFieldProps {
  /** Committed numeric value owned by the parent. */
  value: number;
  /** Called with a parsed finite number while editing (never coerces empty to 0). */
  onChange: (value: number) => void;
  /** Called on blur with the clamped/rounded final value (optional). */
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Round to an integer on blur. */
  integer?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

/**
 * Controlled numeric input that stays naturally editable.
 *
 * While the user edits, the field keeps a raw string draft so that clearing
 * the value shows an empty field (not "0") and typing "1" yields "1" (not
 * "01"). The parsed number is propagated via `onChange` only when valid; on
 * blur the draft is cleared and the value is clamped/rounded.
 */
export function NumberField({
  value,
  onChange,
  onCommit,
  min,
  max,
  step,
  integer,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const displayValue = draft !== null ? draft : String(value);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const parsed = parseFiniteNumber(raw);
    if (parsed !== null) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseFiniteNumber(draft ?? String(value));
    let next = parsed ?? value;
    if (integer) next = Math.round(next);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setDraft(null);
    onChange(next);
    onCommit?.(next);
  };

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={displayValue}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
      className={className}
    />
  );
}
