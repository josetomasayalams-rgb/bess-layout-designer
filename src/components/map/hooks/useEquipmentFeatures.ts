import { useMemo } from "react";
import type { FilterSpecification } from "maplibre-gl";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { resolveEquipment3DVisualProfile } from "@/data/equipment3dVisualProfiles";
import {
  equipmentToFeatures,
  equipment3DDetailFeatures,
  equipment3DLabelFeatures,
} from "@/lib/layout/mapFeatures";

interface UseEquipmentFeaturesParams {
  displayedPlaced: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  selectedEquipmentId: string | null;
  layoutEditSelectedIds: string[];
  hasLayoutDraft: boolean;
  hasTerrainFitDraft: boolean;
  layerVisibility: {
    bessContainers: boolean;
    pcs: boolean;
    transformers: boolean;
    threeD: boolean;
  };
  viewMode: string;
}

export function useEquipmentFeatures({
  displayedPlaced,
  anchor,
  selectedEquipmentId,
  layoutEditSelectedIds,
  hasLayoutDraft,
  hasTerrainFitDraft,
  layerVisibility,
  viewMode,
}: UseEquipmentFeaturesParams) {
  const equipmentFc = useMemo(
    () =>
      equipmentToFeatures(
        displayedPlaced,
        anchor,
        selectedEquipmentId,
        layoutEditSelectedIds,
        hasLayoutDraft
          ? layoutEditSelectedIds
          : hasTerrainFitDraft
            ? displayedPlaced.map((item) => item.id)
            : []
      ),
    [
      displayedPlaced,
      anchor,
      selectedEquipmentId,
      layoutEditSelectedIds,
      hasLayoutDraft,
      hasTerrainFitDraft,
    ]
  );

  const equipment3DDetailsFc = useMemo(
    () => equipment3DDetailFeatures(displayedPlaced, anchor),
    [displayedPlaced, anchor]
  );

  const equipment3DLabelsFc = useMemo(
    () => equipment3DLabelFeatures(displayedPlaced, anchor),
    [displayedPlaced, anchor]
  );

  const selectedSpec = useMemo(() => {
    const selected = displayedPlaced.find((item) => item.id === selectedEquipmentId);
    return selected
      ? equipmentCatalog.find((item) => item.id === selected.equipmentSpecId)
      : null;
  }, [displayedPlaced, selectedEquipmentId]);

  const selectedVisualProfile = useMemo(
    () => resolveEquipment3DVisualProfile(selectedSpec),
    [selectedSpec]
  );

  const equipmentVisibleTypes = useMemo(() => {
    const types: string[] = [];
    if (layerVisibility.bessContainers) types.push("battery_container");
    if (layerVisibility.pcs) types.push("pcs_mv_station");
    if (layerVisibility.transformers) types.push("mv_transformer");
    return types;
  }, [
    layerVisibility.bessContainers,
    layerVisibility.pcs,
    layerVisibility.transformers,
  ]);

  const equipmentTypeFilter = useMemo<FilterSpecification>(
    () =>
      (equipmentVisibleTypes.length > 0
        ? ["match", ["get", "type"], equipmentVisibleTypes, true, false]
        : ["==", ["get", "type"], "__hidden__"]) as unknown as FilterSpecification,
    [equipmentVisibleTypes]
  );

  const equipmentAnd3DFilter = useMemo<FilterSpecification>(
    () =>
      ["all", equipmentTypeFilter, ["==", ["get", "has3D"], true]] as unknown as FilterSpecification,
    [equipmentTypeFilter]
  );

  const equipmentLockedFilter = useMemo<FilterSpecification>(
    () =>
      ["all", equipmentTypeFilter, ["==", ["get", "locked"], true]] as unknown as FilterSpecification,
    [equipmentTypeFilter]
  );

  const threeDVisible = viewMode === "iso" && layerVisibility.threeD;

  return {
    equipmentFc,
    equipment3DDetailsFc,
    equipment3DLabelsFc,
    selectedSpec,
    selectedVisualProfile,
    equipmentTypeFilter,
    equipmentAnd3DFilter,
    equipmentLockedFilter,
    threeDVisible,
  };
}
