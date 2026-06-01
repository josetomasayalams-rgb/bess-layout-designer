import { describe, it, expect } from "vitest";
import { computeSummary } from "./summaryCalculations";
import type { PlacedEquipment } from "@/types/equipment";

const makeBattery = (id: string): PlacedEquipment => ({
  id,
  equipmentSpecId: "sungrow-st2752ux-us",
  anchor: { lng: -70.5, lat: -33.5 },
  rotation_deg: 0,
  sourceReliability: "certified_data",
});

const makePcs = (id: string): PlacedEquipment => ({
  id,
  equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
  anchor: { lng: -70.5, lat: -33.5 },
  rotation_deg: 0,
  sourceReliability: "certified_data",
});

// Integrated AC unit (PCS/inverter inside the unit): the battery spec carries
// apparent power and there is no separate PCS/MV station. Tesla Megapack 2 XL
// 4h = 3.916 MWh / 0.979 MVA per unit.
const makeTeslaIntegrated = (id: string): PlacedEquipment => ({
  id,
  equipmentSpecId: "bess-tesla-megapack-2xl-4h",
  anchor: { lng: -70.5, lat: -33.5 },
  rotation_deg: 0,
  sourceReliability: "certified_data",
});

describe("computeSummary", () => {
  it("returns zeros for empty layout", () => {
    const s = computeSummary([], null);
    expect(s.battery_container_count).toBe(0);
    expect(s.pcs_count).toBe(0);
    expect(s.total_apparent_power_mva).toBe(0);
    expect(s.total_energy_mwh_dc_bol).toBe(0);
    expect(s.duration_hours_gross).toBeNull();
    expect(s.occupation_ratio).toBeNull();
  });

  it("counts batteries and pcs correctly", () => {
    const placed: PlacedEquipment[] = [
      makeBattery("b1"),
      makeBattery("b2"),
      makePcs("p1"),
    ];
    const s = computeSummary(placed, null);
    expect(s.battery_container_count).toBe(2);
    expect(s.pcs_count).toBe(1);
    expect(s.total_apparent_power_mva).toBe(5);
    expect(s.total_energy_mwh_dc_bol).toBeCloseTo(2 * 2.752, 6);
  });

  it("computes duration as energy / power", () => {
    const placed: PlacedEquipment[] = [
      ...Array.from({ length: 8 }, (_, i) => makeBattery(`b${i}`)),
      makePcs("p1"),
    ];
    const s = computeSummary(placed, null);
    const expected = (8 * 2.752) / 5;
    expect(s.duration_hours_gross).toBeCloseTo(expected, 6);
  });

  it("computes occupation ratio against site area", () => {
    const placed: PlacedEquipment[] = [makeBattery("b1")];
    const containerFootprint = 9.34 * 1.73;
    const site = { area_m2: 1000, area_ha: 0.1 };
    const s = computeSummary(placed, site);
    expect(s.occupied_area_m2).toBeCloseTo(containerFootprint, 6);
    expect(s.occupation_ratio).toBeCloseTo(containerFootprint / 1000, 6);
  });

  it("scales to 200 MW / 320 containers case from spec", () => {
    const placed: PlacedEquipment[] = [
      ...Array.from({ length: 320 }, (_, i) => makeBattery(`b${i}`)),
      ...Array.from({ length: 40 }, (_, i) => makePcs(`p${i}`)),
    ];
    const s = computeSummary(placed, null);
    expect(s.pcs_count).toBe(40);
    expect(s.battery_container_count).toBe(320);
    expect(s.total_apparent_power_mva).toBeCloseTo(200, 6);
    expect(s.total_energy_mwh_dc_bol).toBeCloseTo(880.64, 4);
    expect(s.duration_hours_gross).toBeCloseTo(4.4032, 4);
  });

  it("derives integrated power, energy and duration for a PCS-less Tesla layout", () => {
    const placed: PlacedEquipment[] = Array.from({ length: 3 }, (_, i) =>
      makeTeslaIntegrated(`t${i}`)
    );
    const s = computeSummary(placed, null);

    expect(s.pcs_count).toBe(0);
    expect(s.battery_container_count).toBe(3);
    expect(s.is_integrated_architecture).toBe(true);
    expect(s.integrated_unit_count).toBe(3);
    // Power comes from the integrated unit AC rating, not a separate PCS.
    expect(s.total_apparent_power_mva).toBeCloseTo(3 * 0.979, 6);
    expect(s.total_energy_mwh_dc_bol).toBeCloseTo(3 * 3.916, 6);
    expect(s.duration_hours_gross).toBeCloseTo((3 * 3.916) / (3 * 0.979), 6);
  });

  it("marks separate-PCS (Sungrow) layouts as non-integrated and leaves power unchanged", () => {
    const placed: PlacedEquipment[] = [
      makeBattery("b1"),
      makeBattery("b2"),
      makePcs("p1"),
    ];
    const s = computeSummary(placed, null);

    expect(s.is_integrated_architecture).toBe(false);
    expect(s.integrated_unit_count).toBe(0);
    // PCS-driven power is byte-identical to the pre-fix behaviour.
    expect(s.total_apparent_power_mva).toBe(5);
  });

  it("never flags integration for empty or battery-only Sungrow layouts", () => {
    expect(computeSummary([], null).is_integrated_architecture).toBe(false);

    // Sungrow containers carry no AC power → no false integrated detection.
    const batteriesOnly = computeSummary(
      [makeBattery("b1"), makeBattery("b2")],
      null
    );
    expect(batteriesOnly.is_integrated_architecture).toBe(false);
    expect(batteriesOnly.integrated_unit_count).toBe(0);
    expect(batteriesOnly.total_apparent_power_mva).toBe(0);
    expect(batteriesOnly.duration_hours_gross).toBeNull();
  });
});
