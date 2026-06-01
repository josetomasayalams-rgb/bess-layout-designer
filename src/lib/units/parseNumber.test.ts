import { describe, expect, it } from "vitest";
import {
  parseFiniteNumber,
  parsePositiveNumber,
  parseNumberInRange,
} from "./parseNumber";

describe("parseFiniteNumber", () => {
  it("returns null for an empty or whitespace string (no 0 coercion)", () => {
    expect(parseFiniteNumber("")).toBeNull();
    expect(parseFiniteNumber("   ")).toBeNull();
  });

  it("parses plain integers and decimals", () => {
    expect(parseFiniteNumber("1")).toBe(1);
    expect(parseFiniteNumber("15")).toBe(15);
    expect(parseFiniteNumber("3.5")).toBe(3.5);
  });

  it("accepts comma as a decimal separator", () => {
    expect(parseFiniteNumber("3,5")).toBe(3.5);
  });

  it("returns null for non-numeric input", () => {
    expect(parseFiniteNumber("abc")).toBeNull();
    expect(parseFiniteNumber("1.2.3")).toBeNull();
  });

  it("allows zero and negatives", () => {
    expect(parseFiniteNumber("0")).toBe(0);
    expect(parseFiniteNumber("-5")).toBe(-5);
  });
});

describe("parsePositiveNumber", () => {
  it("returns null for empty, zero, or negative", () => {
    expect(parsePositiveNumber("")).toBeNull();
    expect(parsePositiveNumber("0")).toBeNull();
    expect(parsePositiveNumber("-2")).toBeNull();
  });

  it("returns the value for positive numbers", () => {
    expect(parsePositiveNumber("1")).toBe(1);
    expect(parsePositiveNumber("12,5")).toBe(12.5);
  });
});

describe("parseNumberInRange", () => {
  it("accepts values within the inclusive range", () => {
    expect(parseNumberInRange("0", -90, 90)).toBe(0);
    expect(parseNumberInRange("-90", -90, 90)).toBe(-90);
    expect(parseNumberInRange("180", -180, 180)).toBe(180);
  });

  it("rejects values out of range", () => {
    expect(parseNumberInRange("91", -90, 90)).toBeNull();
    expect(parseNumberInRange("-181", -180, 180)).toBeNull();
  });

  it("rejects empty/invalid input", () => {
    expect(parseNumberInRange("", -90, 90)).toBeNull();
    expect(parseNumberInRange("abc", -90, 90)).toBeNull();
  });
});
