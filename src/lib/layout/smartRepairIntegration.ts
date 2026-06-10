import {
  repairLayout,
  type LayoutRepairRequest,
  type LayoutRepairResult,
  type SmartRepairDiagnostics,
} from "@/lib/layout/layoutRepair";
import { planSmartLayoutRepair } from "@/lib/layout/smartRepairLayout";
import type { ProjectAnchor } from "@/types/geometry";

function resolvedCount(before: number, after: number): number {
  return Math.max(0, before - after);
}

function buildSmartDiagnostics(
  geometric: LayoutRepairResult,
  smartPlan: ReturnType<typeof planSmartLayoutRepair>
): SmartRepairDiagnostics {
  const geometricInitial = geometric.diagnostics.initialConflicts;
  const geometricRemaining = geometric.diagnostics.remainingConflicts;
  const cableEquipmentBefore = smartPlan.baseline.cableEquipmentCount;
  const cableEquipmentAfter = smartPlan.proposed.cableEquipmentCount;
  const cableRoadBefore = smartPlan.baseline.cableRoadCount;
  const cableRoadAfter = smartPlan.proposed.cableRoadCount;
  const autoRepairableBefore =
    geometricInitial + cableEquipmentBefore + cableRoadBefore;
  const autoRepairableAfter =
    geometricRemaining + cableEquipmentAfter + cableRoadAfter;

  return {
    geometricInitialConflicts: geometricInitial,
    geometricRemainingConflicts: geometricRemaining,
    geometricResolvedConflicts: resolvedCount(geometricInitial, geometricRemaining),
    cableEquipmentBefore,
    cableEquipmentAfter,
    cableEquipmentResolved: resolvedCount(cableEquipmentBefore, cableEquipmentAfter),
    cableRoadBefore,
    cableRoadAfter,
    cableRoadResolved: resolvedCount(cableRoadBefore, cableRoadAfter),
    autoRepairableBefore,
    autoRepairableAfter,
    autoRepairableResolved: resolvedCount(autoRepairableBefore, autoRepairableAfter),
    notAutoRepairable: [
      {
        ruleId: "vehicle_access_distance",
        label: "Vehicle access to equipment",
        reason:
          "Requires civil access-road layout changes, not only equipment relocation.",
      },
      {
        ruleId: "detailed_cable_road_design",
        label: "Detailed cable/road crossing design",
        reason:
          "Remaining crossings require ductbank, casing, trench depth and maintainability design.",
      },
      {
        ruleId: "manual_validation",
        label: "Manual regulatory validation",
        reason:
          "Manufacturer, AHJ, insurer, fire and detailed engineering evidence cannot be generated automatically.",
      },
    ],
  };
}

function smartMessage(
  status: LayoutRepairResult["status"],
  diagnostics: SmartRepairDiagnostics
): string {
  const resolved = diagnostics.autoRepairableResolved;
  const remaining = diagnostics.autoRepairableAfter;
  if (resolved === 0) {
    return "Reparación Inteligente found no safe automatic improvement. Vehicle access and manual validation remain outside automatic repair.";
  }
  if (remaining === 0 && status === "success") {
    return `Reparación Inteligente resolved ${resolved} automatic issue(s): geometry, cable-equipment and cable-road checks are clear.`;
  }
  return `Reparación Inteligente resolved ${resolved} automatic issue(s); ${remaining} automatic issue(s) remain. Vehicle access and manual validation still require engineering review.`;
}

function repairAnchor(request: LayoutRepairRequest): ProjectAnchor | null {
  return (
    request.anchor ??
    (request.placed[0]
      ? {
          lng0: request.placed[0].anchor.lng,
          lat0: request.placed[0].anchor.lat,
        }
      : null)
  );
}

export function runSmartRepair(
  request: LayoutRepairRequest
): LayoutRepairResult {
  const geometric = repairLayout(request);
  const sourcePlaced =
    geometric.status === "error" ? request.placed : geometric.placed;
  const smartPlan = planSmartLayoutRepair({
    placed: sourcePlaced,
    anchor: repairAnchor(request),
    polygon: request.polygon,
    rules: request.rules,
    lockedIds: request.lockedIds,
    repairZone: request.repairZone,
  });
  const smartDiagnostics = buildSmartDiagnostics(geometric, smartPlan);
  const placed = smartPlan.improved ? smartPlan.placed : sourcePlaced;
  const automaticImproved = smartDiagnostics.autoRepairableResolved > 0;
  const automaticRemaining = smartDiagnostics.autoRepairableAfter;

  let status = geometric.status;
  if (automaticRemaining === 0 && (geometric.status !== "error" || automaticImproved)) {
    status = "success";
  } else if (automaticImproved) {
    status = "partial";
  }

  return {
    ...geometric,
    status,
    message: smartMessage(status, smartDiagnostics),
    placed,
    diagnostics: {
      ...geometric.diagnostics,
      movedCount:
        geometric.diagnostics.movedCount + smartPlan.summary.movedCount,
      smartRepair: smartDiagnostics,
    },
  };
}
