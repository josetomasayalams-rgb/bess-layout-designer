import { nanoid } from "nanoid";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type {
  SmartSiteFitCandidate,
  SmartSiteFitStrategy,
  SmartSiteFitWarning,
  SmartSiteFitAssumption,
  SmartSiteFitOverrides,
} from "./smartSiteFitTypes";
import { getContainersPerPcsForDuration } from "./smartSiteFitPresets";
import { toLngLat } from "@/lib/geometry/projection";
import { analyzePolygon } from "./smartSiteFitGeometry";

export function generateCandidates(
  polygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  strategy: SmartSiteFitStrategy,
  overrides?: SmartSiteFitOverrides,
  targetMW?: number,
  targetMWh?: number
): SmartSiteFitCandidate[] {
  if (polygon.length < 3) return [];

  const analysis = analyzePolygon(polygon);
  const centroid = analysis.centroid;
  const dominantAngle = analysis.orientationDeg;

  // Spacings based on strategy
  let bessToBess = 3.0;
  let bessToPcs = 3.0;
  let pcsToPcs = 3.0;

  if (strategy === "max_capacity") {
    bessToBess = 2.5;
    bessToPcs = 2.5;
    pcsToPcs = 2.5;
  } else if (strategy === "conservative") {
    bessToBess = 4.0;
    bessToPcs = 4.0;
    pcsToPcs = 4.0;
  }

  // Apply overrides if present
  if (overrides) {
    if (overrides.bessToBess_m !== undefined) bessToBess = overrides.bessToBess_m;
    if (overrides.bessToPcs_m !== undefined) bessToPcs = overrides.bessToPcs_m;
    if (overrides.pcsToPcs_m !== undefined) pcsToPcs = overrides.pcsToPcs_m;
  }

  const bessPerPcs = getContainersPerPcsForDuration(durationHours);

  // Equipment dimensions (Sungrow specs)
  const bessLength = 9.34;
  const bessWidth = 1.73;
  const pcsLength = 6.058;
  const pcsWidth = 2.438;

  // Block length along row: PCS + spacing + N * (BESS + spacing) - spacing
  const blockLength = pcsLength + bessToPcs + bessPerPcs * (bessLength + bessToBess) - bessToBess;
  const blockWidth = Math.max(pcsWidth, bessWidth);

  // Determine target block count
  let targetBlockCount = 1;
  const isTargetMode = targetMW !== undefined || targetMWh !== undefined;

  if (isTargetMode) {
    // 5 MW per PCS station
    const pcsFromPower = targetMW ? Math.ceil(targetMW / 5.0) : 0;
    // 2.752 MWh per BESS container
    const bessNeeded = targetMWh ? Math.ceil(targetMWh / 2.752) : 0;
    const pcsFromEnergy = Math.ceil(bessNeeded / bessPerPcs);
    targetBlockCount = Math.max(1, Math.max(pcsFromPower, pcsFromEnergy));
  } else {
    // Terrain mode: calculate max blocks based on polygon area
    // Approximate block footprint area including spacing
    const blockArea = (blockLength + pcsToPcs) * (blockWidth + bessToBess);
    const maxTheoreticalBlocks = Math.max(1, Math.floor(analysis.area_m2 / blockArea));
    targetBlockCount = Math.min(100, maxTheoreticalBlocks);
  }

  // Pre-configured warnings & assumptions
  const warnings: SmartSiteFitWarning[] = [
    {
      id: "sungrow-integrated-transformer",
      severity: "info",
      message: "SC5000UD-MV integra transformador BT/MT y no se debe crear transformador separado.",
    },
  ];

  const assumptions: SmartSiteFitAssumption[] = [
    {
      id: "bess-model",
      description: "Modelo de BESS utilizado",
      value: "sungrow-st2752ux-us",
      classification: "preliminary_assumption",
    },
    {
      id: "pcs-model",
      description: "Modelo de PCS utilizado",
      value: "sungrow-sc5000ud-mv-us-p3",
      classification: "preliminary_assumption",
    },
    {
      id: "bess-pcs-ratio",
      description: "Relación de BESS a PCS basada en duración de diseño",
      value: `${bessPerPcs}:1`,
      classification: "preliminary_assumption",
    },
  ];

  const candidates: SmartSiteFitCandidate[] = [];
  const rotations = [dominantAngle, dominantAngle + 90, 0, 90];
  const gridShiftsX = [-10, 0, 10];
  const gridShiftsY = [-10, 0, 10];

  let candidateCount = 0;
  const maxCandidatesToEvaluate = 100;

  for (const rotationDeg of rotations) {
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (const dx of gridShiftsX) {
      for (const dy of gridShiftsY) {
        if (candidateCount >= maxCandidatesToEvaluate) break;

        const startCenterX = centroid.x_m + dx;
        const startCenterY = centroid.y_m + dy;

        // Try different capacity levels to speed up candidate generation
        const blockCountsToTry = isTargetMode
          ? [targetBlockCount]
          : Array.from(new Set([targetBlockCount, Math.floor(targetBlockCount * 0.75), Math.floor(targetBlockCount * 0.5)]))
              .filter((v) => v > 0)
              .sort((a, b) => b - a);

        for (const blocks of blockCountsToTry) {
          if (candidateCount >= maxCandidatesToEvaluate) break;

          // Determine grid rows and columns
          const maxCols = Math.max(1, Math.floor(Math.sqrt(blocks)));
          const cols = Math.min(blocks, maxCols);
          const rows = Math.ceil(blocks / cols);

          const placedEquipment: PlacedEquipment[] = [];

          // Helper to place item and rotate it
          const addEquipment = (
            specId: string,
            localBlockX: number,
            localBlockY: number,
            blockIndex: number
          ) => {
            const rx = startCenterX + localBlockX * cos - localBlockY * sin;
            const ry = startCenterY + localBlockX * sin + localBlockY * cos;
            const lngLat = toLngLat({ x_m: rx, y_m: ry }, anchor);

            placedEquipment.push({
              id: nanoid(8),
              equipmentSpecId: specId,
              anchor: lngLat,
              rotation_deg: rotationDeg,
              groupId: `block-${blockIndex}`,
              blockId: `block-${blockIndex}`,
              classification: "preliminary_assumption",
              sourceReliability: "preliminary_assumption",
            });
          };

          let placedBlocks = 0;
          for (let r = 0; r < rows; r++) {
            if (placedBlocks >= blocks) break;
            for (let c = 0; c < cols; c++) {
              if (placedBlocks >= blocks) break;

              const blockIndex = placedBlocks;
              placedBlocks++;

              // Offset of this block center relative to the grid center
              // Row index gives Y offset, Column index gives X offset
              const gridOffsetBlockX = (c - (cols - 1) / 2) * (blockLength + pcsToPcs);
              const gridOffsetBlockY = (r - (rows - 1) / 2) * (blockWidth + bessToBess);

              // Inside the block, PCS at x = -blockLength / 2 + pcsLength / 2
              const pcsBlockLocalX = -blockLength / 2 + pcsLength / 2;
              addEquipment(
                "sungrow-sc5000ud-mv-us-p3",
                gridOffsetBlockX + pcsBlockLocalX,
                gridOffsetBlockY,
                blockIndex
              );

              // BESS units starting after PCS
              for (let b = 0; b < bessPerPcs; b++) {
                const bessBlockLocalX =
                  -blockLength / 2 +
                  pcsLength +
                  bessToPcs +
                  b * (bessLength + bessToBess) +
                  bessLength / 2;
                addEquipment(
                  "sungrow-st2752ux-us",
                  gridOffsetBlockX + bessBlockLocalX,
                  gridOffsetBlockY,
                  blockIndex
                );
              }
            }
          }

          candidates.push({
            id: nanoid(8),
            strategy,
            placedEquipment,
            score: {
              total: 0,
              insidePolygon: 0,
              noCollisions: 0,
              boundaryMargin: 0,
              siteUtilization: 0,
              rowRegularity: 0,
              corridorEfficiency: 0,
              ratioCompliance: 0,
            },
            warnings,
            assumptions,
          });

          candidateCount++;
        }
      }
    }
  }

  return candidates;
}
