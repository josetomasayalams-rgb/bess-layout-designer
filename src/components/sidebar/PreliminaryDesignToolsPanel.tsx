"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  LayoutGrid,
  SquarePen,
  Wrench,
} from "lucide-react";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import {
  formatLength,
  formatNumber,
} from "@/lib/units/formatUnits";
import { gridShapeOptions } from "@/lib/layout/preliminaryLayoutGenerator";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SizingContainerSection } from "./design-tools";

const DEFAULT_BESS_SPEC_ID = "bess-sungrow-st2752ux-us";
const DEFAULT_PCS_SPEC_ID = "mvskid-sungrow-sc5000ud-mv-desierto";

function repairStatusClass(status: "success" | "partial" | "error") {
  if (status === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (status === "partial") return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  return "border-rose-500/40 bg-rose-500/10 text-rose-100";
}

function terrainFitWarningText(warning: string, isEs: boolean) {
  if (!isEs) return warning;
  if (warning.includes("Locked equipment")) {
    return "Existen equipos bloqueados que pueden limitar la reparacion completa.";
  }
  if (warning.includes("No POI")) {
    return "No hay POI modelado en el estado actual del proyecto.";
  }
  if (warning.includes("PCC")) {
    return "PCC aun no existe como entidad separada; se conserva POI como frontera de conexion.";
  }
  return warning;
}

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

  const hasZone = repairZone.length >= 3;
  const isDrawingZone = interactionMode === "draw-repair-zone";
  const terrainFitResult = terrainFitPreview.result;
  const hasTerrainFitDraft = terrainFitPreview.draftPlacedEquipment !== null;

  const repairText = lastRepairResult
    ? (() => {
        const d = lastRepairResult.diagnostics;
        if (lastRepairResult.status === "error") {
          if (!isEs) return lastRepairResult.message;
          if (d.equipmentCount === 0) {
            return "No hay equipos colocados para reparar. Coloca o genera equipos primero.";
          }
          if (d.zoneApplied && d.movableCount === 0) {
            return "La zona seleccionada no contiene ningun equipo. Dibuja la zona sobre los equipos a reordenar.";
          }
          return "No fue posible reordenar los equipos dentro del espacio disponible. Reduce la cantidad de equipos o amplia el terreno.";
        }
        if (!isEs) return lastRepairResult.message;
        const scope = d.zoneApplied ? " en la zona" : "";
        if (d.initialConflicts === 0) {
          return d.zoneApplied
            ? "Los equipos de la zona ya cumplen separaciones y limites. No se aplicaron cambios."
            : "El layout ya cumple separaciones y limites. No se aplicaron cambios.";
        }
        if (lastRepairResult.status === "partial") {
          return `Se redujeron los conflictos${scope} de ${d.initialConflicts} a ${d.remainingConflicts}. Los restantes no caben: reduce equipos o amplia el terreno.`;
        }
        return `Se resolvieron ${d.initialConflicts} conflicto(s)${scope}: se reubicaron ${d.movedCount} de ${d.movableCount} equipo(s) respetando separaciones y limites.`;
      })()
    : null;

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
      <div className="space-y-3">
        {/* ── Layout repair tool ──────────────────────────────────── */}
        <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                {isEs ? "Reparar layout" : "Repair layout"}
              </span>
            </div>
            {hasZone && !isDrawingZone ? (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] text-amber-100">
                {isEs ? "Zona" : "Zone"}: {repairZone.length}{" "}
                {isEs ? "vert." : "vtx"}
              </span>
            ) : null}
          </div>

          {isDrawingZone ? (
            <>
              <p className="text-[10px] leading-snug text-amber-100/90">
                {isEs
                  ? `Haz clic en cualquier parte del mapa para marcar la zona. No se recorta al terreno. Vertices: ${repairZone.length} (minimo 3).`
                  : `Click anywhere on the map to outline the zone. It is not clipped to the site. Vertices: ${repairZone.length} (minimum 3).`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => finishRepairZone()}
                  disabled={repairZone.length < 3}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-[11px] font-medium text-amber-100 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isEs ? "Terminar zona" : "Finish zone"}
                </button>
                <button
                  type="button"
                  onClick={() => clearRepairZone()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-300 hover:border-slate-500"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] leading-snug text-slate-500">
                  {hasZone
                    ? isEs
                      ? "Solo se reordenan los equipos con su centro dentro de la zona; el resto queda fijo como obstaculo."
                      : "Only equipment whose center is inside the zone is reordered; the rest stays fixed as obstacles."
                    : isEs
                    ? "Opcional: dibuja una zona de cualquier tamano para reordenar solo esa parte. Sin zona se repara todo el layout."
                    : "Optional: draw a zone of any size to repair only that part. Without a zone the whole layout is repaired."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => startDrawingRepairZone()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 hover:border-amber-400 hover:text-amber-100"
                >
                  <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
                  {isEs
                    ? hasZone
                      ? "Redibujar zona"
                      : "Dibujar zona"
                    : hasZone
                      ? "Redraw zone"
                      : "Draw zone"}
                </button>
                <button
                  type="button"
                  onClick={() => clearRepairZone()}
                  disabled={!hasZone}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-300 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isEs ? "Quitar zona" : "Remove zone"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => repairLayout(repairRules)}
                disabled={placedCount === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Wrench className="h-4 w-4" aria-hidden="true" />
                {isEs
                  ? hasZone
                    ? "Reparar zona"
                    : "Reparar todo"
                  : hasZone
                    ? "Repair zone"
                    : "Repair all"}
              </button>

              <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-2">
                <div className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                    {isEs ? "Ajustar al terreno" : "Fit to terrain"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-slate-500">
                  {isEs
                    ? "Reordena el layout completo en bloques, lo centra segun el terreno y recalcula rutas conceptuales de cableado, POI y accesos."
                    : "Reorders the full layout in blocks, centers it to the site and recalculates conceptual cable routes, POI and access roads."}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => previewFitLayoutToTerrain(repairRules)}
                    disabled={placedCount === 0 || polygon.length < 3}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Compass className="h-4 w-4" aria-hidden="true" />
                      {hasTerrainFitDraft
                        ? isEs
                          ? "Actualizar vista previa"
                          : "Update preview"
                        : isEs
                          ? "Vista previa inteligente"
                          : "Smart preview"}
                  </button>
                  {hasTerrainFitDraft ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => applyTerrainFitPreview()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-1.5 text-[11px] font-medium text-emerald-100 hover:border-emerald-300"
                      >
                        {isEs ? "Aplicar ajuste" : "Apply fit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => revertTerrainFitPreview()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-300 hover:border-slate-500"
                      >
                        {isEs ? "Revertir" : "Revert"}
                      </button>
                    </div>
                  ) : null}
                </div>
                {terrainFitResult ? (
                  <div
                    className={`mt-2 rounded-md border p-2 text-[10px] leading-snug ${repairStatusClass(
                      terrainFitResult.status
                    )}`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
                      {terrainFitResult.status === "error" ? (
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {isEs ? "Ajuste" : "Fit"} · {terrainFitResult.status}
                    </div>
                    <div>
                      {isEs
                        ? terrainFitResult.status === "error"
                          ? "No fue posible preparar el ajuste. Se requiere terreno y layout."
                          : "Vista previa lista: revisa el layout propuesto en el mapa antes de aplicar."
                        : terrainFitResult.message}
                    </div>
                    {terrainFitResult.selected ? (
                      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 font-mono">
                        <span>
                          {isEs ? "Rot." : "Rot."}{" "}
                          {formatNumber(
                            terrainFitResult.selected.rotationDeltaDeg,
                            0,
                            locale
                          )}
                          °
                        </span>
                        <span>
                          {isEs ? "Dentro" : "Inside"}{" "}
                          {terrainFitResult.diagnostics.insideCount}/
                          {terrainFitResult.diagnostics.equipmentCount}
                        </span>
                        <span>
                          {isEs ? "Fuera" : "Outside"}{" "}
                          {terrainFitResult.diagnostics.outsideCount}
                        </span>
                        <span>
                          {isEs ? "Col." : "Coll."}{" "}
                          {terrainFitResult.diagnostics.collisionCount}
                        </span>
                        <span>
                          {isEs ? "MT" : "MV"}{" "}
                          {terrainFitResult.diagnostics.cableRouteCount}
                        </span>
                        <span>
                          {isEs ? "Bloq." : "Locked"}{" "}
                          {terrainFitResult.diagnostics.lockedCount}
                        </span>
                      </div>
                    ) : null}
                    {terrainFitResult.summary.warnings.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[10px]">
                        {terrainFitResult.summary.warnings.slice(0, 2).map((warning) => (
                          <li key={warning}>• {terrainFitWarningText(warning, isEs)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {polygon.length < 3 ? (
                  <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-100">
                    {isEs
                      ? "Dibuja un poligono de terreno antes de ajustar el layout."
                      : "Draw a site polygon before fitting the layout."}
                  </p>
                ) : null}
              </div>
            </>
          )}

          {lastRepairResult ? (
            <div
              className={`rounded-md border p-2 text-[10px] leading-snug ${repairStatusClass(
                lastRepairResult.status
              )}`}
            >
              <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
                {lastRepairResult.status === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isEs ? "Reparacion" : "Repair"} · {lastRepairResult.status}
              </div>
              <div>{repairText}</div>
              {lastRepairResult.diagnostics.movedCount > 0 ? (
                <div className="mt-1 font-mono">
                  {formatNumber(
                    lastRepairResult.diagnostics.movedCount,
                    0,
                    locale
                  )}{" "}
                  {isEs ? "movidos" : "moved"} ·{" "}
                  {formatLength(lastRepairResult.diagnostics.maxDisplacementM, {
                    digits: 1,
                    locale,
                  })}{" "}
                  {isEs ? "max" : "max"}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </CollapsibleSection>
    </>
  );
}
