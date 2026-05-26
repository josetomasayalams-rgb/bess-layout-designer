import type { BESSBlock, ConversionStation, MVBus, MVFeeder, POI } from "@/types/electrical";
import type { DocumentInconsistency } from "@/types/project";
import type { ElectricalCompatibilityIssue } from "@/types/technical";
import { pcsCatalog, getPcsSpec } from "@/data/catalogs/pcsCatalog";

export type ElectricalTopologyLimits = {
  maxContainersPerStation?: number;
  maxStationsPerFeeder?: number;
  expectedCollectorVoltageKv?: number;
  lvVoltageToleranceKv?: number;
  containerDcVoltageRangeV?: [number, number];
};

export type ElectricalTopologyInput = {
  blocks: BESSBlock[];
  conversionStations: ConversionStation[];
  mvFeeders: MVFeeder[];
  mvBuses?: MVBus[];
  poi?: POI | null;
  limits?: ElectricalTopologyLimits;
};

export type ElectricalTopologyValidationResult = {
  issues: ElectricalCompatibilityIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  checkedRules: string[];
};

const DEFAULT_LIMITS: Required<ElectricalTopologyLimits> = {
  maxContainersPerStation: 8,
  maxStationsPerFeeder: 4,
  expectedCollectorVoltageKv: 33,
  lvVoltageToleranceKv: 0.025,
  containerDcVoltageRangeV: [1160, 1500],
};

function withDefaults(limits?: ElectricalTopologyLimits): Required<ElectricalTopologyLimits> {
  return { ...DEFAULT_LIMITS, ...limits };
}

function issue(args: ElectricalCompatibilityIssue): ElectricalCompatibilityIssue {
  return args;
}

function idsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  return b.every((id) => aSet.has(id));
}

function sumStationPowerMva(stations: ConversionStation[]): number {
  return stations.reduce((total, station) => total + station.ratedPowerMVA.value, 0);
}

function severityCount(
  issues: ElectricalCompatibilityIssue[],
  severity: ElectricalCompatibilityIssue["severity"]
): number {
  return issues.filter((item) => item.severity === severity).length;
}

