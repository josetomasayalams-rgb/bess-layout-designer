"use client";

import { formatNumber } from "@/lib/units/formatUnits";
import { GridPreview } from "./GridPreview";
import type { Locale } from "@/lib/i18n";

interface GridShapePickerProps {
  blockCount: number;
  safePerPcs: number;
  effectiveColumns: number;
  effectiveRows: number;
  emptyCells: number;
  shapeOptions: Array<{ columns: number; rows: number; shape: string }>;
  setSelectedColumns: (cols: number) => void;
  isEs: boolean;
  locale: Locale;
}

export function GridShapePicker({
  blockCount,
  safePerPcs,
  effectiveColumns,
  effectiveRows,
  emptyCells,
  shapeOptions,
  setSelectedColumns,
  isEs,
  locale,
}: GridShapePickerProps) {
  if (blockCount <= 0) {
    return (
      <p className="rounded-md border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-[10px] leading-snug text-slate-500">
        {isEs
          ? "Ingresa al menos un contenedor BESS para ver las formas de grilla."
          : "Enter at least one BESS container to see grid shapes."}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium text-slate-300">
        {isEs ? "Forma de la grilla" : "Grid shape"}
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        {isEs
          ? `Cada celda es 1 bloque (${safePerPcs} BESS + 1 PCS). Elige una opcion o ajusta las columnas.`
          : `Each cell is one block (${safePerPcs} BESS + 1 PCS). Pick an option or adjust the columns.`}
      </p>

      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
        {shapeOptions.map((option) => {
          const active = option.columns === effectiveColumns;
          return (
            <button
              key={option.columns}
              type="button"
              onClick={() => setSelectedColumns(option.columns)}
              title={
                option.shape === "square"
                  ? isEs
                    ? "Cuadrado"
                    : "Square"
                  : isEs
                    ? "Rectangulo"
                    : "Rectangle"
              }
              className={`rounded-md border px-2 py-1 font-mono text-[10px] ${
                active
                  ? "border-cyan-400 bg-cyan-400/15 text-cyan-100"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60"
              }`}
            >
              {option.columns}×{option.rows}
              {option.shape === "square" ? " ◆" : ""}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-slate-500">
          {isEs ? "Columnas" : "Columns"}
          <input
            type="number"
            min={1}
            max={Math.max(1, blockCount)}
            value={effectiveColumns}
            onChange={(event) =>
              setSelectedColumns(
                Math.max(1, Math.floor(Number(event.target.value) || 1))
              )
            }
            className="mt-1 w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100"
          />
        </label>
        <span className="mt-4 text-[10px] text-slate-500">
          ×{" "}
          <span className="font-mono text-slate-300">
            {effectiveRows}
          </span>{" "}
          {isEs ? "filas" : "rows"}
        </span>
      </div>

      <GridPreview
        columns={effectiveColumns}
        rows={effectiveRows}
        filled={blockCount}
      />
      <p className="text-[10px] leading-snug text-slate-500">
        <span className="font-mono text-slate-300">
          {effectiveColumns} × {effectiveRows}
        </span>{" "}
        · {formatNumber(blockCount, 0, locale)}{" "}
        {isEs ? "bloques" : "blocks"}
        {emptyCells > 0
          ? ` · ${emptyCells} ${
              isEs ? "celdas vacias" : "empty cells"
            }`
          : ""}
      </p>
    </div>
  );
}
