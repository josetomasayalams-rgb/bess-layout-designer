"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ListPlus,
  MapPin,
  MousePointer2,
  Plus,
  RotateCw,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { parseNumberInRange } from "@/lib/units/parseNumber";
import { useUiStore } from "@/store/uiStore";
import {
  formatAreaDual,
  formatAreaHa,
  formatLength,
  formatNumber,
} from "@/lib/units/formatUnits";
import { NumberField } from "@/components/ui/NumberField";
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
  const setPolygonFromCoordinates = useProjectStore(
    (state) => state.setPolygonFromCoordinates
  );
  const createPreviewTerrain = useProjectStore((state) => state.createPreviewTerrain);
  const updatePreviewTerrain = useProjectStore((state) => state.updatePreviewTerrain);
  const applyPreviewTerrain = useProjectStore((state) => state.applyPreviewTerrain);
  const cancelPreviewTerrain = useProjectStore((state) => state.cancelPreviewTerrain);

  const [mode, setMode] = useState<"draw" | "parametric" | "coordinates">(
    "draw"
  );
  const [coordRows, setCoordRows] = useState<{ lat: string; lng: string }[]>([
    { lat: "", lng: "" },
    { lat: "", lng: "" },
    { lat: "", lng: "" },
  ]);
  const [coordFeedback, setCoordFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
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

  const MIN_COORD_ROWS = 3;
  const MAX_COORD_ROWS = 15;

  const updateCoordRow = (index: number, field: "lat" | "lng", value: string) => {
    setCoordRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
    setCoordFeedback(null);
  };

  const addCoordRow = () => {
    setCoordRows((rows) =>
      rows.length >= MAX_COORD_ROWS ? rows : [...rows, { lat: "", lng: "" }]
    );
  };

  const removeCoordRow = (index: number) => {
    setCoordRows((rows) =>
      rows.length <= MIN_COORD_ROWS ? rows : rows.filter((_, i) => i !== index)
    );
    setCoordFeedback(null);
  };

  const createPolygonFromCoordinates = () => {
    const vertices: { lng: number; lat: number }[] = [];
    for (const row of coordRows) {
      const isEmpty = row.lat.trim() === "" && row.lng.trim() === "";
      if (isEmpty) continue;
      const lat = parseNumberInRange(row.lat, -90, 90);
      const lng = parseNumberInRange(row.lng, -180, 180);
      if (lat === null || lng === null) {
        setCoordFeedback({
          kind: "error",
          text: isEs
            ? "Coordenada invalida. Latitud entre -90 y 90, longitud entre -180 y 180."
            : "Invalid coordinate. Latitude between -90 and 90, longitude between -180 and 180.",
        });
        return;
      }
      vertices.push({ lng, lat });
    }

    if (vertices.length < MIN_COORD_ROWS) {
      setCoordFeedback({
        kind: "error",
        text: isEs
          ? "Ingresa al menos 3 coordenadas validas."
          : "Enter at least 3 valid coordinates.",
      });
      return;
    }

    setPolygonFromCoordinates(vertices);
    setCoordFeedback({
      kind: "success",
      text: isEs
        ? `Poligono creado desde ${vertices.length} coordenadas.`
        : `Polygon created from ${vertices.length} coordinates.`,
    });
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

      <div className="grid grid-cols-3 gap-2">
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
        <button
          type="button"
          onClick={() => setMode("coordinates")}
          className={`${buttonClass} ${
            mode === "coordinates"
              ? "border-cyan-400 bg-cyan-400/15 text-cyan-100"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Por coordenadas" : "Coordinate polygon"}
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
      ) : mode === "coordinates" ? (
        <div className="space-y-3">
          <p className="text-[10px] leading-snug text-slate-500">
            {isEs
              ? "Ingresa entre 3 y 15 coordenadas (latitud, longitud). El poligono se crea en el orden ingresado."
              : "Enter between 3 and 15 coordinates (latitude, longitude). The polygon is built in the entered order."}
          </p>

          <div className="space-y-1.5">
            <div className="grid grid-cols-[1.5rem_1fr_1fr_1.75rem] items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-600">
              <span>#</span>
              <span>{isEs ? "Latitud" : "Latitude"}</span>
              <span>{isEs ? "Longitud" : "Longitude"}</span>
              <span className="sr-only">{isEs ? "Quitar" : "Remove"}</span>
            </div>
            {coordRows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1.5rem_1fr_1fr_1.75rem] items-center gap-1.5"
              >
                <span className="text-[11px] text-slate-500">{index + 1}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={row.lat}
                  placeholder="-33.45"
                  aria-label={`${isEs ? "Latitud" : "Latitude"} ${index + 1}`}
                  onChange={(event) => updateCoordRow(index, "lat", event.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={row.lng}
                  placeholder="-70.66"
                  aria-label={`${isEs ? "Longitud" : "Longitude"} ${index + 1}`}
                  onChange={(event) => updateCoordRow(index, "lng", event.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeCoordRow(index)}
                  disabled={coordRows.length <= MIN_COORD_ROWS}
                  title={isEs ? "Quitar fila" : "Remove row"}
                  aria-label={isEs ? "Quitar fila" : "Remove row"}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCoordRow}
            disabled={coordRows.length >= MAX_COORD_ROWS}
            className={`${buttonClass} w-full border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {isEs
              ? `Agregar coordenada (${coordRows.length}/${MAX_COORD_ROWS})`
              : `Add coordinate (${coordRows.length}/${MAX_COORD_ROWS})`}
          </button>

          <button
            type="button"
            onClick={createPolygonFromCoordinates}
            className={`${buttonClass} w-full border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300`}
          >
            <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
            {isEs ? "Crear poligono" : "Create polygon"}
          </button>

          {coordFeedback ? (
            <div
              className={`rounded-md border p-2 text-[10px] leading-snug ${
                coordFeedback.kind === "success"
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-600/40 bg-amber-500/10 text-amber-100"
              }`}
            >
              {coordFeedback.text}
            </div>
          ) : null}
        </div>
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
              <NumberField
                min={0.01}
                step={0.1}
                value={areaHa}
                onChange={(nextAreaHa) => {
                  setAreaHa(nextAreaHa);
                  syncDerivedDimensions({ areaHa: nextAreaHa });
                }}
                className={inputClass}
              />
              <span className="mt-1 block text-[10px] text-slate-600">ha</span>
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Relacion L/A" : "L/W ratio"}
              <NumberField
                min={0.1}
                step={0.1}
                value={aspectRatio}
                onChange={(nextAspectRatio) => {
                  setAspectRatio(nextAspectRatio);
                  syncDerivedDimensions({ aspectRatio: nextAspectRatio });
                }}
                disabled={shape === "square"}
                className={inputClass}
              />
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Largo" : "Length"}
              <NumberField
                min={1}
                step={1}
                value={lengthM}
                onChange={(nextLengthM) => {
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
              <NumberField
                min={1}
                step={1}
                value={widthM}
                onChange={(nextWidthM) => {
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
              <NumberField
                min={3}
                max={24}
                step={1}
                integer
                value={vertexCount}
                onChange={(next) => setVertexCount(next)}
                disabled={shape !== "regular-polygon"}
                className={inputClass}
              />
            </label>
            <label className="text-[11px] text-slate-500">
              {isEs ? "Rotacion" : "Rotation"}
              <NumberField
                step={1}
                value={displayedRotationDeg}
                onChange={(next) => setRotation(next)}
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
