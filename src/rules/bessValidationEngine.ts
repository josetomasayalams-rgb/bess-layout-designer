import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLocal } from "@/lib/geometry/projection";
import { formatLength } from "@/lib/units/formatUnits";
import {
  distanceBetweenRectangles,
  distanceRectToPolygonBoundary,
  distancePointToPolyline,
  distancePolylineToPolyline,
} from "@/lib/geometry/distance";
import {
  rectanglesIntersect,
  allCornersInsidePolygon,
} from "@/lib/geometry/collision";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import type { CableRoute } from "@/types/cable";
import type { AccessRoad } from "@/types/road";
import type { LngLat, LocalPoint, ProjectAnchor, RotatedRectLocal } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type {
  RegulatoryDesignContext,
  RegulatoryProfile,
  TechnicalLayoutObject,
  TechnicalObjectType,
  ValidationIssue,
  ValidationResult,
  ValidationSeverity,
} from "@/types/bessLayoutTypes";
import {
  VEHICLE_ACCESS_MAX_DISTANCE_M,
  CABLE_TO_EQUIPMENT_CLEARANCE_M,
} from "@/data/defaultConstraints";

function technicalTypeFor(specId: string): TechnicalObjectType {
  const spec = equipmentCatalog.find((item) => item.id === specId);
  if (!spec) return "unknown";
  if (spec.type === "battery_container") return "bess_container";
  if (spec.type === "pcs_mv_station") return "pcs";
  if (spec.type === "mv_transformer") return "transformer";
  if (spec.type === "substation_area") return "switchgear";
  return "unknown";
}

export function placedToTechnicalObjects(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor | null
): TechnicalLayoutObject[] {
  if (!anchor) return [];

  return placed
    .map((item): TechnicalLayoutObject | null => {
      const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
      if (!spec) return null;
      return {
        id: item.id,
        type: technicalTypeFor(item.equipmentSpecId),
        placed: item,
        rect: {
          center: toLocal(item.anchor, anchor),
          length_m: spec.footprint.length_m,
          width_m: spec.footprint.width_m,
          rotation_deg: item.rotation_deg,
        },
        sourceReliability: item.sourceReliability,
      };
    })
    .filter((item): item is TechnicalLayoutObject => item !== null);
}

function hasTechnicalBasis(context: RegulatoryDesignContext): boolean {
  return (
    context.hasUl9540a ||
    context.hasHma ||
    context.hasLsft ||
    context.hasAhjApproval ||
    context.hasManufacturerManual
  );
}

function issue(args: {
  id: string;
  severity: ValidationSeverity;
  ruleId: string;
  ruleLabel: string;
  objectAId: string;
  objectBId?: string;
  measured_m?: number;
  required_m?: number;
  source: string;
  message: string;
  recommendation: string;
  basis?: ValidationIssue["basis"];
}): ValidationIssue {
  return {
    basis: args.basis ?? "conservative_criterion",
    ...args,
  };
}

// Constants imported from defaultConstraints

function rectConservativeRadius(rect: RotatedRectLocal): number {
  return Math.hypot(rect.length_m / 2, rect.width_m / 2);
}

function accessDistanceToObject(
  rect: RotatedRectLocal,
  accessRoads: AccessRoad[]
): number {
  if (accessRoads.length === 0) return Infinity;
  return Math.min(
    ...accessRoads.map((road) =>
      Math.max(0, distancePointToPolyline(rect.center, road.centerLine) - road.width_m / 2)
    )
  );
}

function cableClearanceToObject(route: CableRoute, rect: RotatedRectLocal): number {
  return Math.max(
    0,
    distancePointToPolyline(rect.center, route.path) -
      route.corridorWidth_m / 2 -
      rectConservativeRadius(rect)
  );
}

function cableRoadClearance(route: CableRoute, road: AccessRoad): number {
  return Math.max(
    0,
    distancePolylineToPolyline(route.path, road.centerLine) -
      route.corridorWidth_m / 2 -
      road.width_m / 2
  );
}

