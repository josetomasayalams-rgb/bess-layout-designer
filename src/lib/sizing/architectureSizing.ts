/**
 * Cálculo de arquitectura preliminar BESS (Fase 4).
 *
 * Funciones puras. Dado un objetivo de potencia (MW) y/o energía usable
 * comercial (MWh), determina la cantidad de containers, estaciones de
 * conversión y feeders MT necesarios, respetando reglas de agrupación
 * (8 containers por estación, 4 estaciones por feeder en el caso BESS del
 * Desierto — parametrizables).
 *
 * Distingue tres conceptos de energía:
 *   - `commercialEnergyMWh`: lo declarado por el usuario (input).
 *   - `usableEnergyMWh`: gross × usableFactor (real con DoD/degradación).
 *   - `grossEnergyMWh`: containers × container nameplate (DC BOL).
 *
 * Convención: cada container aporta `containerEnergyMWh` brutos DC BOL.
 * `usableFactor ∈ (0, 1]` reduce ese bruto a usable.
 *
 * No reemplaza estudios eléctricos. No incluye pérdidas, SSAA ni derating.
 * Estos cálculos se añaden en fases posteriores.
 */

// ──────────────────────────────────────────────────────────────────
// Defaults documentados (caso BESS del Desierto)
// ──────────────────────────────────────────────────────────────────

/** Sungrow ST2752UX — DC BOL nameplate per container. */
export const DEFAULT_CONTAINER_ENERGY_MWH = 2.752512;

/** Caso BESS del Desierto: 800 / 880,80384. */
export const DEFAULT_USABLE_FACTOR = 800 / 880.80384;

/** Sungrow SC5000UD-MV — MVA por estación de conversión. */
export const DEFAULT_STATION_POWER_MVA = 5;

/** Caso BESS del Desierto: 8 containers por estación. */
export const DEFAULT_CONTAINERS_PER_STATION = 8;

/** Caso BESS del Desierto: 4 estaciones por feeder de 20 MVA. */
export const DEFAULT_STATIONS_PER_FEEDER = 4;

// ──────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────

export type ArchitectureSizingInput = {
  /** Potencia objetivo POI (MW). Si se omite, se ignora el constraint de potencia. */
  targetPowerMW?: number;
  /** Energía usable comercial declarada (MWh). Si se omite, se ignora el constraint de energía. */
  targetUsableEnergyMWh?: number;
  /** Energía DC BOL por container (MWh). Default ST2752UX. */
  containerEnergyMWh?: number;
  /** Factor usable / bruto ∈ (0, 1]. Default = factor caso BESS del Desierto. */
  usableFactor?: number;
  /** Potencia por estación (MVA). Default SC5000UD-MV. */
  stationPowerMVA?: number;
  /** Containers por estación (default 8). */
  containersPerStation?: number;
  /** Estaciones por feeder (default 4). */
  stationsPerFeeder?: number;
  /** Tope de containers (p.ej. terreno limitado). */
  maxContainers?: number;
};

export type ArchitectureSizingResult = {
  /** Inputs resueltos (con defaults aplicados). */
  resolved: {
    containerEnergyMWh: number;
    usableFactor: number;
    stationPowerMVA: number;
    containersPerStation: number;
    stationsPerFeeder: number;
    targetPowerMW: number | null;
    targetUsableEnergyMWh: number | null;
  };

  /** Containers requeridos por la energía objetivo (null si no se dio energía). */
  containersByEnergy: number | null;
  /** Containers requeridos por la potencia objetivo (null si no se dio potencia). */
  containersByPower: number | null;
  /** Containers finales = max(byEnergy, byPower), o el constraint dado. */
  containers: number;
  /** Estaciones requeridas (ceil(containers / containersPerStation)). */
  stations: number;
  /** Feeders requeridos (ceil(stations / stationsPerFeeder)). */
  feeders: number;

  /** Energía bruta DC BOL = containers × containerEnergyMWh. */
  grossEnergyMWh: number;
  /** Energía usable real = gross × usableFactor. */
  usableEnergyMWh: number;
  /** Energía comercial declarada (echo del input). Null si no se dio. */
  commercialEnergyMWh: number | null;

  /** Potencia instalada en MVA = stations × stationPowerMVA. */
  installedPowerMVA: number;

  /** Duración aproximada usable / installed (horas). */
  durationHoursFromUsable: number;
  /** Duración aproximada gross / installed (horas). */
  durationHoursFromGross: number;
  /** Duración comercial / installed (horas). Null si no se dio comercial. */
  durationHoursCommercial: number | null;

  /** Sobre-energía vs comercial (%). Null si no aplica. */
  energyOversizeVsCommercialPct: number | null;
  /** Sobre-potencia vs target (%). Null si no aplica. */
  powerOversizeVsTargetPct: number | null;

  warnings: string[];
};

