import { useCallback } from "react";
import { useProjectStore } from "@/store/projectStore";

export function useDrawModeHandlers() {
  const addPolygonVertex = useProjectStore((s) => s.addPolygonVertex);
  const addRepairZoneVertex = useProjectStore((s) => s.addRepairZoneVertex);
  const placeEquipmentAt = useProjectStore((s) => s.placeEquipmentAt);

  const handleDrawingClick = useCallback(
    (lng: number, lat: number, interactionMode: string): boolean => {
      if (interactionMode === "draw-site") {
        addPolygonVertex({ lng, lat });
        return true;
      }
      if (interactionMode === "draw-repair-zone") {
        addRepairZoneVertex({ lng, lat });
        return true;
      }
      if (interactionMode === "place-equipment") {
        placeEquipmentAt({ lng, lat });
        return true;
      }
      return false;
    },
    [addPolygonVertex, addRepairZoneVertex, placeEquipmentAt]
  );

  return {
    handleDrawingClick,
  };
}
