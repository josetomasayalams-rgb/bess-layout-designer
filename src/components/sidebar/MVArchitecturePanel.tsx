"use client";

import { Network } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import { formatLength } from "@/lib/units/formatUnits";

import { SingleLineDiagram } from "@/components/electrical/SingleLineDiagram";

export function MVArchitecturePanel() {
  const placed = useProjectStore((state) => state.placedEquipment);
  const polygon = useProjectStore((state) => state.polygon);
  const anchor = useProjectStore((state) => state.anchor);
  const storedCableRoutes = useProjectStore((state) => state.cableRoutes);
  const storedAccessRoads = useProjectStore((state) => state.accessRoads);
  const mvBuses = useProjectStore((state) => state.mvBuses);
  const poi = useProjectStore((state) => state.poi);
  const locale = useUiStore((state) => state.locale);
  const isEs = locale === "es";

  const generated = generateConceptualPhysicalInfrastructure({
    placed,
    anchor,
    polygon,
  });
  const cableRoutes =
    storedCableRoutes.length > 0 ? storedCableRoutes : generated.cableRoutes;
  const accessRoads =
    storedAccessRoads.length > 0 ? storedAccessRoads : generated.accessRoads;

  return (
    <CollapsibleSection
      icon={Network}
      iconColor="text-violet-300"
      title={isEs ? "Arquitectura MT / POI" : "MV architecture / POI"}
      description={
        isEs
          ? "Visualiza patios MT, rutas de cable y accesos conceptuales."
          : "Shows conceptual MV yards, cable routes and access roads."
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Metric label={isEs ? "Estaciones" : "Stations"} value={generated.diagnostics.stationCount} />
          <Metric label={isEs ? "Rutas MT" : "MV routes"} value={cableRoutes.length} />
          <Metric label={isEs ? "Caminos" : "Roads"} value={accessRoads.length} />
          <Metric label={isEs ? "Barras" : "Buses"} value={mvBuses.length || generated.layoutZones.filter((zone) => zone.type === "mv_yard").length} />
        </div>

        <SingleLineDiagram />

        {generated.layoutZones.length > 0 ? (
          <div className="space-y-1.5">
            {generated.layoutZones.map((zone) => (
              <div
                key={zone.id}
                className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-200">{zone.label}</span>
                  <span className="font-mono text-slate-500">{zone.type}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[11px] leading-snug text-slate-500">
            {isEs
              ? "Inserta estaciones PCS/trafo para generar patio MT, POI y corredores conceptuales."
              : "Insert PCS/transformer stations to generate conceptual MV yard, POI and corridors."}
          </p>
        )}

        {accessRoads[0] ? (
          <p className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-400">
            {isEs ? "Ancho camino" : "Road width"}:{" "}
            <span className="font-mono text-slate-100">
              {formatLength(accessRoads[0].width_m, { digits: 1, locale })}
            </span>
          </p>
        ) : null}

        <p className="text-[10px] leading-snug text-slate-500">
          {isEs
            ? "Capa conceptual para predimensionamiento. Las rutas, patios y accesos no reemplazan planos IFC, estudios de canalizacion ni permisos."
            : "Conceptual predesign layer. Routes, yards and access roads do not replace IFC drawings, ductbank studies or permits."}
        </p>

        {poi ? (
          <p className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1.5 text-[11px] text-violet-100">
            POI: {poi.busName} · {poi.voltageKv} kV
          </p>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
      <div className="text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-slate-100">{value}</div>
    </div>
  );
}
