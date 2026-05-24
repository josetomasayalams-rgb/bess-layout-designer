import { nanoid } from "nanoid";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLocal, toLngLat } from "@/lib/geometry/projection";
import type { PlacedEquipment } from "@/types/equipment";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { ProjectCaseStudy } from "@/types/technical";

export type CaseStudyLayoutOptions = {
  startPoint: LngLat;
  orientationDeg?: number;
  bessColumnsPerBlock?: number;
  bessSpacingM?: number;
  stationGapM?: number;
  blockGapXM?: number;
  blockGapYM?: number;
};

function bestBlockColumns(
  blockCount: number,
  blockPitchXM: number,
  blockPitchYM: number
): number {
  let best = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= blockCount; columns++) {
    const rows = Math.ceil(blockCount / columns);
    const width = columns * blockPitchXM;
    const height = rows * blockPitchYM;
    const score = Math.abs(width - height);
    if (score < bestScore) {
      best = columns;
      bestScore = score;
    }
  }

  return best;
}

function translateRotated(
  origin: ReturnType<typeof toLocal>,
  xM: number,
  yM: number,
  orientationDeg: number
) {
  const radians = (orientationDeg * Math.PI) / 180;
  const alongX = { x: Math.cos(radians), y: Math.sin(radians) };
  const alongY = { x: -Math.sin(radians), y: Math.cos(radians) };

  return {
    x_m: origin.x_m + alongX.x * xM + alongY.x * yM,
    y_m: origin.y_m + alongX.y * xM + alongY.y * yM,
  };
}

export function generatedCaseStudyGroupPrefix(caseStudyId: string): string {
  return `${caseStudyId}:`;
}

export function generateCaseStudyConceptualLayout(
  caseStudy: ProjectCaseStudy,
  anchor: ProjectAnchor,
  options: CaseStudyLayoutOptions
): PlacedEquipment[] {
  const orientationDeg = options.orientationDeg ?? 0;
  const bessColumnsPerBlock = options.bessColumnsPerBlock ?? 4;
  const bessSpacingM = options.bessSpacingM ?? 3;
  const stationGapM = options.stationGapM ?? 6;
  const blockGapXM = options.blockGapXM ?? 12;
  const blockGapYM = options.blockGapYM ?? 10;
  const origin = toLocal(options.startPoint, anchor);

  const firstBlock = caseStudy.blockArchitecture[0];
  if (!firstBlock) return [];

  const bessSpec = equipmentCatalog.find(
    (spec) => spec.id === firstBlock.bessContainerSpecId
  );
  const stationSpec = equipmentCatalog.find(
    (spec) => spec.id === (firstBlock.mvSkidSpecId ?? firstBlock.pcsSpecId)
  );
  if (!bessSpec || !stationSpec) return [];

  const bessRowsPerBlock = Math.ceil(
    firstBlock.bessContainerQuantity / bessColumnsPerBlock
  );
  const matrixLengthM =
    (bessColumnsPerBlock - 1) * (bessSpec.footprint.length_m + bessSpacingM) +
    bessSpec.footprint.length_m;
  const matrixWidthM =
    (bessRowsPerBlock - 1) * (bessSpec.footprint.width_m + bessSpacingM) +
    bessSpec.footprint.width_m;
  const stationCenterXM =
    matrixLengthM - bessSpec.footprint.length_m / 2 + stationGapM + stationSpec.footprint.length_m / 2;
  const stationCenterYM = matrixWidthM / 2 - bessSpec.footprint.width_m / 2;
  const blockWidthM =
    stationCenterXM + stationSpec.footprint.length_m / 2 + bessSpec.footprint.length_m / 2;
  const blockHeightM = Math.max(matrixWidthM, stationSpec.footprint.width_m);
  const blockPitchXM = blockWidthM + blockGapXM;
  const blockPitchYM = blockHeightM + blockGapYM;
  const blockColumns = bestBlockColumns(
    caseStudy.blockArchitecture.length,
    blockPitchXM,
    blockPitchYM
  );

  const placed: PlacedEquipment[] = [];

  caseStudy.blockArchitecture.forEach((block, blockIndex) => {
    const blockColumn = blockIndex % blockColumns;
    const blockRow = Math.floor(blockIndex / blockColumns);
    const blockOriginXM = blockColumn * blockPitchXM;
    const blockOriginYM = blockRow * blockPitchYM;
    const groupId = `${generatedCaseStudyGroupPrefix(caseStudy.id)}${block.id}`;
    const blockBessSpec = equipmentCatalog.find(
      (spec) => spec.id === block.bessContainerSpecId
    );
    const blockStationSpec = equipmentCatalog.find(
      (spec) => spec.id === (block.mvSkidSpecId ?? block.pcsSpecId)
    );
    if (!blockBessSpec || !blockStationSpec) return;

    for (let index = 0; index < block.bessContainerQuantity; index++) {
      const row = Math.floor(index / bessColumnsPerBlock);
      const column = index % bessColumnsPerBlock;
      const local = translateRotated(
        origin,
        blockOriginXM + column * (blockBessSpec.footprint.length_m + bessSpacingM),
        blockOriginYM + row * (blockBessSpec.footprint.width_m + bessSpacingM),
        orientationDeg
      );

      placed.push({
        id: nanoid(8),
        equipmentSpecId: blockBessSpec.id,
        anchor: toLngLat(local, anchor),
        rotation_deg: orientationDeg,
        groupId,
        sourceReliability: blockBessSpec.source.reliability,
      });
    }

    const stationLocal = translateRotated(
      origin,
      blockOriginXM + stationCenterXM,
      blockOriginYM + stationCenterYM,
      orientationDeg
    );

    placed.push({
      id: nanoid(8),
      equipmentSpecId: blockStationSpec.id,
      anchor: toLngLat(stationLocal, anchor),
      rotation_deg: orientationDeg,
      groupId,
      sourceReliability: blockStationSpec.source.reliability,
    });
  });

  return placed;
}
