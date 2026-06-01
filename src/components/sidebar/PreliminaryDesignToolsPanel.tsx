"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Wrench } from "lucide-react";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import { gridShapeOptions } from "@/lib/layout/preliminaryLayoutGenerator";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SizingContainerSection, LayoutRepairSection } from "./design-tools";

const DEFAULT_BESS_SPEC_ID = "bess-sungrow-st2752ux-us";
const DEFAULT_PCS_SPEC_ID = "mvskid-sungrow-sc5000ud-mv-desierto";

export function PreliminaryDesignToolsPanel() {
  const [batteryContainerSpecId, setBatteryContainerSpecId] =
    useState(DEFAULT_BESS_SPEC_ID);
  const [pcsSpecId, setPcsSpecId] = useState(DEFAULT_PCS_SPEC_ID);
  const [batteryContainerCount, setBatteryContainerCount] = useState(320);
  const [containersPerPcs, setContainersPerPcs] = useState(8);
  const [selectedColumns, setSelectedColumns] = useState(6);
  const polygon = useProjectStore((s) => s.polygon);
  const lastToolResult = useProjectStore((s) => s.lastToolResult);
  const insertPreliminaryToolLayout = useProjectStore(
    (s) => s.insertPreliminaryToolLayout
  );
  const regularizePreliminaryToolLayout = useProjectStore(
    (s) => s.regularizePreliminaryToolLayout
  );
  const repairLayout = useProjectStore((s) => s.repairLayout);
  const shiftLayout = useProjectStore((s) => s.shiftLayout);
  const centerLayoutInSite = useProjectStore((s) => s.centerLayoutInSite);
  const lastRepairResult = useProjectStore((s) => s.lastRepairResult);
  const terrainFitPreview = useProjectStore((s) => s.terrainFitPreview);
  const previewFitLayoutToTerrain = useProjectStore(
    (s) => s.previewFitLayoutToTerrain
  );
  const applyTerrainFitPreview = useProjectStore((s) => s.applyTerrainFitPreview);
  const revertTerrainFitPreview = useProjectStore(
    (s) => s.revertTerrainFitPreview
  );
  const placedCount = useProjectStore((s) => s.placedEquipment.length);
  const repairZone = useProjectStore((s) => s.repairZone);
  const interactionMode = useProjectStore((s) => s.interactionMode);
  const startDrawingRepairZone = useProjectStore((s) => s.startDrawingRepairZone);
  const finishRepairZone = useProjectStore((s) => s.finishRepairZone);
  const clearRepairZone = useProjectStore((s) => s.clearRepairZone);
  const activeProfileId = useRegulatoryStore((s) => s.activeProfileId);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";
  const profile = getRegulatoryProfile(activeProfileId);
  const rules = profile.rules;

  const safeContainers = Math.max(0, Math.floor(batteryContainerCount));
  const safePerPcs = Math.max(1, Math.floor(containersPerPcs));
  // One PCS block per group of `safePerPcs` containers.
  const pcsCount = Math.ceil(safeContainers / safePerPcs);
  const blockCount = pcsCount;

  const shapeOptions = useMemo(
    () => gridShapeOptions(blockCount),
    [blockCount]
  );
  const effectiveColumns = Math.min(
    Math.max(1, selectedColumns),
    Math.max(1, blockCount)
  );
  const effectiveRows = Math.ceil(blockCount / effectiveColumns);
  const emptyCells = effectiveColumns * effectiveRows - blockCount;

  const request = {
    batteryContainerSpecId,
    pcsSpecId,
    batteryContainerCount: safeContainers,
    pcsCount,
    containersPerPcs: safePerPcs,
    blockColumns: effectiveColumns,
    rules: {
      bessToBess_m: rules.bessToBess_m,
      bessToPropertyLine_m: rules.bessToPropertyLine_m,
      electricalFrontWorkingClearance_m: rules.electricalFrontWorkingClearance_m,
      transformerToBessRecommended_m: rules.transformerToBessRecommended_m,
    },
  };

  const repairRules = {
    bessToBess_m: rules.bessToBess_m,
    bessToPropertyLine_m: rules.bessToPropertyLine_m,
    electricalFrontWorkingClearance_m: rules.electricalFrontWorkingClearance_m,
  };

  return (
    <>
      <CollapsibleSection
        icon={LayoutGrid}
        iconColor="text-cyan-300"
        title={isEs ? "Dimensionamiento por contenedores" : "Sizing by containers"}
        description={
          isEs
            ? "Insercion, capacidad y arreglo base del layout BESS."
            : "Container insertion, capacity and base BESS layout generation."
        }
      >
        <SizingContainerSection
          batteryContainerSpecId={batteryContainerSpecId}
          setBatteryContainerSpecId={setBatteryContainerSpecId}
          pcsSpecId={pcsSpecId}
          setPcsSpecId={setPcsSpecId}
          batteryContainerCount={batteryContainerCount}
          setBatteryContainerCount={setBatteryContainerCount}
          containersPerPcs={containersPerPcs}
          setContainersPerPcs={setContainersPerPcs}
          safeContainers={safeContainers}
          pcsCount={pcsCount}
          blockCount={blockCount}
          safePerPcs={safePerPcs}
          effectiveColumns={effectiveColumns}
          effectiveRows={effectiveRows}
          emptyCells={emptyCells}
          shapeOptions={shapeOptions}
          setSelectedColumns={setSelectedColumns}
          rules={rules}
          onGenerate={() => insertPreliminaryToolLayout(request)}
          onRegularize={() => regularizePreliminaryToolLayout(request)}
          hasTerrainPolygon={polygon.length >= 3}
          lastToolResult={lastToolResult}
          isEs={isEs}
          locale={locale}
        />
      </CollapsibleSection>

      <CollapsibleSection
        icon={Wrench}
        iconColor="text-amber-300"
        title={isEs ? "Reparar layout" : "Repair layout"}
        description={
          isEs
            ? "Reordena, centra y corrige el sistema dentro del terreno."
            : "Reorders, centers and repairs the system inside the site."
        }
      >
        <LayoutRepairSection
          placedCount={placedCount}
          polygonLength={polygon.length}
          repairZone={repairZone}
          interactionMode={interactionMode}
          lastRepairResult={lastRepairResult}
          terrainFitPreview={terrainFitPreview}
          onStartDrawingRepairZone={startDrawingRepairZone}
          onFinishRepairZone={finishRepairZone}
          onClearRepairZone={clearRepairZone}
          onRepairLayout={() => repairLayout(repairRules)}
          onPreviewFit={() => previewFitLayoutToTerrain(repairRules)}
          onApplyFit={applyTerrainFitPreview}
          onRevertFit={revertTerrainFitPreview}
          onShiftLayout={shiftLayout}
          onCenterLayout={centerLayoutInSite}
          isEs={isEs}
          locale={locale}
        />
      </CollapsibleSection>
    </>
  );
}

