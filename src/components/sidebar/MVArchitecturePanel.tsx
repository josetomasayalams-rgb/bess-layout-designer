"use client";

import { Network, Info } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import { computeSummary } from "@/lib/layout/summaryCalculations";
import { formatLength } from "@/lib/units/formatUnits";
import { copyFor } from "@/lib/i18n";

import { SingleLineDiagram } from "@/components/electrical/SingleLineDiagram";

export function MVArchitecturePanel() {
  const placed = useProjectStore((state) => state.placedEquipment);
  const polygon = useProjectStore((state) => state.polygon);
  const anchor = useProjectStore((state) => state.anchor);
  const storedCableRoutes = useProjectStore((state) => state.cableRoutes);
  const storedAccessRoads = useProjectStore((state) => state.accessRoads);
  const poi = useProjectStore((state) => state.poi);
  const locale = useUiStore((state) => state.locale);
  const isEs = locale === "es";
  const t = copyFor(locale);

  const generated = generateConceptualPhysicalInfrastructure({
    placed,
    anchor,
    polygon,
    hasPoi: !!poi,
  });
  const cableRoutes =
    storedCableRoutes.length > 0 ? storedCableRoutes : generated.cableRoutes;
  const accessRoads =
    storedAccessRoads.length > 0 ? storedAccessRoads : generated.accessRoads;

  const totalCableLength = cableRoutes.reduce(
    (sum, route) => sum + (route.estimatedLength_m ?? 0),
    0
  );

  // Integrated presets (e.g. Tesla Megapack) carry the PCS/inverter inside the
  // unit — there is no separate PCS/MV station, so the panel must not ask the
  // user to insert one. Single source of truth: the architecture-aware summary.
  const summary = computeSummary(placed, null);
  const isIntegrated = summary.is_integrated_architecture ?? false;

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
          <Metric
            label={
              isIntegrated
                ? isEs
                  ? "Unidades integradas"
                  : "Integrated units"
                : isEs
                  ? "Bloques BESS-PCS"
                  : "BESS-PCS Blocks"
            }
            value={
              isIntegrated
                ? (summary.integrated_unit_count ?? 0)
                : generated.diagnostics.blockCount
            }
          />
          <Metric
            label={isEs ? "Corredores MT" : "MV Corridors"}
            value={cableRoutes.length}
          />
          <Metric
            label={isEs ? "Accesos y Caminos" : "Access & Roads"}
            value={accessRoads.length}
          />
          <Metric
            label={isEs ? "Longitud total MT" : "Total MV Length"}
            value={formatLength(totalCableLength, { digits: 0, locale })}
          />
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
            {isIntegrated
              ? isEs
                ? "Unidades con PCS/inversor integrado: no requieren estación PCS/MV separada. El patio mostrado es una interfaz MT conceptual; el transformador elevador externo no se modela aquí."
                : "Units with integrated PCS/inverter: no separate PCS/MV station required. The yard shown is a conceptual MV interface; the external step-up transformer is not modeled here."
              : isEs
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

        {generated.diagnostics.warnings && generated.diagnostics.warnings.length > 0 ? (
          <div className="space-y-1.5 mt-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-500">
              {isEs ? "Advertencias de Infraestructura" : "Infrastructure Warnings"}
            </div>
            <div className="space-y-1">
              {generated.diagnostics.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-[10px] leading-snug text-amber-200/90 flex gap-1.5"
                >
                  <span className="text-amber-500 shrink-0 font-bold">!</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 rounded border border-violet-500/20 bg-violet-500/5 px-2 py-1.5 text-[10px] text-violet-300">
          <span>{isEs ? "Clasificación:" : "Classification:"}</span>
          <span className="font-semibold uppercase tracking-wider text-[8px] text-violet-200">
            {isEs ? "Trazado conceptual / Supuesto" : "Conceptual route / Assumption"}
          </span>
        </div>

        {poi ? (
          <p className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1.5 text-[11px] text-violet-100">
            POI: {poi.busName} · {poi.voltageKv} kV
          </p>
        ) : null}

        <ConceptualElectricalNotes t={t.mvArchitecture} isIntegrated={isIntegrated} />
      </div>
    </CollapsibleSection>
  );
}

type MvArchitectureCopy = ReturnType<typeof copyFor>["mvArchitecture"];

function ConceptualElectricalNotes({
  t,
  isIntegrated,
}: {
  t: MvArchitectureCopy;
  isIntegrated: boolean;
}) {
  return (
    <details className="group rounded-md border border-slate-700/60 bg-slate-900/60">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200">
        <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
        {t.conceptualNoteTitle}
      </summary>
      <div className="space-y-2 px-2 pb-2 pt-1">
        {isIntegrated ? (
          <>
            <NoteRow title={t.integratedTitle} body={t.integratedBody} />
            <NoteRow
              title={t.externalTransformerTitle}
              body={t.externalTransformerBody}
            />
          </>
        ) : (
          <>
            <NoteRow title={t.pcsIntegratedTitle} body={t.pcsIntegratedBody} />
            <NoteRow title={t.bessRatioTitle} body={t.bessRatioBody} />
          </>
        )}
        <NoteRow title={t.sectioningCenterTitle} body={t.sectioningCenterBody} />
        <NoteRow title={t.poiTitle} body={t.poiBody} />
        <NoteRow title={t.mvCorridorsTitle} body={t.mvCorridorsBody} />
      </div>
    </details>
  );
}

function NoteRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-slate-700/40 bg-slate-800/40 px-2 py-1.5">
      <div className="text-[10px] font-semibold text-slate-300">{title}</div>
      <div className="mt-0.5 text-[9px] leading-snug text-slate-500">{body}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
      <div className="text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-slate-100">{value}</div>
    </div>
  );
}