export function validateElectricalTopology(
  input: ElectricalTopologyInput
): ElectricalTopologyValidationResult {
  const limits = withDefaults(input.limits);
  const issues: ElectricalCompatibilityIssue[] = [];
  const stationById = new Map(input.conversionStations.map((station) => [station.id, station]));
  const blockByStationId = new Map(input.blocks.map((block) => [block.conversionStationId, block]));
  const feederById = new Map(input.mvFeeders.map((feeder) => [feeder.id, feeder]));
  const feederStationIds = new Set(input.mvFeeders.flatMap((feeder) => feeder.conversionStationIds));

  // Preset warning (reference_only)
  if (input.blocks.length > 0) {
    issues.push(
      issue({
        id: "rule-elec-bess-del-desierto-preset-in-use",
        severity: "warning",
        message: "El preset BESS del Desierto está activo. Los límites de la arquitectura (8:1 y 4:1) y las distancias son supuestos referenciales y no reglas de diseño universales.",
        recommendation: "Validar y ajustar los parámetros según las especificaciones del fabricante, del EPC y del terreno.",
        basis: "reference_only",
        affectedIds: ["project"],
      })
    );
  }

  // Missing feeders
  if (input.mvFeeders.length === 0) {
    issues.push(
      issue({
        id: "rule-elec-missing-feeders",
        severity: "warning",
        message: "No se han definido alimentadores de media tensión en la arquitectura eléctrica.",
        recommendation: "Definir al menos un alimentador de media tensión para interconectar las estaciones de conversión.",
        basis: "pending_validation",
        affectedIds: ["project"],
      })
    );
  }

  for (const block of input.blocks) {
    const station = stationById.get(block.conversionStationId);
    if (!station) {
      issues.push(
        issue({
          id: `rule-elec-001-missing-station-${block.id}`,
          severity: "critical",
          message: `BESS block ${block.id} references missing conversion station ${block.conversionStationId}.`,
          recommendation: "Regenerate or repair the electrical architecture before using the layout as a project baseline.",
          basis: "calculated",
          affectedIds: [block.id, block.conversionStationId],
        })
      );
      continue;
    }

    if (block.containerIds.length > limits.maxContainersPerStation) {
      issues.push(
        issue({
          id: `rule-elec-001-block-container-count-${block.id}`,
          severity: "warning",
          message: `El bloque BESS ${block.id} tiene ${block.containerIds.length} contenedores. La proporción máxima recomendada por el supuesto de predimensionamiento es de ${limits.maxContainersPerStation} por estación.`,
          recommendation: "Verificar la relación BESS-PCS con el fabricante; la relación 8:1 es referencial.",
          basis: "reference_only",
          affectedIds: [block.id, station.id, ...block.containerIds],
        })
      );
    }

    // Ratio mismatch vs preset (8:1 is the target preset ratio)
    if (block.containerIds.length !== 8) {
      issues.push(
        issue({
          id: `rule-elec-block-ratio-preset-mismatch-${block.id}`,
          severity: "warning",
          message: `La proporción BESS-PCS del bloque ${block.id} (${block.containerIds.length}:1) difiere de la proporción fija del preset BESS del Desierto (8:1).`,
          recommendation: "Ajustar el número de contenedores por bloque para alinearse con el preset o justificar la diferencia técnica.",
          basis: "reference_only",
          affectedIds: [block.id],
        })
      );
    }

    if (!idsEqual(block.containerIds, station.associatedContainerIds)) {
      issues.push(
        issue({
          id: `rule-elec-001-block-station-mapping-${block.id}`,
          severity: "warning",
          message: `BESS block ${block.id} and station ${station.id} do not list the same container IDs.`,
          recommendation: "Synchronize block and station mappings before exporting the technical report.",
          basis: "calculated",
          affectedIds: [block.id, station.id],
        })
      );
    }
  }

  for (const station of input.conversionStations) {
    const block = blockByStationId.get(station.id);
    if (!block) {
      issues.push(
        issue({
          id: `rule-elec-001-unassigned-station-${station.id}`,
          severity: "warning",
          message: `Conversion station ${station.id} is not referenced by any BESS block.`,
          recommendation: "Assign each station to a BESS block or mark it as spare with explicit evidence.",
          basis: "calculated",
          affectedIds: [station.id],
        })
      );
    }

    if (station.associatedContainerIds.length > limits.maxContainersPerStation) {
      issues.push(
        issue({
          id: `rule-elec-001-station-container-count-${station.id}`,
          severity: "warning",
          message: `La estación de conversión ${station.id} tiene ${station.associatedContainerIds.length} contenedores asociados. La relación máxima recomendada de predimensionamiento es de ${limits.maxContainersPerStation}.`,
          recommendation: "Reducir el número de contenedores asociados o validar la capacidad con el fabricante.",
          basis: "reference_only",
          affectedIds: [station.id, ...station.associatedContainerIds],
        })
      );
    }

    if (!station.mvFeederId) {
      issues.push(
        issue({
          id: `rule-elec-002-station-missing-feeder-${station.id}`,
          severity: "warning",
          message: `Conversion station ${station.id} has no MV feeder assignment.`,
          recommendation: "Assign the station to a collector feeder before using the electrical summary.",
          basis: "pending_validation",
          affectedIds: [station.id],
        })
      );
    } else if (!feederById.has(station.mvFeederId)) {
      issues.push(
        issue({
          id: `rule-elec-002-station-feeder-missing-${station.id}`,
          severity: "critical",
          message: `Conversion station ${station.id} references missing feeder ${station.mvFeederId}.`,
          recommendation: "Repair feeder references in the electrical architecture.",
          basis: "calculated",
          affectedIds: [station.id, station.mvFeederId],
        })
      );
    } else if (!feederStationIds.has(station.id)) {
      issues.push(
        issue({
          id: `rule-elec-002-feeder-backref-missing-${station.id}`,
          severity: "warning",
          message: `Conversion station ${station.id} points to feeder ${station.mvFeederId}, but the feeder does not include the station.`,
          recommendation: "Synchronize station and feeder references before exporting.",
          basis: "calculated",
          affectedIds: [station.id, station.mvFeederId],
        })
      );
    }

    if (!station.blockTransformer) {
      issues.push(
        issue({
          id: `rule-elec-missing-transformer-${station.id}`,
          severity: "warning",
          message: `La estación de conversión ${station.id} no tiene un transformador de bloque definido.`,
          recommendation: "Definir un transformador de bloque para elevar la tensión al nivel de media tensión del colector.",
          basis: "pending_validation",
          affectedIds: [station.id],
        })
      );
      continue;
    }

    const transformerLvKv = station.blockTransformer.lvVoltageKv?.value ?? 0;
    const transformerHvKv = station.blockTransformer.hvVoltageKv?.value ?? 0;

    if (transformerLvKv === 0) {
      issues.push(
        issue({
          id: `rule-elec-missing-transformer-lv-${station.id}`,
          severity: "warning",
          message: `La tensión de baja tensión (LV) del transformador en la estación ${station.id} no está definida o es cero.`,
          recommendation: "Confirmar la tensión LV del transformador (ej. 0.9 kV) según la ficha técnica del fabricante.",
          basis: "pending_validation",
          affectedIds: [station.id, station.blockTransformer.id],
        })
      );
    }

    if (transformerHvKv === 0) {
      issues.push(
        issue({
          id: `rule-elec-missing-transformer-hv-${station.id}`,
          severity: "warning",
          message: `La tensión de media tensión (HV) del transformador en la estación ${station.id} no está definida o es cero.`,
          recommendation: "Confirmar la tensión HV del transformador (ej. 33 kV) según el diagrama unifilar del proyecto.",
          basis: "pending_validation",
          affectedIds: [station.id, station.blockTransformer.id],
        })
      );
    }

    for (const pcs of station.pcsModules) {
      if (!pcs.dcVoltageRangeV) {
        issues.push(
          issue({
            id: `rule-elec-003-pcs-dc-range-missing-${pcs.id}`,
            severity: "warning",
            message: `PCS module ${pcs.id} has no DC voltage range.`,
            recommendation: "Add manufacturer DC voltage range before treating PCS-container compatibility as validated.",
            basis: "pending_validation",
            affectedIds: [station.id, pcs.id],
          })
        );
      } else if (
        pcs.dcVoltageRangeV[0] < limits.containerDcVoltageRangeV[0] ||
        pcs.dcVoltageRangeV[1] > limits.containerDcVoltageRangeV[1]
      ) {
        issues.push(
          issue({
            id: `rule-elec-003-pcs-dc-range-mismatch-${pcs.id}`,
            severity: "warning",
            message: `PCS module ${pcs.id} DC range ${pcs.dcVoltageRangeV[0]}-${pcs.dcVoltageRangeV[1]} V is outside the preliminary container range ${limits.containerDcVoltageRangeV[0]}-${limits.containerDcVoltageRangeV[1]} V.`,
            recommendation: "Confirm a compatible PCS-container configuration with the manufacturer.",
            basis: "preliminary_assumption",
            affectedIds: [station.id, pcs.id],
          })
        );
      }

      const pcsLvKv = pcs.nominalAcVoltageV ? pcs.nominalAcVoltageV / 1000 : 0;
      if (pcsLvKv === 0) {
        issues.push(
          issue({
            id: `rule-elec-missing-pcs-ac-${pcs.id}`,
            severity: "warning",
            message: `El módulo PCS ${pcs.id} no tiene definida su tensión nominal AC.`,
            recommendation: "Confirmar la tensión nominal AC del PCS en su ficha técnica.",
            basis: "pending_validation",
            affectedIds: [station.id, pcs.id],
          })
        );
      }

      if (pcsLvKv !== 0 && transformerLvKv !== 0 && Math.abs(pcsLvKv - transformerLvKv) > limits.lvVoltageToleranceKv) {
        issues.push(
          issue({
            id: `rule-elec-004-pcs-transformer-lv-mismatch-${pcs.id}`,
            severity: "critical",
            message: `PCS module ${pcs.id} nominal AC voltage is ${pcsLvKv} kV, but station transformer LV is ${transformerLvKv} kV.`,
            recommendation: "Resolve the LV voltage before using the station as a valid preliminary block.",
            basis: "pending_validation",
            affectedIds: [station.id, pcs.id, station.blockTransformer.id],
          })
        );
      }

      // Voltage Contradiction check
      const pcsSpec = getPcsSpec(pcs.id) || pcsCatalog.find(p => p.model === pcs.model || p.aliases.includes(pcs.model));
      if (pcsSpec && pcsSpec.knownVoltageContradictions) {
        const contradiction = pcsSpec.knownVoltageContradictions;
        if (
          Math.abs(transformerLvKv - contradiction.projectReportedLvKv!) < 0.01 &&
          Math.abs(transformerHvKv - contradiction.projectReportedMvKv!) < 0.01
        ) {
          issues.push(
            issue({
              id: `rule-elec-pcs-transformer-voltage-contradiction-${pcs.id}`,
              severity: "warning",
              message: `Contradicción de datos de tensión: la ficha técnica de ${pcs.model} reporta LV ${contradiction.datasheetLvKv} kV / MV ${contradiction.datasheetMvKv} kV, mientras que el proyecto reporta LV ${contradiction.projectReportedLvKv} kV / MV ${contradiction.projectReportedMvKv} kV.`,
              recommendation: "Confirmar la variante contractual exacta y los valores nominales con el fabricante.",
              basis: "pending_validation",
              affectedIds: [station.id, pcs.id, station.blockTransformer.id],
            })
          );
        }
      }
    }

    if (transformerHvKv !== 0 && Math.abs(transformerHvKv - limits.expectedCollectorVoltageKv) > 0.001) {
      issues.push(
        issue({
          id: `rule-elec-005-transformer-collector-voltage-${station.id}`,
          severity: "warning",
          message: `Station ${station.id} transformer HV is ${transformerHvKv} kV; expected collector voltage is ${limits.expectedCollectorVoltageKv} kV.`,
          recommendation: "Confirm collector voltage against the single-line diagram.",
          basis: "pending_validation",
          affectedIds: [station.id, station.blockTransformer.id],
        })
      );
    }
  }

  for (const feeder of input.mvFeeders) {
    const feederStations = feeder.conversionStationIds
      .map((id) => stationById.get(id))
      .filter((station): station is ConversionStation => Boolean(station));

    if (feeder.nominalVoltageKv === 0 || !feeder.nominalVoltageKv) {
      issues.push(
        issue({
          id: `rule-elec-missing-feeder-voltage-${feeder.id}`,
          severity: "warning",
          message: `El alimentador de media tensión ${feeder.id} no tiene definida su tensión nominal.`,
          recommendation: "Asignar la tensión nominal correspondiente al colector MT (ej. 33 kV).",
          basis: "pending_validation",
          affectedIds: [feeder.id],
        })
      );
    }

    if (feeder.conversionStationIds.length > limits.maxStationsPerFeeder) {
      issues.push(
        issue({
          id: `rule-elec-002-feeder-station-count-${feeder.id}`,
          severity: "warning",
          message: `El alimentador MT ${feeder.id} tiene ${feeder.conversionStationIds.length} estaciones asociadas. La proporción máxima recomendada por el supuesto de predimensionamiento es de ${limits.maxStationsPerFeeder} estaciones.`,
          recommendation: "Verificar la carga máxima del alimentador; la relación 4:1 es un supuesto de predimensionamiento referencial.",
          basis: "reference_only",
          affectedIds: [feeder.id, ...feeder.conversionStationIds],
        })
      );
    }

    if (feeder.nominalVoltageKv !== 0 && Math.abs(feeder.nominalVoltageKv - limits.expectedCollectorVoltageKv) > 0.001) {
      issues.push(
        issue({
          id: `rule-elec-005-feeder-collector-voltage-${feeder.id}`,
          severity: "warning",
          message: `MV feeder ${feeder.id} is ${feeder.nominalVoltageKv} kV; expected collector voltage is ${limits.expectedCollectorVoltageKv} kV.`,
          recommendation: "Confirm feeder voltage against the project single-line diagram.",
          basis: "pending_validation",
          affectedIds: [feeder.id],
        })
      );
    }

    for (const stationId of feeder.conversionStationIds) {
      const station = stationById.get(stationId);
      if (!station) {
        issues.push(
          issue({
            id: `rule-elec-002-feeder-station-missing-${feeder.id}-${stationId}`,
            severity: "critical",
            message: `MV feeder ${feeder.id} references missing station ${stationId}.`,
            recommendation: "Remove the missing station reference or recreate the station.",
            basis: "calculated",
            affectedIds: [feeder.id, stationId],
          })
        );
      } else if (station.mvFeederId && station.mvFeederId !== feeder.id) {
        issues.push(
          issue({
            id: `rule-elec-002-station-feeder-mismatch-${station.id}`,
            severity: "warning",
            message: `Station ${station.id} is listed in feeder ${feeder.id}, but its station record points to ${station.mvFeederId}.`,
            recommendation: "Keep feeder references bidirectional and consistent.",
            basis: "calculated",
            affectedIds: [station.id, feeder.id, station.mvFeederId],
          })
        );
      }
    }

    if (feeder.ratedPowerMVA !== undefined) {
      const aggregateMva = sumStationPowerMva(feederStations);
      if (aggregateMva > feeder.ratedPowerMVA + 0.001) {
        issues.push(
          issue({
            id: `rule-elec-006-feeder-power-overload-${feeder.id}`,
            severity: "critical",
            message: `MV feeder ${feeder.id} aggregates ${aggregateMva} MVA, above its preliminary rating of ${feeder.ratedPowerMVA} MVA.`,
            recommendation: "Reduce stations per feeder or document a higher feeder rating.",
            basis: "calculated",
            affectedIds: [feeder.id, ...feeder.conversionStationIds],
          })
        );
      }
    }
  }

  if (input.mvBuses) {
    const feederIds = new Set(input.mvFeeders.map((feeder) => feeder.id));
    for (const bus of input.mvBuses) {
      if (Math.abs(bus.nominalVoltageKv - limits.expectedCollectorVoltageKv) > 0.001) {
        issues.push(
          issue({
            id: `rule-elec-005-bus-collector-voltage-${bus.id}`,
            severity: "warning",
            message: `MV bus ${bus.id} is ${bus.nominalVoltageKv} kV; expected collector voltage is ${limits.expectedCollectorVoltageKv} kV.`,
            recommendation: "Confirm bus voltage against the project single-line diagram.",
            basis: "pending_validation",
            affectedIds: [bus.id],
          })
        );
      }

      const missingFeeders = bus.feederIds.filter((id) => !feederIds.has(id));
      if (missingFeeders.length > 0) {
        issues.push(
          issue({
            id: `rule-elec-005-bus-missing-feeders-${bus.id}`,
            severity: "warning",
            message: `MV bus ${bus.id} references missing feeders: ${missingFeeders.join(", ")}.`,
            recommendation: "Synchronize bus and feeder definitions.",
            basis: "calculated",
            affectedIds: [bus.id, ...missingFeeders],
          })
        );
      }
    }
  }

  if (!input.poi) {
    issues.push(
      issue({
        id: "rule-elec-006-poi-missing",
        severity: "warning",
        message: "No se ha definido el Punto de Interconexión (POI) conceptual para el proyecto.",
        recommendation: "Definir un Punto de Interconexión preliminar para cerrar el diagrama unifilar y la arquitectura.",
        basis: "pending_validation",
        affectedIds: ["poi"],
      })
    );
  } else if (input.poi.voltageKv !== 0 && Math.abs(input.poi.voltageKv - limits.expectedCollectorVoltageKv) > 0.001) {
    issues.push(
      issue({
        id: "rule-elec-006-poi-voltage-mismatch",
        severity: "warning",
        message: `POI is ${input.poi.voltageKv} kV while the collector architecture is expected at ${limits.expectedCollectorVoltageKv} kV.`,
        recommendation: "Keep POI boundary explicit and do not mix MV collector and HV substation scopes.",
        basis: "pending_validation",
        affectedIds: [input.poi.id],
      })
    );
  }

  return {
    issues,
    criticalCount: severityCount(issues, "critical"),
    warningCount: severityCount(issues, "warning"),
    infoCount: severityCount(issues, "info"),
    checkedRules: [
      "RULE-ELEC-001",
      "RULE-ELEC-002",
      "RULE-ELEC-003",
      "RULE-ELEC-004",
      "RULE-ELEC-005",
      "RULE-ELEC-006",
    ],
  };
}

export function documentInconsistenciesToElectricalIssues(
  inconsistencies: DocumentInconsistency[]
): ElectricalCompatibilityIssue[] {
  return inconsistencies.map((inconsistency) =>
    issue({
      id: `doc-inconsistency-${inconsistency.id.toLowerCase()}`,
      severity: "warning",
      message: `${inconsistency.id}: ${inconsistency.topic} has conflicting documented values (${inconsistency.conflictingValues
        .map((item) => item.value)
        .join(" vs ")}).`,
      recommendation: inconsistency.recommendation,
      basis: "pending_validation",
      affectedIds: [inconsistency.id],
    })
  );
}
