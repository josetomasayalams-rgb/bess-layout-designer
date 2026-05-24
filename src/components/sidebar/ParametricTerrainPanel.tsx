"use client";

import { useState } from "react";
import { CheckCircle2, MousePointer2, RotateCw, SquarePen, X } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import {
  formatAreaDual,
  formatAreaHa,
  formatLength,
  formatNumber,
} from "@/lib/units/formatUnits";
import {
  dimensionsFromAreaRatio,
  type ParametricTerrainShape,
  type ParametricTerrainSizingMode,
} from "@/lib/terrain/parametricTerrain";

function roundedMeters(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolvedDimensions(args: {
  shape: ParametricTerrainShape;
  sizingMode: ParametricTerrainSizingMode;
  areaHa: number;
  lengthM: number;
  widthM: number;
  aspectRatio: number;
}) {
  if (args.sizingMode === "dimensions") {
    const length = Math.max(1, args.lengthM);
    return {
      lengthM: length,
      widthM: args.shape === "square" ? length : Math.max(1, args.widthM),
    };
  }

  if (args.shape === "square") {
    const side = Math.sqrt(Math.max(0.01, args.areaHa) * 10_000);
    return { lengthM: roundedMeters(side), widthM: roundedMeters(side) };
  }

  const dimensions = dimensionsFromAreaRatio(args.areaHa, args.aspectRatio);
  return {
    lengthM: roundedMeters(dimensions.lengthM),
    widthM: roundedMeters(dimensions.widthM),
  };
}

export function ParametricTerrainPanel() {
  const locale = useUiStore((state) => state.locale);
  const isEs = locale === "es";
  const previewTerrain = useProjectStore((state) => state.previewTerrain);
  const interactionMode = useProjectStore((state) => state.interactionMode);
  const startDrawingPolygon = useProjectStore((state) => state.startDrawingPolygon);
  const finishPolygon = useProjectStore((state) => state.finishPolygon);
  const createPreviewTerrain = useProjectStore((state) => state.createPreviewTerrain);
  const updatePreviewTerrain = useProjectStore((state) => state.updatePreviewTerrain);
  const applyPreviewTerrain = useProjectStore((state) => state.applyPreviewTerrain);
  const cancelPreviewTerrain = useProjectStore((state) => state.cancelPreviewTerrain);

  const [mode, setMode] = useState<"draw" | "parametric">("draw");
  const [shape, setShape] = useState<ParametricTerrainShape>("rectangle");
  const [sizingMode, setSizingMode] =
    useState<ParametricTerrainSizingMode>("area-ratio");
  const [areaHa, setAreaHa] = useState(5);
  const [lengthM, setLengthM] = useState(316);
  const [widthM, setWidthM] = useState(158);
  const [aspectRatio, setAspectRatio] = useState(2);
  const [vertexCount, setVertexCount] = useState(6);
  const [rotationDeg, setRotationDeg] = useState(0);

  const isDrawing = interactionMode === "draw-site";
  const estimated = resolvedDimensions({
    shape,
    sizingMode,
    areaHa,
    lengthM,
    widthM,
    aspectRatio,
  });
  const estimatedAreaM2 =
    sizingMode === "dimensions"
      ? estimated.lengthM * estimated.widthM
      : areaHa * 10_000;
  const displayedRotationDeg = previewTerrain
    ? Math.round(previewTerrain.rotationDeg * 10) / 10
    : rotationDeg;

  const input = {
    shape,
    sizingMode,
    areaHa,
    lengthM: estimated.lengthM,
    widthM: estimated.widthM,
    aspectRatio,
    vertexCount,
    rotationDeg: displayedRotationDeg,
  };

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100";
  const buttonClass =
    "inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

  const generatePreview = () =>
    createPreviewTerrain({ ...input, center: previewTerrain?.center ?? null });

  const syncDerivedDimensions = (next: {
    shape?: ParametricTerrainShape;
    sizingMode?: ParametricTerrainSizingMode;
    areaHa?: number;
    lengthM?: number;
    widthM?: number;
    aspectRatio?: number;
  }) => {
    const nextShape = next.shape ?? shape;
    const nextSizingMode = next.sizingMode ?? sizingMode;
    const nextAreaHa = next.areaHa ?? areaHa;
    const nextLengthM = next.lengthM ?? lengthM;
    const nextWidthM = next.widthM ?? widthM;
    const nextAspectRatio = next.aspectRatio ?? aspectRatio;
    const nextDimensions = resolvedDimensions({
      shape: nextShape,
      sizingMode: nextSizingMode,
      areaHa: nextAreaHa,
      lengthM: nextLengthM,
      widthM: nextWidthM,
      aspectRatio: nextAspectRatio,
    });

    setLengthM(nextDimensions.lengthM);
    setWidthM(nextDimensions.widthM);
    if (previewTerrain) {
      updatePreviewTerrain({
        shape: nextShape,
        sizingMode: nextSizingMode,
        areaHa: nextAreaHa,
        lengthM: nextDimensions.lengthM,
        widthM: nextDimensions.widthM,
        aspectRatio: nextAspectRatio,
      });
    }
  };

  const setRotation = (nextRotation: number) => {
    setRotationDeg(nextRotation);
    if (previewTerrain) updatePreviewTerrain({ rotationDeg: nextRotation });
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
          {isEs ? "Selector de terreno" : "Terrain selector"}
        </div>
        <p className="mt-1 text-[10px] leading-snug text-slate-500">
          {isEs
            ? "Genera un terreno por parametros, arrastralo sobre el mapa y aplicalo como poligono de trabajo."
            : "Generate terrain by parameters, drag it on the map and apply it as the working polygon."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`${buttonClass} ${
            mode === "draw"
              ? "border-cyan-400 bg-cyan-400/15 text-cyan-100"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60"
          }`}
        >
          <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Dibujar libre" : "Free draw"}
        </button>
        <button
          type="button"
          onClick={() => setMode("parametric")}
          className={`${buttonClass} ${
            mode === "parametric"
              ? "border-cyan-400 bg-cyan-400/15 text-cyan-100"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60"
          }`}
        >
          <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Por parametros" : "By parameters"}
        </button>
      </div>

      {mode === "draw" ? (
        <button
          type="button"
          onClick={() => (isDrawing ? finishPolygon() : startDrawingPolygon())}
          className={`${buttonClass} w-full border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300`}
        >
          {isDrawing
            ? isEs
              ? "Terminar poligono"
              : "Finish polygon"
            : isEs
              ? "Dibujar terreno"
              : "Draw terrain"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-500">
              {isEs ? "Forma" : "Shape"}
              <select
                value={shape}
                onChange={(event) => {
                  const nextShape = event.target.value as ParametricTerrainShape;
                  setShape(nextShape);
                  syncDerivedDimensions({ shape: nextShape });
                }}
                className={inputClass}
              >
                <option value="rectangle">{isEs ? "Rectangulo" : "Rectangle"}</option>
                <option value="square">{isEs ? "Cuadrado" : "Square"}</option>
                <option value="regular-polygon">
                  {isEs ? "Poligono regular" : "Regular polygon"}
                </option>
              </select>
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Metodo" : "Method"}
              <select
                value={sizingMode}
                onChange={(event) => {
                  const nextSizingMode = event.target
                    .value as ParametricTerrainSizingMode;
                  setSizingMode(nextSizingMode);
                  syncDerivedDimensions({ sizingMode: nextSizingMode });
                }}
                className={inputClass}
              >
                <option value="area-ratio">{isEs ? "Area + relacion" : "Area + ratio"}</option>
                <option value="dimensions">{isEs ? "Largo / ancho" : "Length / width"}</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-500">
              {isEs ? "Area" : "Area"}
              <input
                type="number"
                min={0.01}
                step={0.1}
                value={areaHa}
                onChange={(event) => {
                  const nextAreaHa = Number(event.target.value);
                  setAreaHa(nextAreaHa);
                  syncDerivedDimensions({ areaHa: nextAreaHa });
                }}
                className={inputClass}
              />
              <span className="mt-1 block text-[10px] text-slate-600">ha</span>
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Relacion L/A" : "L/W ratio"}
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={aspectRatio}
                onChange={(event) => {
                  const nextAspectRatio = Number(event.target.value);
                  setAspectRatio(nextAspectRatio);
                  syncDerivedDimensions({ aspectRatio: nextAspectRatio });
                }}
                disabled={shape === "square"}
                className={inputClass}
              />
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Largo" : "Length"}
              <input
                type="number"
                min={1}
                step={1}
                value={lengthM}
                onChange={(event) => {
                  const nextLengthM = Number(event.target.value);
                  setLengthM(nextLengthM);
                  syncDerivedDimensions({ lengthM: nextLengthM });
                }}
                disabled={sizingMode === "area-ratio"}
                className={inputClass}
              />
              <span className="mt-1 block text-[10px] text-slate-600">m</span>
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Ancho" : "Width"}
              <input
                type="number"
                min={1}
                step={1}
                value={widthM}
                onChange={(event) => {
                  const nextWidthM = Number(event.target.value);
                  setWidthM(nextWidthM);
                  syncDerivedDimensions({ widthM: nextWidthM });
                }}
                disabled={sizingMode === "area-ratio" || shape === "square"}
                className={inputClass}
              />
              <span className="mt-1 block text-[10px] text-slate-600">m</span>
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Vertices" : "Vertices"}
              <input
                type="number"
                min={3}
                max={24}
                step={1}
                value={vertexCount}
                onChange={(event) => setVertexCount(Number(event.target.value))}
                disabled={shape !== "regular-polygon"}
                className={inputClass}
              />
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Rotacion" : "Rotation"}
              <input
                type="number"
                step={1}
                value={displayedRotationDeg}
                onChange={(event) => setRotation(Number(event.target.value))}
                className={inputClass}
              />
              <span className="mt-1 block text-[10px] text-slate-600">°</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[0, 45, 90, 180].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRotation(value)}
                className={`${buttonClass} border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60`}
              >
                <RotateCw className="h-3 w-3" aria-hidden="true" />
                {value}°
              </button>
            ))}
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[10px] text-slate-400">
            <div className="font-mono text-slate-200">
              {formatAreaDual(estimatedAreaM2, { digits: 0, locale })}
            </div>
            <div className="mt-1">
              {formatLength(estimated.lengthM, { digits: 0, locale })} x{" "}
              {formatLength(estimated.widthM, { digits: 0, locale })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={generatePreview}
              className={`${buttonClass} w-full border-cyan-400/40 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300`}
            >
              {previewTerrain
                ? isEs
                  ? "Actualizar vista previa"
                  : "Update preview"
                : isEs
                  ? "Generar vista previa"
                  : "Generate preview"}
            </button>
            {previewTerrain ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreviewTerrain()}
                  className={`${buttonClass} border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {isEs ? "Aplicar terreno" : "Apply terrain"}
                </button>
                <button
                  type="button"
                  onClick={() => cancelPreviewTerrain()}
                  className={`${buttonClass} border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
              </div>
            ) : null}
          </div>

          {previewTerrain ? (
            <div className="rounded-md border border-cyan-500/25 bg-cyan-500/10 p-2 text-[10px] leading-snug text-cyan-100">
              {isEs
                ? "Vista previa activa: arrastra el terreno sobre el mapa. Para rotarlo libremente, arrastra la manilla amarilla."
                : "Preview active: drag the terrain on the map. For free rotation, drag the yellow handle."}
              <div className="mt-1 font-mono">
                {formatAreaHa(previewTerrain.areaM2, { digits: 2, locale })} ·{" "}
                {formatNumber(previewTerrain.rotationDeg, 0, locale)}°
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
