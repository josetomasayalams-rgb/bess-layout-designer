import { useMemo } from "react";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type { RegulatoryProfile } from "@/types/bessLayoutTypes";
import type { CableRoute } from "@/types/cable";
import type { AccessRoad } from "@/types/road";
import type { POI } from "@/types/electrical";
import { regulatoryBufferFeatures } from "@/lib/layout/mapFeatures";
import {
  accessRoadCorridorFeatures,
  accessRoadLineFeatures,
} from "@/lib/layout/accessRoads";
import {
  cableRouteCorridorFeatures,
  cableRouteLineFeatures,
} from "@/lib/layout/cableRoutes";
import {
  generateConceptualPhysicalInfrastructure,
  layoutZoneFeatures,
  layoutZoneLabelFeatures,
} from "@/lib/layout/physicalInfrastructure";

interface UseLayoutInfrastructureFeaturesParams {
  displayedPlaced: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  poi: POI | null;
  hasTerrainFitDraft: boolean;
  previewCableRoutes: CableRoute[];
  previewAccessRoads: AccessRoad[];
  storedCableRoutes: CableRoute[];
  storedAccessRoads: AccessRoad[];
  profile: RegulatoryProfile | null;
}

export function useLayoutInfrastructureFeatures({
  displayedPlaced,
  anchor,
  polygon,
  poi,
  hasTerrainFitDraft,
  previewCableRoutes,
  previewAccessRoads,
  storedCableRoutes,
  storedAccessRoads,
  profile,
}: UseLayoutInfrastructureFeaturesParams) {
  const bufferFc = useMemo(
    () =>
      profile
        ? regulatoryBufferFeatures(displayedPlaced, anchor, profile)
        : { type: "FeatureCollection" as const, features: [] },
    [displayedPlaced, anchor, profile]
  );

  const conceptualInfrastructure = useMemo(
    () =>
      generateConceptualPhysicalInfrastructure({
        placed: displayedPlaced,
        anchor,
        polygon,
        hasPoi: !!poi,
      }),
    [displayedPlaced, anchor, polygon, poi]
  );

  const renderedCableRoutes = useMemo(
    () =>
      hasTerrainFitDraft && previewCableRoutes.length > 0
        ? previewCableRoutes
        : storedCableRoutes.length > 0
          ? storedCableRoutes
          : conceptualInfrastructure.cableRoutes,
    [hasTerrainFitDraft, previewCableRoutes, storedCableRoutes, conceptualInfrastructure.cableRoutes]
  );

  const renderedAccessRoads = useMemo(
    () =>
      hasTerrainFitDraft && previewAccessRoads.length > 0
        ? previewAccessRoads
        : storedAccessRoads.length > 0
          ? storedAccessRoads
          : conceptualInfrastructure.accessRoads,
    [hasTerrainFitDraft, previewAccessRoads, storedAccessRoads, conceptualInfrastructure.accessRoads]
  );

  const layoutZoneFc = useMemo(
    () => layoutZoneFeatures(conceptualInfrastructure.layoutZones, anchor),
    [conceptualInfrastructure.layoutZones, anchor]
  );

  const layoutZoneLabelFc = useMemo(
    () => layoutZoneLabelFeatures(conceptualInfrastructure.layoutZones, anchor),
    [conceptualInfrastructure.layoutZones, anchor]
  );

  const cableRouteCorridorFc = useMemo(
    () => cableRouteCorridorFeatures(renderedCableRoutes, anchor),
    [renderedCableRoutes, anchor]
  );

  const cableRouteLineFc = useMemo(
    () => cableRouteLineFeatures(renderedCableRoutes, anchor),
    [renderedCableRoutes, anchor]
  );

  const accessRoadCorridorFc = useMemo(
    () => accessRoadCorridorFeatures(renderedAccessRoads, anchor),
    [renderedAccessRoads, anchor]
  );

  const accessRoadLineFc = useMemo(
    () => accessRoadLineFeatures(renderedAccessRoads, anchor),
    [renderedAccessRoads, anchor]
  );

  return {
    bufferFc,
    layoutZoneFc,
    layoutZoneLabelFc,
    cableRouteCorridorFc,
    cableRouteLineFc,
    accessRoadCorridorFc,
    accessRoadLineFc,
  };
}
