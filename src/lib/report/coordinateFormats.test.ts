import { describe, it, expect } from "vitest";
import {
  formatCoordinatesBundle,
  formatDMS,
  formatDecimal,
  formatUTM,
  toUTM,
} from "./coordinateFormats";

describe("formatDecimal", () => {
  it("default 6 digit precision", () => {
    expect(
      formatDecimal({ lng: -70.6483, lat: -33.4569 }).lat
    ).toBe("-33.456900");
  });
});

describe("formatDMS — Santiago (-33.4569, -70.6483)", () => {
  const s = formatDMS({ lat: -33.4569, lng: -70.6483 });
  it("south hemisphere", () => {
    expect(s.latParts.hemisphere).toBe("S");
    expect(s.lngParts.hemisphere).toBe("W");
  });
  it("string format", () => {
    expect(s.lat).toMatch(/33°/);
    expect(s.lat).toMatch(/S$/);
    expect(s.lng).toMatch(/70°/);
    expect(s.lng).toMatch(/W$/);
  });
});

describe("formatDMS — Bogotá (4.711, -74.072)", () => {
  it("north hemisphere", () => {
    const dms = formatDMS({ lat: 4.711, lng: -74.072 });
    expect(dms.latParts.hemisphere).toBe("N");
    expect(dms.lngParts.hemisphere).toBe("W");
  });
});

describe("formatDMS — seconds rounding carry", () => {
  // lat where seconds compute to ~59.999": must carry to the next minute
  // instead of rendering an invalid 60.00".
  const coord = { lat: 33 + 27 / 60 + 59.999 / 3600, lng: 10 };
  it("never renders 60 seconds at the shown precision", () => {
    const dms = formatDMS(coord);
    expect(dms.lat).not.toMatch(/60\.00"/);
    expect(dms.lat).not.toMatch(/'60'/);
  });
  it("carries the overflow into the minutes field", () => {
    const dms = formatDMS(coord);
    expect(dms.latParts.seconds).toBeLessThan(60);
    expect(dms.latParts.minutes).toBe(28);
    expect(dms.latParts.degrees).toBe(33);
  });
  it("carries minutes into degrees when seconds and minutes both overflow", () => {
    // 33°59'59.999" → 34°00'00"
    const dms = formatDMS({ lat: 33 + 59 / 60 + 59.999 / 3600, lng: 10 });
    expect(dms.latParts.degrees).toBe(34);
    expect(dms.latParts.minutes).toBe(0);
    expect(dms.latParts.seconds).toBe(0);
  });
});

describe("toUTM — Santiago (-33.4569, -70.6483)", () => {
  const utm = toUTM({ lat: -33.4569, lng: -70.6483 });

  it("is zone 19", () => {
    expect(utm.zone).toBe(19);
  });

  it("south hemisphere with band H or J", () => {
    expect(utm.hemisphere).toBe("S");
    expect(["H", "J"]).toContain(utm.band);
  });

  it("easting in the 5xx,xxx mE range", () => {
    expect(utm.easting).toBeGreaterThan(300000);
    expect(utm.easting).toBeLessThan(700000);
  });

  it("northing is in the southern false-northing range", () => {
    expect(utm.northing).toBeGreaterThan(6000000);
    expect(utm.northing).toBeLessThan(7000000);
  });
});

describe("toUTM — northern hemisphere", () => {
  it("New York (40.7128, -74.0060) is zone 18T or 18N region", () => {
    const utm = toUTM({ lat: 40.7128, lng: -74.0060 });
    expect(utm.zone).toBe(18);
    expect(utm.hemisphere).toBe("N");
    expect(utm.northing).toBeLessThan(5000000);
  });
});

describe("formatUTM string", () => {
  it("matches Z<n><band> <easting> mE <northing> mN", () => {
    const s = formatUTM({ lat: -33.4569, lng: -70.6483 });
    expect(s).toMatch(/^\d+[A-Z]\s+\d+\s+mE\s+\d+\s+mN$/);
  });
});

describe("formatCoordinatesBundle", () => {
  it("returns all three formats", () => {
    const b = formatCoordinatesBundle({ lat: -33.4569, lng: -70.6483 });
    expect(b.decimal.lat).toBeDefined();
    expect(b.dms.lat).toMatch(/S$/);
    expect(b.utm.zone).toBe(19);
    expect(b.utm.formatted).toContain("mE");
  });
});

describe("edge cases", () => {
  it("equator + greenwich (0,0) UTM zone 31N", () => {
    const utm = toUTM({ lat: 0, lng: 0 });
    expect(utm.zone).toBe(31);
    expect(utm.hemisphere).toBe("N");
  });

  it("zone boundary just east of 180° wraps to zone 1", () => {
    // lng = -180 → zone 1
    const utm = toUTM({ lat: 0, lng: -180 });
    expect(utm.zone).toBe(1);
  });
});