// ──────────────────────────────────────────────────────────────────
// Funciones unitarias
// ──────────────────────────────────────────────────────────────────

/** Containers requeridos para alcanzar `targetUsableMWh` usable. */
export function containersForTargetEnergy(
  targetUsableMWh: number,
  containerEnergyMWh: number,
  usableFactor: number
): number {
  if (containerEnergyMWh <= 0) {
    throw new Error("containerEnergyMWh must be > 0");
  }
  if (usableFactor <= 0 || usableFactor > 1) {
    throw new Error("usableFactor must be in (0, 1]");
  }
  if (targetUsableMWh <= 0) return 0;
  const usablePerContainer = containerEnergyMWh * usableFactor;
  return ceilWithTolerance(targetUsableMWh / usablePerContainer);
}

/** Estaciones de conversión para alojar `nContainers` con `perStation` containers/station. */
export function stationsForContainers(
  nContainers: number,
  containersPerStation: number
): number {
  if (containersPerStation <= 0) {
    throw new Error("containersPerStation must be > 0");
  }
  if (nContainers <= 0) return 0;
  return ceilWithTolerance(nContainers / containersPerStation);
}

/** Estaciones mínimas para entregar `targetMW` MW con stations de `stationMVA` MVA. */
export function stationsForPower(
  targetMW: number,
  stationPowerMVA: number
): number {
  if (stationPowerMVA <= 0) {
    throw new Error("stationPowerMVA must be > 0");
  }
  if (targetMW <= 0) return 0;
  return ceilWithTolerance(targetMW / stationPowerMVA);
}

/** Feeders MT para `nStations` estaciones con `perFeeder` stations por feeder. */
export function feedersForStations(
  nStations: number,
  stationsPerFeeder: number
): number {
  if (stationsPerFeeder <= 0) {
    throw new Error("stationsPerFeeder must be > 0");
  }
  if (nStations <= 0) return 0;
  return ceilWithTolerance(nStations / stationsPerFeeder);
}

/** Duración en horas (energía / potencia). Devuelve `Infinity` si potencia = 0. */
export function durationHours(energyMWh: number, powerMW: number): number {
  if (powerMW === 0) return Infinity;
  return energyMWh / powerMW;
}

// ──────────────────────────────────────────────────────────────────
// Cálculo agregado
// ──────────────────────────────────────────────────────────────────

function round(value: number, digits = 6): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ceilWithTolerance(value: number): number {
  const nearest = Math.round(value);
  if (Math.abs(value - nearest) < 1e-9) return nearest;
  return Math.ceil(value);
}

function pct(delta: number, base: number): number | null {
  if (base === 0) return null;
  return round((delta / base) * 100, 3);
}

/**
 * Cálculo integrado: dado un objetivo (MW y/o MWh usable) y la arquitectura
 * (defaults BESS del Desierto), produce containers / stations / feeders y los
 * tres conceptos de energía con duración.
 */
