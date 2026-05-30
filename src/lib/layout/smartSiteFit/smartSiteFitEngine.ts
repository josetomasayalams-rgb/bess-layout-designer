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
import { getSmartSiteFitPresetById } from "./smartSiteFitPresets";
import type { SmartSiteFitPreset } from "./smartSiteFitTypes";

export function runSmartSiteFit(input: SmartSiteFitInput): SmartSiteFitResult {
  // A duration micro-adjustment override (set when recalculating a selected
  // alternative) takes precedence over the original request duration.
  const durationHours =
    input.overrides?.durationHours ?? input.durationHours ?? 4;
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

  // Resolve the selected BESS-system preset (Sungrow by default) so the engine
  // can branch between separate-PCS and integrated architectures.
  const preset = getSmartSiteFitPresetById(input.presetId);

  if (input.mode === "target") {
    return runTargetSizing(input, localPolygon, anchor, durationHours, strategy, preset);
  } else {
    return runTerrainSizing(input, localPolygon, anchor, durationHours, strategy, preset);
  }
}

export function runTargetSizing(
  input: SmartSiteFitInput,
  localPolygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  strategy: "max_capacity" | "balanced" | "conservative",
  preset?: SmartSiteFitPreset
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
    deadlineAt,
    preset
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
  strategy: "max_capacity" | "balanced" | "conservative",
  preset?: SmartSiteFitPreset
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
      deadlineAt,
      preset
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

  // We keep one best candidate per strategy. On small terrains two strategies
  // may still collapse to the same size; we de-duplicate those genuinely
  // identical layouts, keeping the higher-scoring representative, and then
  // explain to the user when fewer than three distinct alternatives are viable.
  // Architecture-agnostic size signature: a multiset of equipmentSpecId counts.
  // Works for Sungrow (BESS + PCS ids) and integrated presets (a single unit id)
  // without hardcoding any catalog id.
  const sizeKey = (c: SmartSiteFitCandidate) => {
    const counts = new Map<string, number>();
    for (const e of c.placedEquipment) {
      counts.set(e.equipmentSpecId, (counts.get(e.equipmentSpecId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([id, n]) => `${id}:${n}`)
      .join("|");
  };

  const bySize = new Map<string, SmartSiteFitCandidate>();
  for (const c of bestPerStrategy) {
    const key = sizeKey(c);
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

  // Explain why fewer than three distinct alternatives were produced: the
  // terrain only admits a limited range of preliminary sizes.
  const baseWarnings = selected?.warnings ?? [];
  const warnings =
    finalAlternatives.length < 3
      ? [
          ...baseWarnings,
          {
            id: "limited-terrain-alternatives",
            severity: "info" as const,
            message:
              finalAlternatives.length === 1
                ? "El terreno solo admite una alternativa de predimensionamiento distinta; las estrategias convergen a la misma cabida preliminar."
                : "El terreno solo admite dos alternativas de predimensionamiento distintas; dos estrategias convergen a la misma cabida preliminar.",
          },
        ]
      : baseWarnings;

  return {
    success: true,
    candidates: finalAlternatives,
    selected,
    warnings,
    assumptions: selected?.assumptions ?? [],
    fallbackUsed: false,
    message: "Dimensionamiento por terreno completado exitosamente.",
  };
}
