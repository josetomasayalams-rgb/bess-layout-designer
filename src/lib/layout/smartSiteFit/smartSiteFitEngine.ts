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
import { DEFAULT_PERFORMANCE_BUDGET } from "./smartSiteFitPerformance";

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

  // Bound total compute time so giant scenarios degrade to a best-so-far result
  // (with a performance_budget_reached warning) instead of freezing the UI.
  const deadlineAt = Date.now() + DEFAULT_PERFORMANCE_BUDGET.hardTimeoutMs;

  // Generate candidates specifically matching the target size
  const candidates = generateCandidates(
    localPolygon,
    anchor,
    durationHours,
    strategy,
    input.overrides,
    targetMW,
    targetMWh,
    100,
    DEFAULT_PERFORMANCE_BUDGET,
    deadlineAt
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
  // Terrain mode derives capacity from the polygon. We explore all three
  // strategies so the user gets genuinely distinct conservative / balanced /
  // max_capacity alternatives instead of three near-identical layouts.
  const strategies: Array<"max_capacity" | "balanced" | "conservative"> = [
    "max_capacity",
    "balanced",
    "conservative",
  ];

  // Spread the candidate budget across the three strategies to keep the
  // overall terrain sweep within the same performance envelope as a single run.
  // One shared deadline across all three strategies bounds total wall time.
  const perStrategyBudget = 40;
  const deadlineAt = Date.now() + DEFAULT_PERFORMANCE_BUDGET.hardTimeoutMs;
  const bestPerStrategy: SmartSiteFitCandidate[] = [];
  for (const s of strategies) {
    const candidates = generateCandidates(
      localPolygon,
      anchor,
      durationHours,
      s,
      input.overrides,
      undefined,
      undefined,
      perStrategyBudget,
      DEFAULT_PERFORMANCE_BUDGET,
      deadlineAt
    );
    if (candidates.length === 0) continue;
    const ranked = rankSmartSiteFitCandidates(candidates, localPolygon, anchor, durationHours);
    if (ranked[0]) bestPerStrategy.push(ranked[0]);
  }

  if (bestPerStrategy.length === 0) {
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
      message: "No se encontraron candidatos viables para este terreno.",
    };
  }

  // De-duplicate strategies that collapsed to the same size (small terrains),
  // keeping the higher-scoring representative.
  const bySize = new Map<string, SmartSiteFitCandidate>();
  for (const c of bestPerStrategy) {
    const bessCount = c.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-st2752ux-us"
    ).length;
    const pcsCount = c.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3"
    ).length;
    const key = `${bessCount}-${pcsCount}`;
    const existing = bySize.get(key);
    if (!existing || c.score.total > existing.score.total) {
      bySize.set(key, c);
    }
  }

  // Order alternatives so the active strategy leads, then by score.
  const finalAlternatives = Array.from(bySize.values())
    .sort((a, b) => {
      if (a.strategy === strategy && b.strategy !== strategy) return -1;
      if (b.strategy === strategy && a.strategy !== strategy) return 1;
      return b.score.total - a.score.total;
    })
    .slice(0, 3);

  const selected = finalAlternatives[0] || null;

  return {
    success: true,
    candidates: finalAlternatives,
    selected,
    warnings: selected?.warnings ?? [],
    assumptions: selected?.assumptions ?? [],
    fallbackUsed: false,
    message: "Dimensionamiento por terreno completado exitosamente.",
  };
}
