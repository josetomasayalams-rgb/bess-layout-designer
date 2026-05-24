import { describe, it, expect } from "vitest";
import {
  computeArchitectureSizing,
  containersForTargetEnergy,
  DEFAULT_CONTAINER_ENERGY_MWH,
  DEFAULT_CONTAINERS_PER_STATION,
  DEFAULT_STATION_POWER_MVA,
  DEFAULT_STATIONS_PER_FEEDER,
  DEFAULT_USABLE_FACTOR,
  durationHours,
  feedersForStations,
  stationsForContainers,
  stationsForPower,
} from "./architectureSizing";

describe("unit helpers", () => {
  it("containersForTargetEnergy rounds up", () => {
    // 1 MWh usable, container 2.752 × usableFactor ≈ 2.5 usable
    const n = containersForTargetEnergy(1, 2.752512, 0.9083);
    expect(n).toBe(1);
  });

  it("containersForTargetEnergy zero target → zero", () => {
    expect(containersForTargetEnergy(0, 2.752, 0.9)).toBe(0);
    expect(containersForTargetEnergy(-1, 2.752, 0.9)).toBe(0);
  });

  it("containersForTargetEnergy throws on invalid container energy", () => {
    expect(() => containersForTargetEnergy(10, 0, 0.9)).toThrow();
  });

  it("containersForTargetEnergy throws on invalid usableFactor", () => {
    expect(() => containersForTargetEnergy(10, 2.752, 0)).toThrow();
    expect(() => containersForTargetEnergy(10, 2.752, 1.1)).toThrow();
  });

  it("stationsForContainers rounds up", () => {
    expect(stationsForContainers(0, 8)).toBe(0);
    expect(stationsForContainers(1, 8)).toBe(1);
    expect(stationsForContainers(8, 8)).toBe(1);
    expect(stationsForContainers(9, 8)).toBe(2);
    expect(stationsForContainers(320, 8)).toBe(40);
  });

  it("stationsForPower rounds up", () => {
    expect(stationsForPower(0, 5)).toBe(0);
    expect(stationsForPower(5, 5)).toBe(1);
    expect(stationsForPower(6, 5)).toBe(2);
    expect(stationsForPower(200, 5)).toBe(40);
  });

  it("feedersForStations rounds up", () => {
    expect(feedersForStations(40, 4)).toBe(10);
    expect(feedersForStations(5, 4)).toBe(2);
    expect(feedersForStations(0, 4)).toBe(0);
  });

  it("durationHours returns Infinity when power is zero", () => {
    expect(durationHours(100, 0)).toBe(Infinity);
  });
});

describe("computeArchitectureSizing — BESS del Desierto (200 MW / 800 MWh)", () => {
  const result = computeArchitectureSizing({
    targetPowerMW: 200,
    targetUsableEnergyMWh: 800,
  });

  it("computes exactly 320 containers", () => {
    expect(result.containers).toBe(320);
  });

  it("computes exactly 40 stations", () => {
    expect(result.stations).toBe(40);
  });

  it("computes exactly 10 feeders", () => {
    expect(result.feeders).toBe(10);
  });

  it("gross energy is 880.80384 MWh", () => {
    expect(result.grossEnergyMWh).toBeCloseTo(880.80384, 5);
  });

  it("usable energy reproduces commercial (≈ 800 MWh)", () => {
    // 880.80384 × (800/880.80384) = 800
    expect(result.usableEnergyMWh).toBeCloseTo(800, 5);
  });

  it("installed power is 200 MVA", () => {
    expect(result.installedPowerMVA).toBe(200);
  });

  it("commercial duration = 4 h", () => {
    expect(result.durationHoursCommercial).toBe(4);
  });

  it("gross duration = 4.404 h", () => {
    expect(result.durationHoursFromGross).toBeCloseTo(4.404, 3);
  });
});

describe("computeArchitectureSizing — PMGD-like (9 MW / 36 MWh)", () => {
  const result = computeArchitectureSizing({
    targetPowerMW: 9,
    targetUsableEnergyMWh: 36,
  });

  it("rounds up to 2 stations (10 MVA)", () => {
    expect(result.stations).toBe(2);
    expect(result.installedPowerMVA).toBe(10);
  });

  it("containers driven by power slot (2 × 8 = 16 minimum)", () => {
    // Energy: 36 / (2.752 × 0.9083) ≈ 14.4 → 15 containers
    // Power: 2 stations × 8 = 16 containers
    expect(result.containers).toBe(16);
  });

  it("emits a warning about power dominating", () => {
    const hasPowerWarning = result.warnings.some((w) =>
      w.toLowerCase().includes("power constraint dominates")
    );
    expect(hasPowerWarning).toBe(true);
  });
});

