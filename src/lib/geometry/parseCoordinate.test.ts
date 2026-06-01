import { describe, expect, it } from "vitest";
import { parseLatLng } from "./parseCoordinate";

describe("parseLatLng", () => {
  it("parses a comma-separated lat, lng pair", () => {
    expect(parseLatLng("-33.45, -70.66")).toEqual({ lat: -33.45, lng: -70.66 });
  });

  it("accepts other separators (space, slash)", () => {
    expect(parseLatLng("-33.45 -70.66")).toEqual({ lat: -33.45, lng: -70.66 });
    expect(parseLatLng("-33.45/-70.66")).toEqual({ lat: -33.45, lng: -70.66 });
  });

  it("uses the first two numbers as lat then lng", () => {
    expect(parseLatLng("40, 5")).toEqual({ lat: 40, lng: 5 });
  });

  it("returns null when fewer than two numbers are present", () => {
    expect(parseLatLng("-33.45")).toBeNull();
    expect(parseLatLng("not numbers")).toBeNull();
    expect(parseLatLng("")).toBeNull();
  });

  it("rejects out-of-range latitude or longitude", () => {
    expect(parseLatLng("999, -70")).toBeNull();
    expect(parseLatLng("-33, 400")).toBeNull();
    expect(parseLatLng("200, 400")).toBeNull();
  });

  it("accepts boundary values", () => {
    expect(parseLatLng("-90, -180")).toEqual({ lat: -90, lng: -180 });
    expect(parseLatLng("90, 180")).toEqual({ lat: 90, lng: 180 });
  });
});
