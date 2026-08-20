import type {
  BessContainerSpec,
  PcsSpec,
  PowerEnergyBlock,
  PreliminarySizingResult,
  ProjectCaseStudy,
  ProjectDesignIntent,
} from "@/types/technical";

type PreliminarySizingInput = {
  designIntent: ProjectDesignIntent;
  blockArchitecture?: PowerEnergyBlock[];
  bessContainerSpec?: BessContainerSpec;
  pcsSpec?: PcsSpec;
  containersPerBlock?: number;
};

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(delta: number, base: number): number | null {
  if (base === 0) return null;
  return round((delta / base) * 100, 3);
}

function sumBlockEnergy(blocks: PowerEnergyBlock[]): number {
  return blocks.reduce((sum, block) => sum + (block.nominalEnergyMWhDc?.value ?? 0), 0);
}

function sumBlockPower(blocks: PowerEnergyBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.nominalPowerMva.value, 0);
}

function sumBessContainers(blocks: PowerEnergyBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.bessContainerQuantity, 0);
}

function sumPcsCenters(blocks: PowerEnergyBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.pcsQuantity, 0);
}

export function calculatePreliminarySizing(
  input: PreliminarySizingInput
): PreliminarySizingResult {
  const {
    designIntent,
    blockArchitecture = [],
    bessContainerSpec,
    pcsSpec,
    containersPerBlock = 1,
  } = input;
  const warnings: string[] = [];
  const targetPowerMW = designIntent.targetPowerMW;
  const declaredProjectEnergyMWh = designIntent.targetEnergyMWh;

  let totalBessContainers = sumBessContainers(blockArchitecture);
  let totalPcsOrMvCenters = sumPcsCenters(blockArchitecture);
  let totalNominalEnergyMWhDc = sumBlockEnergy(blockArchitecture);
  let installedApparentPowerMva = sumBlockPower(blockArchitecture);
  let requiredBessContainersByTarget: number | undefined;
  let requiredPowerBlocksByTarget: number | undefined;

  if (designIntent.designMode === "design_from_target") {
    const containerEnergy = bessContainerSpec?.nominalEnergyMWhDcBol?.value ?? null;
    const pcsPower = pcsSpec?.apparentPowerMva?.value ?? null;

    if (containerEnergy && containerEnergy > 0) {
      requiredBessContainersByTarget = Math.ceil(declaredProjectEnergyMWh / containerEnergy);
      totalBessContainers = requiredBessContainersByTarget;
      totalNominalEnergyMWhDc = round(requiredBessContainersByTarget * containerEnergy, 6);
    } else {
      warnings.push("Target-energy sizing requires a BESS container nominal DC energy value.");
    }

    if (pcsPower && pcsPower > 0) {
      requiredPowerBlocksByTarget = Math.ceil(targetPowerMW / pcsPower);
      totalPcsOrMvCenters = requiredPowerBlocksByTarget;
      installedApparentPowerMva = round(requiredPowerBlocksByTarget * pcsPower, 6);
    } else {
      warnings.push("Target-power sizing requires a PCS/MV station apparent power value.");
    }

    if (
      requiredPowerBlocksByTarget !== undefined &&
      requiredBessContainersByTarget !== undefined &&
      containersPerBlock > 0
    ) {
      const containersByBlock = requiredPowerBlocksByTarget * containersPerBlock;
      if (containersByBlock < requiredBessContainersByTarget) {
        warnings.push(
          "Selected containers-per-block ratio does not provide enough BESS containers for the target energy."
        );
      }
    }
  }

  if (designIntent.designMode === "validate_existing_project") {
    if (blockArchitecture.length === 0) {
      warnings.push("Existing-project validation needs a block architecture.");
    }
    if (totalNominalEnergyMWhDc === 0 && bessContainerSpec?.nominalEnergyMWhDcBol) {
      totalNominalEnergyMWhDc = round(
        totalBessContainers * bessContainerSpec.nominalEnergyMWhDcBol.value,
        6
      );
    }
  }

  const calculatedDurationFromDeclaredEnergyHours =
    targetPowerMW > 0 ? round(declaredProjectEnergyMWh / targetPowerMW, 3) : null;
  const calculatedDurationFromDcEnergyHours =
    installedApparentPowerMva > 0
      ? round(totalNominalEnergyMWhDc / installedApparentPowerMva, 3)
      : null;
  const approximateCRateFromDeclaredEnergy =
    declaredProjectEnergyMWh > 0 ? round(targetPowerMW / declaredProjectEnergyMWh, 4) : null;
  const energyOversizeVsDeclaredPct = pct(
    totalNominalEnergyMWhDc - declaredProjectEnergyMWh,
    declaredProjectEnergyMWh
  );
  const powerOversizeVsTargetPct = pct(installedApparentPowerMva - targetPowerMW, targetPowerMW);

  if (installedApparentPowerMva > 0) {
    warnings.push(
      "La potencia instalada se expresa en MVA. La comparación con MW es aproximada hasta confirmar el factor de potencia y los límites de potencia activa."
    );
  }
  if (totalNominalEnergyMWhDc > declaredProjectEnergyMWh) {
    warnings.push(
      "Nominal DC energy is above declared project energy. Do not treat DC BOL energy as AC usable or contractual energy."
    );
  }

  return {
    mode: designIntent.designMode,
    totalBessContainers,
    totalPcsOrMvCenters,
    totalNominalEnergyMWhDc: round(totalNominalEnergyMWhDc, 6),
    declaredProjectEnergyMWh,
    installedApparentPowerMva: round(installedApparentPowerMva, 6),
    targetPowerMW,
    declaredDurationHours: designIntent.targetDurationHours,
    calculatedDurationFromDeclaredEnergyHours,
    calculatedDurationFromDcEnergyHours,
    approximateCRateFromDeclaredEnergy,
    energyOversizeVsDeclaredPct,
    powerOversizeVsTargetPct,
    requiredBessContainersByTarget,
    requiredPowerBlocksByTarget,
    warnings,
  };
}

export function calculateCaseStudySizing(
  caseStudy: ProjectCaseStudy
): PreliminarySizingResult {
  return calculatePreliminarySizing({
    designIntent: caseStudy.designIntent,
    blockArchitecture: caseStudy.blockArchitecture,
    bessContainerSpec: caseStudy.equipmentSet.bessContainers[0],
    pcsSpec: caseStudy.equipmentSet.pcsUnits[0],
    containersPerBlock: caseStudy.blockArchitecture[0]?.bessContainerQuantity ?? 1,
  });
}