describe("computeArchitectureSizing — mid-scale (50 MW / 200 MWh)", () => {
  const result = computeArchitectureSizing({
    targetPowerMW: 50,
    targetUsableEnergyMWh: 200,
  });

  it("computes 10 stations and 80 containers", () => {
    // Power: 10 stations × 5 MVA = 50 MW → 80 containers
    // Energy: 200 / (2.752 × 0.9083) ≈ 80 containers
    expect(result.stations).toBe(10);
    expect(result.containers).toBe(80);
  });

  it("computes 3 feeders (10 / 4 = 2.5 → 3)", () => {
    expect(result.feeders).toBe(3);
  });

  it("gross energy ≈ 80 × 2.752512 ≈ 220.2 MWh", () => {
    expect(result.grossEnergyMWh).toBeCloseTo(220.20096, 5);
  });
});

describe("computeArchitectureSizing — utility (500 MW / 2000 MWh)", () => {
  const result = computeArchitectureSizing({
    targetPowerMW: 500,
    targetUsableEnergyMWh: 2000,
  });

  it("computes 100 stations and 800 containers", () => {
    expect(result.stations).toBe(100);
    expect(result.containers).toBe(800);
  });

  it("computes 25 feeders (100 / 4)", () => {
    expect(result.feeders).toBe(25);
  });

  it("installed power = 500 MVA", () => {
    expect(result.installedPowerMVA).toBe(500);
  });
});

describe("computeArchitectureSizing — edge cases", () => {
  it("only power given → containers driven by power (40 × 8 = 320)", () => {
    const r = computeArchitectureSizing({ targetPowerMW: 200 });
    expect(r.stations).toBe(40);
    expect(r.containers).toBe(320);
    expect(r.containersByEnergy).toBeNull();
    expect(r.commercialEnergyMWh).toBeNull();
    expect(r.durationHoursCommercial).toBeNull();
  });

  it("only energy given → containers driven by energy", () => {
    const r = computeArchitectureSizing({ targetUsableEnergyMWh: 800 });
    expect(r.containers).toBe(320); // 800 / (2.752512 × 0.9083) ≈ 320
    expect(r.stations).toBe(40);
    expect(r.containersByPower).toBeNull();
  });

  it("no targets given → containers = 0 with warning", () => {
    const r = computeArchitectureSizing({});
    expect(r.containers).toBe(0);
    expect(r.stations).toBe(0);
    expect(r.feeders).toBe(0);
    expect(r.warnings.some((w) => w.includes("No target"))).toBe(true);
  });

  it("maxContainers caps the count and emits a warning", () => {
    const r = computeArchitectureSizing({
      targetPowerMW: 200,
      targetUsableEnergyMWh: 800,
      maxContainers: 100,
    });
    expect(r.containers).toBe(100);
    expect(r.warnings.some((w) => w.toLowerCase().includes("capped"))).toBe(true);
  });

  it("energy dominates when usableFactor is very small", () => {
    const r = computeArchitectureSizing({
      targetPowerMW: 50,
      targetUsableEnergyMWh: 500,
      usableFactor: 0.5,
    });
    // Energy: 500 / (2.752 × 0.5) ≈ 364 containers
    // Power: 10 stations × 8 = 80 containers
    expect(r.containers).toBeGreaterThan(80);
    expect(r.warnings.some((w) => w.toLowerCase().includes("energy constraint dominates"))).toBe(true);
  });
});

describe("computeArchitectureSizing — custom architecture", () => {
  it("respects custom containersPerStation and stationsPerFeeder", () => {
    const r = computeArchitectureSizing({
      targetPowerMW: 100,
      targetUsableEnergyMWh: 400,
      containersPerStation: 4,
      stationsPerFeeder: 2,
    });
    // Power: ceil(100 / 5) = 20 stations → 20 × 4 = 80 containers
    // Energy: 400 / (2.752 × 0.9083) ≈ 160 containers
    // Final: max(80, 160) = 160 containers → 40 stations → 20 feeders
    expect(r.containers).toBe(160);
    expect(r.stations).toBe(40);
    expect(r.feeders).toBe(20);
  });

  it("respects custom container energy and station power", () => {
    const r = computeArchitectureSizing({
      targetPowerMW: 100,
      targetUsableEnergyMWh: 400,
      containerEnergyMWh: 5, // larger containers
      stationPowerMVA: 10, // larger stations
      usableFactor: 1, // assume 100% usable
    });
    // Power: ceil(100 / 10) = 10 stations → 10 × 8 = 80 containers
    // Energy: 400 / 5 = 80 containers
    expect(r.stations).toBe(10);
    expect(r.containers).toBe(80);
    expect(r.installedPowerMVA).toBe(100);
  });
});

describe("default constants", () => {
  it("are exported and match BESS del Desierto", () => {
    expect(DEFAULT_CONTAINER_ENERGY_MWH).toBe(2.752512);
    expect(DEFAULT_STATION_POWER_MVA).toBe(5);
    expect(DEFAULT_CONTAINERS_PER_STATION).toBe(8);
    expect(DEFAULT_STATIONS_PER_FEEDER).toBe(4);
    expect(DEFAULT_USABLE_FACTOR).toBeCloseTo(0.9083, 3);
  });
});
