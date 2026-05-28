import type { LocalPoint, ProjectAnchor } from "@/types/geometry";
import type {
  SmartSiteFitInput,
  SmartSiteFitResult,
  SmartSiteFitCandidate,
} from "./smartSiteFitTypes";
import { generateCandidates } from "./smartSiteFitCandidates";
import { rankSmartSiteFitCandidates } from "./smartSiteFitScoring";
import { toLocal } from "@/lib/geometry/projection";
import { validatePolygonForSmartSiteFit } from "./smartSiteFitGeometry";

export function runSmartSiteFit(input: SmartSiteFitInput): SmartSiteFitResult {
  const durationHours = input.durationHours ?? 4;
  const strategy = input.strategy ?? "balanced";

  // Check if polygon is provided
  if (!input.polygon || input.polygon.length === 0) {
    return {
      success: false,
      candidates: [],
      selected: null,
      warnings: [
        {
          id: "missing-polygon",
          severity: "error",
          message: "Falta el polígono del terreno para ejecutar SmartSiteFit.",
        },
      ],
      assumptions: [],
      fallbackUsed: true,
      message: "Falta el polígono del terreno.",
    };
  }

  // Resolve anchor
  const anchor: ProjectAnchor = input.anchor ?? {
    lng0: input.polygon[0].lng,
    lat0: input.polygon[0].lat,
  };

  // Convert polygon to local coordinates
  const localPolygon: LocalPoint[] = input.polygon.map((p) => toLocal(p, anchor));

  // Validate polygon
  const validation = validatePolygonForSmartSiteFit(localPolygon);
  if (!validation.valid) {
    return {
      success: false,
      candidates: [],
      selected: null,
      warnings: [
        {
          id: "invalid-polygon",
          severity: "warning",
          message: validation.error ?? "Polígono inválido para SmartSiteFit.",
        },
      ],
      assumptions: [],
      fallbackUsed: true,
      message: validation.error ?? "Polígono inválido.",
    };
  }

  if (input.mode === "target") {
    return runTargetSizing(input, localPolygon, anchor, durationHours, strategy);
  } else {
    return runTerrainSizing(input, localPolygon, anchor, durationHours, strategy);
  }
}

export function runTargetSizing(
  input: SmartSiteFitInput,
  localPolygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  strategy: "max_capacity" | "balanced" | "conservative"
): SmartSiteFitResult {
  const targetMW = input.targetMW ?? 10;
  const targetMWh = input.targetMWh ?? (targetMW * durationHours);

  // Generate candidates specifically matching the target size
  const candidates = generateCandidates(
    localPolygon,
    anchor,
    durationHours,
    strategy,
    input.overrides,
    targetMW,
    targetMWh
  );

  if (candidates.length === 0) {
    return {
      success: true,
      candidates: [],
      selected: null,
      warnings: [
        {
          id: "no-candidates-found",
          severity: "warning",
          message: "No se pudieron generar alternativas que se ajustaran al terreno.",
        },
      ],
      assumptions: [],
      fallbackUsed: true,
      message: "No se encontraron candidatos.",
    };
  }

  // Score and rank candidates
  const ranked = rankSmartSiteFitCandidates(candidates, localPolygon, anchor, durationHours);

  // Keep only the single best alternative for target sizing
  const selected = ranked[0];

  return {
    success: true,
    candidates: selected ? [selected] : [],
    selected: selected || null,
    warnings: selected?.warnings ?? [],
    assumptions: selected?.assumptions ?? [],
    fallbackUsed: false,
    message: "Dimensionamiento por capacidad objetivo completado exitosamente.",
  };
}

export function runTerrainSizing(
  input: SmartSiteFitInput,
  localPolygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  strategy: "max_capacity" | "balanced" | "conservative"
): SmartSiteFitResult {
  // Generate candidates for multiple strategies or search spaces
  // Let's generate candidates for the active strategy first
  const candidates = generateCandidates(
    localPolygon,
    anchor,
    durationHours,
    strategy,
    input.overrides
  );

  if (candidates.length === 0) {
    return {
      success: true,
      candidates: [],
      selected: null,
      warnings: [
        {
          id: "no-candidates-found",
          severity: "warning",
          message: "No se pudieron generar alternativas en el polígono seleccionado.",
        },
      ],
      assumptions: [],
      fallbackUsed: true,
      message: "No se encontraron candidatos.",
    };
  }

  // Score and rank candidates
  const ranked = rankSmartSiteFitCandidates(candidates, localPolygon, anchor, durationHours);

  // Filter candidates to get unique diverse alternatives (e.g. up to 3 distinct capacities/configurations)
  const uniqueAlternatives: SmartSiteFitCandidate[] = [];
  const seenSizes = new Set<string>();

  for (const c of ranked) {
    const bessCount = c.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-st2752ux-us"
    ).length;
    const key = `${c.strategy}-${bessCount}`;
    if (!seenSizes.has(key)) {
      seenSizes.add(key);
      uniqueAlternatives.push(c);
    }
    if (uniqueAlternatives.length >= 3) break;
  }

  // Fallback to top ranked if we couldn't differentiate
  const finalAlternatives =
    uniqueAlternatives.length > 0 ? uniqueAlternatives : ranked.slice(0, 3);
  const selected = finalAlternatives[0] || null;

  return {
    success: true,
    candidates: finalAlternatives,
    selected,
    warnings: selected?.warnings ?? [],
    assumptions: selected?.assumptions ?? [],
    fallbackUsed: false,
    message: "Dimensionamiento maximizando terreno completado exitosamente.",
  };
}