export function validateBessLayout(args: {
  placed: PlacedEquipment[];
  polygon: LngLat[];
  anchor: ProjectAnchor | null;
  profile: RegulatoryProfile;
  context: RegulatoryDesignContext;
}): ValidationResult {
  const { placed, polygon, anchor, profile, context } = args;
  const objects = placedToTechnicalObjects(placed, anchor);
  const localPolygon = anchor ? polygon.map((point) => toLocal(point, anchor)) : [];
  const issues: ValidationIssue[] = [];
  const compliantItems: ValidationIssue[] = [];
  let checkedRules = 0;

  const bessObjects = objects.filter((object) => object.type === "bess_container");
  const pcsObjects = objects.filter((object) => object.type === "pcs");
  const technicalBasis = hasTechnicalBasis(context);
  const physicalInfrastructure = generateConceptualPhysicalInfrastructure({
    placed,
    anchor,
    polygon,
  });

  // Geometric containment check (RULE-PHYS-001)
  if (localPolygon.length >= 3) {
    for (const object of objects) {
      checkedRules += 1;
      if (!allCornersInsidePolygon(object.rect, localPolygon)) {
        issues.push(
          issue({
            id: `phys-containment-${object.id}`,
            severity: "critical",
            ruleId: "equipment_inside_polygon",
            ruleLabel: "Equipment inside site polygon",
            objectAId: object.id,
            source: "Geometric layout check",
            basis: "user_defined",
            message: `Equipment ${object.id.slice(0, 6)} extends outside the site polygon.`,
            recommendation: "Reposition the equipment to keep it entirely within the property boundaries.",
          })
        );
      } else {
        compliantItems.push(
          issue({
            id: `ok-containment-${object.id}`,
            severity: "compliant",
            ruleId: "equipment_inside_polygon",
            ruleLabel: "Equipment inside site polygon",
            objectAId: object.id,
            source: "Geometric layout check",
            basis: "user_defined",
            message: "Equipment is entirely within the site boundary.",
            recommendation: "Keep the unit inside the polygon in final layouts.",
          })
        );
      }
    }
  }

  // Geometric footprint collision check (RULE-PHYS-002)
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      checkedRules += 1;
      const a = objects[i];
      const b = objects[j];
      if (rectanglesIntersect(a.rect, b.rect)) {
        issues.push(
          issue({
            id: `phys-collision-${a.id}-${b.id}`,
            severity: "critical",
            ruleId: "equipment_collision",
            ruleLabel: "No equipment footprint collisions",
            objectAId: a.id,
            objectBId: b.id,
            source: "Geometric layout check",
            basis: "user_defined",
            message: `Footprint collision detected between ${a.id.slice(0, 6)} and ${b.id.slice(0, 6)}.`,
            recommendation: "Adjust the placement or rotation of units to avoid physical overlap.",
          })
        );
      } else {
        compliantItems.push(
          issue({
            id: `ok-collision-${a.id}-${b.id}`,
            severity: "compliant",
            ruleId: "equipment_collision",
            ruleLabel: "No equipment footprint collisions",
            objectAId: a.id,
            objectBId: b.id,
            source: "Geometric layout check",
            basis: "user_defined",
            message: "Footprints do not overlap.",
            recommendation: "Maintain zero overlap in detail layouts.",
          })
        );
      }
    }
  }

  for (let i = 0; i < bessObjects.length; i++) {
    for (let j = i + 1; j < bessObjects.length; j++) {
      checkedRules += 1;
      const a = bessObjects[i];
      const b = bessObjects[j];
      const measured = distanceBetweenRectangles(a.rect, b.rect);
      const required = profile.rules.bessToBess_m;
      if (measured < required) {
        const severity: ValidationSeverity = technicalBasis ? "warning" : "critical";
        issues.push(
          issue({
            id: `reg-bess-bess-${a.id}-${b.id}`,
            severity,
            ruleId: "bess_to_bess_spacing",
            ruleLabel: "BESS to BESS separation",
            objectAId: a.id,
            objectBId: b.id,
            measured_m: measured,
            required_m: required,
            source: profile.source,
            message: `BESS ${a.id.slice(0, 6)} is ${formatLength(measured, { digits: 2 })} from BESS ${b.id.slice(0, 6)}. Active conservative criterion is ${formatLength(required, { digits: 2 })}.`,
            recommendation: technicalBasis
              ? "Keep visible warning and attach UL 9540A, HMA, LSFT, AHJ or manufacturer basis before reducing conservative spacing."
              : "Increase spacing or declare validated UL 9540A/HMA/LSFT/AHJ/manufacturer basis before using reduced distance.",
          })
        );
      } else {
        compliantItems.push(
          issue({
            id: `ok-bess-bess-${a.id}-${b.id}`,
            severity: "compliant",
            ruleId: "bess_to_bess_spacing",
            ruleLabel: "BESS to BESS separation",
            objectAId: a.id,
            objectBId: b.id,
            measured_m: measured,
            required_m: required,
            source: profile.source,
            message: "BESS to BESS separation meets the active criterion.",
            recommendation: "Confirm manufacturer and AHJ validation in the project record.",
          })
        );
        if (measured < 1.0) {
          issues.push(
            issue({
              id: `warn-bess-bess-submetric-${a.id}-${b.id}`,
              severity: "warning",
              ruleId: "bess_to_bess_submetric_warning",
              ruleLabel: "BESS submetric manufacturer spacing warning",
              objectAId: a.id,
              objectBId: b.id,
              measured_m: measured,
              required_m: 1.0,
              source: "Manufacturer clearance benchmark, potential fire/insurance risk",
              basis: "requires_validation",
              message: `BESS ${a.id.slice(0, 6)} is ${formatLength(measured, { digits: 2 })} from BESS ${b.id.slice(0, 6)}. Spacing is submetric and based on manufacturer clearance.`,
              recommendation: "The spacing may satisfy the selected manufacturer's mechanical or ventilation clearance, but it may be below insurance or fire-propagation mitigation criteria. Validate the layout with the manufacturer, insurer, and detailed engineering team.",
            })
          );
        }
      }
    }
  }

  if (localPolygon.length >= 3) {
    for (const bess of bessObjects) {
      checkedRules += 1;
      const measured = distanceRectToPolygonBoundary(bess.rect, localPolygon);
      const required = profile.rules.bessToPropertyLine_m;
      if (measured < required) {
        issues.push(
          issue({
            id: `reg-bess-property-${bess.id}`,
            severity: context.hasAhjApproval ? "warning" : "critical",
            ruleId: "bess_to_property_line",
            ruleLabel: "BESS to property line",
            objectAId: bess.id,
            measured_m: measured,
            required_m: required,
            source: profile.source,
            message: `BESS ${bess.id.slice(0, 6)} is ${formatLength(measured, { digits: 2 })} from the site boundary. Active conservative criterion is ${formatLength(required, { digits: 2 })}.`,
            recommendation: context.hasAhjApproval
              ? "Keep warning visible and attach AHJ/project approval basis."
              : "Move the BESS block farther from the property boundary or obtain AHJ/project-specific validation.",
          })
        );
      } else {
        compliantItems.push(
          issue({
            id: `ok-bess-property-${bess.id}`,
            severity: "compliant",
            ruleId: "bess_to_property_line",
            ruleLabel: "BESS to property line",
            objectAId: bess.id,
            measured_m: measured,
            required_m: required,
            source: profile.source,
            message: "BESS boundary setback meets the active criterion.",
            recommendation: "Confirm final setback with permitting and AHJ review.",
          })
        );
      }
    }
  }

  for (const pcs of pcsObjects) {
    for (const other of objects.filter((object) => object.id !== pcs.id)) {
      checkedRules += 1;
      const measured = distanceBetweenRectangles(pcs.rect, other.rect);
      const required = profile.rules.electricalFrontWorkingClearance_m;
      if (measured < required) {
        issues.push(
          issue({
            id: `reg-pcs-clearance-${pcs.id}-${other.id}`,
            severity: "critical",
            ruleId: "electrical_front_working_clearance",
            ruleLabel: "Electrical equipment working clearance",
            objectAId: pcs.id,
            objectBId: other.id,
            measured_m: measured,
            required_m: required,
            source:
              "Preliminary electrical working clearance criterion; manufacturer and electrical code review required.",
            message: `PCS ${pcs.id.slice(0, 6)} has ${formatLength(measured, { digits: 2 })} clearance to ${other.id.slice(0, 6)}. Preliminary required clearance is ${formatLength(required, { digits: 2 })}.`,
            recommendation:
              "Provide at least 0.9 m clear working space or manufacturer/electrical engineering basis for the final arrangement.",
          })
        );
      }
    }
  }

  if (bessObjects.length > 0 && !context.hasManufacturerManual) {
    issues.push(
      issue({
        id: "reg-missing-manufacturer-manual",
        severity: "warning",
        ruleId: "manufacturer_manual_required",
        ruleLabel: "Manufacturer manual validation",
        objectAId: "project",
        source: profile.source,
        basis: "requires_validation",
        message:
          "Manufacturer installation manual is not declared. Distances may be more restrictive than the active conservative profile.",
        recommendation:
          "Attach manufacturer installation requirements and compare them against the conservative regulatory profile.",
      })
    );
  }

  for (const object of objects) {
    checkedRules += 1;
    const measured = accessDistanceToObject(
      object.rect,
      physicalInfrastructure.accessRoads
    );
    if (measured > VEHICLE_ACCESS_MAX_DISTANCE_M) {
      issues.push(
        issue({
          id: `phys-access-${object.id}`,
          severity: "warning",
          ruleId: "vehicle_access_distance",
          ruleLabel: "Vehicle access to equipment",
          objectAId: object.id,
          measured_m: measured,
          required_m: VEHICLE_ACCESS_MAX_DISTANCE_M,
          source:
            "Preliminary O&M access assumption; validate with civil design, fire response and construction logistics.",
          basis: "user_defined",
          message: `Equipment ${object.id.slice(0, 6)} is ${formatLength(measured, { digits: 1 })} from the nearest conceptual access road. Preliminary target is ${formatLength(VEHICLE_ACCESS_MAX_DISTANCE_M, { digits: 1 })} or less.`,
          recommendation:
            "Add an internal road, widen the perimeter road strategy, or confirm equipment access with civil/O&M/fire response review.",
        })
      );
    } else if (Number.isFinite(measured)) {
      compliantItems.push(
        issue({
          id: `ok-phys-access-${object.id}`,
          severity: "compliant",
          ruleId: "vehicle_access_distance",
          ruleLabel: "Vehicle access to equipment",
          objectAId: object.id,
          measured_m: measured,
          required_m: VEHICLE_ACCESS_MAX_DISTANCE_M,
          source: "Preliminary O&M access assumption.",
          basis: "user_defined",
          message: "Equipment has conceptual road access within the preliminary target.",
          recommendation:
            "Validate final road width, turning radius and emergency access in civil design.",
        })
      );
    }
  }

  if (bessObjects.length > 0 && localPolygon.length < 3) {
    checkedRules += 1;
    issues.push(
      issue({
        id: "phys-fire-setback-not-evaluated",
        severity: "warning",
        ruleId: "fire_boundary_setback",
        ruleLabel: "Fire setback to site boundary",
        objectAId: "project",
        source:
          "Preliminary fire setback screen; requires site polygon and AHJ/fire engineer validation.",
        basis: "requires_validation",
        message:
          "Fire setback to the site boundary cannot be evaluated because no site polygon is defined.",
        recommendation:
          "Define the site polygon and validate setbacks with manufacturer, NFPA 855 reference, insurer, AHJ and Chilean permitting context.",
      })
    );
  }

  for (const route of physicalInfrastructure.cableRoutes) {
    for (const object of objects) {
      if (object.id === route.fromEntityId || object.id === route.toEntityId) {
        continue;
      }
      checkedRules += 1;
      const measured = cableClearanceToObject(route, object.rect);
      if (measured < CABLE_TO_EQUIPMENT_CLEARANCE_M) {
        issues.push(
          issue({
            id: `phys-cable-equipment-${route.id}-${object.id}`,
            severity: "warning",
            ruleId: "cable_route_equipment_clearance",
            ruleLabel: "Cable corridor clear of equipment",
            objectAId: route.id,
            objectBId: object.id,
            measured_m: measured,
            required_m: CABLE_TO_EQUIPMENT_CLEARANCE_M,
            source:
              "Conceptual cable corridor screen; detailed ductbank/trench routing is pending.",
            basis: "requires_validation",
            message: `Conceptual cable corridor ${route.id} is too close to equipment ${object.id.slice(0, 6)}.`,
            recommendation:
              "Route the MV corridor around equipment footprints and reserve a constructible cable corridor before basic engineering.",
          })
        );
      }
    }

    for (const road of physicalInfrastructure.accessRoads) {
      checkedRules += 1;
      const measured = cableRoadClearance(route, road);
      if (measured <= 0) {
        issues.push(
          issue({
            id: `phys-cable-road-${route.id}-${road.id}`,
            severity: "warning",
            ruleId: "cable_route_access_road_overlap",
            ruleLabel: "Cable corridor versus access road",
            objectAId: route.id,
            objectBId: road.id,
            measured_m: measured,
            required_m: 0.1,
            source:
              "Conceptual cable and access route screen; detailed trench/road crossing design is pending.",
            basis: "requires_validation",
            message: `Conceptual cable corridor ${route.id} overlaps access road ${road.id}.`,
            recommendation:
              "Resolve road crossings, ductbank protection, trench depth and maintainability in civil/electrical coordination.",
          })
        );
      }
    }
  }

  const criticalCount = issues.filter((item) => item.severity === "critical").length;
  const warningCount = issues.filter((item) => item.severity === "warning").length;
  const compliantCount = compliantItems.length;
  const projectStatus =
    checkedRules === 0
      ? "not_evaluated"
      : criticalCount > 0
        ? "non_compliant"
        : warningCount > 0
          ? "compliant_with_warnings"
          : "compliant";

  return {
    profile,
    context,
    projectStatus,
    checkedRules,
    compliantCount,
    warningCount,
    criticalCount,
    issues,
    compliantItems,
    objects,
    anchor,
  };
}