export function computeArchitectureSizing(
  input: ArchitectureSizingInput
): ArchitectureSizingResult {
  const containerEnergyMWh =
    input.containerEnergyMWh ?? DEFAULT_CONTAINER_ENERGY_MWH;
  const usableFactor = input.usableFactor ?? DEFAULT_USABLE_FACTOR;
  const stationPowerMVA = input.stationPowerMVA ?? DEFAULT_STATION_POWER_MVA;
  const containersPerStation =
    input.containersPerStation ?? DEFAULT_CONTAINERS_PER_STATION;
  const stationsPerFeeder =
    input.stationsPerFeeder ?? DEFAULT_STATIONS_PER_FEEDER;

  const targetPowerMW =
    input.targetPowerMW !== undefined && input.targetPowerMW > 0
      ? input.targetPowerMW
      : null;
  const targetUsableEnergyMWh =
    input.targetUsableEnergyMWh !== undefined && input.targetUsableEnergyMWh > 0
      ? input.targetUsableEnergyMWh
      : null;

  const warnings: string[] = [];

  const containersByEnergy =
    targetUsableEnergyMWh !== null
      ? containersForTargetEnergy(
          targetUsableEnergyMWh,
          containerEnergyMWh,
          usableFactor
        )
      : null;

  const containersByPower =
    targetPowerMW !== null
      ? stationsForPower(targetPowerMW, stationPowerMVA) * containersPerStation
      : null;

  let containers = Math.max(
    containersByEnergy ?? 0,
    containersByPower ?? 0
  );

  if (input.maxContainers !== undefined && input.maxContainers >= 0) {
    if (containers > input.maxContainers) {
      warnings.push(
        `Container count ${containers} capped to maxContainers ${input.maxContainers}; target may not be reachable.`
      );
      containers = input.maxContainers;
    }
  }

  const stations = stationsForContainers(containers, containersPerStation);
  const feeders = feedersForStations(stations, stationsPerFeeder);

  const grossEnergyMWh = round(containers * containerEnergyMWh);
  const usableEnergyMWh = round(grossEnergyMWh * usableFactor);
  const commercialEnergyMWh = targetUsableEnergyMWh;
  const installedPowerMVA = round(stations * stationPowerMVA);

  const durationHoursFromUsable = round(
    durationHours(usableEnergyMWh, installedPowerMVA),
    3
  );
  const durationHoursFromGross = round(
    durationHours(grossEnergyMWh, installedPowerMVA),
    3
  );
  const durationHoursCommercial =
    commercialEnergyMWh !== null
      ? round(durationHours(commercialEnergyMWh, installedPowerMVA), 3)
      : null;

  const energyOversizeVsCommercialPct =
    commercialEnergyMWh !== null
      ? pct(usableEnergyMWh - commercialEnergyMWh, commercialEnergyMWh)
      : null;
  const powerOversizeVsTargetPct =
    targetPowerMW !== null
      ? pct(installedPowerMVA - targetPowerMW, targetPowerMW)
      : null;

  if (
    targetUsableEnergyMWh !== null &&
    targetPowerMW !== null &&
    containersByEnergy !== null &&
    containersByPower !== null
  ) {
    if (containersByEnergy > containersByPower) {
      warnings.push(
        "Energy constraint dominates: more containers needed than the power target alone would require."
      );
    } else if (containersByPower > containersByEnergy) {
      warnings.push(
        "Power constraint dominates: stations may be under-filled with containers."
      );
    }
  }

  if (containers === 0 && targetPowerMW === null && targetUsableEnergyMWh === null) {
    warnings.push("No target provided: result is empty.");
  }

  if (installedPowerMVA > 0) {
    warnings.push(
      "Installed power is reported in MVA. Treat comparison to MW as approximate until power factor and active power limits are confirmed."
    );
  }

  return {
    resolved: {
      containerEnergyMWh,
      usableFactor,
      stationPowerMVA,
      containersPerStation,
      stationsPerFeeder,
      targetPowerMW,
      targetUsableEnergyMWh,
    },
    containersByEnergy,
    containersByPower,
    containers,
    stations,
    feeders,
    grossEnergyMWh,
    usableEnergyMWh,
    commercialEnergyMWh,
    installedPowerMVA,
    durationHoursFromUsable,
    durationHoursFromGross,
    durationHoursCommercial,
    energyOversizeVsCommercialPct,
    powerOversizeVsTargetPct,
    warnings,
  };
}
