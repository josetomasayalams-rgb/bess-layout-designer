"use client";

import { Layers3, RotateCcw, X } from "lucide-react";
import {
  type LayerId,
  type LayerPresetId,
  useUiStore,
} from "@/store/uiStore";
import type { Locale } from "@/lib/i18n";

const SWITCHES: Array<{ id: LayerId; es: string; en: string }> = [
  { id: "terrain", es: "Terreno", en: "Terrain" },
  { id: "terrainFill", es: "Relleno terreno", en: "Terrain fill" },
  { id: "terrainOutline", es: "Borde terreno", en: "Terrain outline" },
  { id: "bessContainers", es: "Contenedores BESS", en: "BESS containers" },
  { id: "pcs", es: "PCS / inversores", en: "PCS / inverters" },
  { id: "transformers", es: "Transformadores", en: "Transformers" },
  { id: "buffers", es: "Buffers", en: "Buffers" },
  { id: "restrictedAreas", es: "Restricciones", en: "Restrictions" },
  { id: "collisions", es: "Colisiones", en: "Collisions" },
  { id: "outOfBounds", es: "Fuera de terreno", en: "Out of terrain" },
  { id: "labels", es: "Etiquetas", en: "Labels" },
  { id: "grid", es: "Grilla", en: "Grid" },
  { id: "measurements", es: "Cotas / medidas", en: "Dimensions" },
  { id: "mvInfrastructure", es: "Patio MT / POI", en: "MV yard / POI" },
  { id: "cableRoutes", es: "Rutas de cable", en: "Cable routes" },
  { id: "accessRoads", es: "Caminos", en: "Access roads" },
  { id: "threeD", es: "Vista 3D", en: "3D view" },
  { id: "shadows", es: "Sombras 3D", en: "3D shadows" },
  { id: "baseMap", es: "Mapa base", en: "Base map" },
];

const PRESETS: Array<{ id: LayerPresetId; es: string; en: string }> = [
  { id: "fullView", es: "Vista completa", en: "Full view" },
  { id: "cleanView", es: "Vista limpia", en: "Clean view" },
  { id: "technicalView", es: "Vista tecnica", en: "Technical view" },
  { id: "presentation3DView", es: "Vista 3D presentacion", en: "3D presentation" },
  { id: "equipmentOnlyView", es: "Solo equipos", en: "Equipment only" },
  { id: "terrainOnlyView", es: "Solo terreno", en: "Terrain only" },
];

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition";

export function LayerManagerPanel({
  isOpen,
  onToggle,
  onClose,
  locale,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  locale: Locale;
}) {
  const isEs = locale === "es";
  const layerVisibility = useUiStore((state) => state.layerVisibility);
  const setLayerVisibility = useUiStore((state) => state.setLayerVisibility);
  const applyLayerPreset = useUiStore((state) => state.applyLayerPreset);
  const resetLayerVisibility = useUiStore((state) => state.resetLayerVisibility);

  return (
    <div className="absolute right-3 top-4 z-20 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`${buttonBase} border-slate-700 bg-slate-950/92 text-slate-100 shadow-lg backdrop-blur hover:border-cyan-400 hover:text-cyan-100`}
        aria-expanded={isOpen}
        title={isEs ? "Panel de capas" : "Layer panel"}
      >
        <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
        {isEs ? "Capas" : "Layers"}
      </button>

      {isOpen ? (
        <div className="w-[min(360px,calc(100vw-32px))] rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                {isEs ? "Panel de capas" : "Layer panel"}
              </div>
              <p className="mt-1 text-[10px] leading-snug text-slate-500">
                {isEs
                  ? "Controla solo visibilidad visual; no borra datos ni modifica calculos."
                  : "Controls visual visibility only; data and calculations are unchanged."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700 p-1 text-slate-400 hover:border-slate-500 hover:text-slate-100"
              aria-label={isEs ? "Cerrar capas" : "Close layers"}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyLayerPreset(preset.id)}
                className={`${buttonBase} border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-100`}
              >
                {isEs ? preset.es : preset.en}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {SWITCHES.map((layer) => (
              <label
                key={layer.id}
                className="flex min-h-8 items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-300"
              >
                <span>{isEs ? layer.es : layer.en}</span>
                <input
                  type="checkbox"
                  checked={layerVisibility[layer.id]}
                  onChange={(event) =>
                    setLayerVisibility(layer.id, event.target.checked)
                  }
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={resetLayerVisibility}
            className={`${buttonBase} mt-3 w-full border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-100`}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {isEs ? "Restablecer visualizacion" : "Reset visibility"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
