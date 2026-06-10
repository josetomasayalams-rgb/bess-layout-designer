"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Eraser,
  Lock,
  RotateCcw,
  RotateCw,
  RotateCwSquare,
  Rows3,
  Shrink,
  SlidersHorizontal,
  Square,
  Undo2,
  Unlock,
  Wand2,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

type LayoutEditToolbarProps = {
  locale: Locale;
  selectedCount: number;
  lockedCount: number;
  hasDraft: boolean;
  warningCount: number;
  errorCount: number;
  isValidated: boolean;
  repairMessage?: string | null;
  selectionPointCount: number;
  onRotateCw: () => void;
  onRotateCcw: () => void;
  onRotate180: () => void;
  onHorizontal: () => void;
  onVertical: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onToggleLock: () => void;
  onRepair: () => void;
  onCompact: () => void;
  onValidate: () => void;
  onRevert: () => void;
  onApply: () => void;
  onClearSelection: () => void;
};

export function LayoutEditToolbar({
  locale,
  selectedCount,
  lockedCount,
  hasDraft,
  warningCount,
  errorCount,
  isValidated,
  repairMessage,
  selectionPointCount,
  onRotateCw,
  onRotateCcw,
  onRotate180,
  onHorizontal,
  onVertical,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  onToggleLock,
  onRepair,
  onCompact,
  onValidate,
  onRevert,
  onApply,
  onClearSelection,
}: LayoutEditToolbarProps) {
  const isEs = locale === "es";
  const disabled = selectedCount === 0;
  const movableCount = Math.max(0, selectedCount - lockedCount);
  const editDisabled = selectedCount === 0 || movableCount === 0;
  const allLocked = selectedCount > 0 && lockedCount >= selectedCount;
  const statusTone =
    errorCount > 0
      ? "border-red-500/60 bg-red-950/80 text-red-100"
      : warningCount > 0
        ? "border-amber-500/60 bg-amber-950/80 text-amber-100"
        : "border-emerald-500/50 bg-emerald-950/75 text-emerald-100";

  const toolButton =
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-45";
  const moveButton =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-100 transition hover:border-cyan-400 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="absolute bottom-5 left-1/2 z-20 w-[min(980px,calc(100%-32px))] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950/94 p-2.5 text-xs text-slate-200 shadow-2xl backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 min-w-[150px]">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
            {isEs ? "Edición de la disposición" : "Layout edit"}
          </div>
          <div className="text-slate-300">
            {selectedCount > 0
              ? isEs
                ? `${selectedCount} equipo(s)${
                    lockedCount > 0 ? ` · ${lockedCount} bloqueado(s)` : ""
                  }`
                : `${selectedCount} item(s)${
                    lockedCount > 0 ? ` · ${lockedCount} locked` : ""
                  }`
              : selectionPointCount > 0
                ? isEs
                  ? `${selectionPointCount} punto(s) marcados`
                  : `${selectionPointCount} point(s) marked`
                : isEs
                  ? "Clic en un equipo · Shift = añadir · puntos vacíos = lazo"
                  : "Click an item · Shift = add · empty clicks = lasso"}
          </div>
        </div>

        <button className={toolButton} disabled={editDisabled} onClick={onRotateCw} type="button">
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          90°
        </button>
        <button className={toolButton} disabled={editDisabled} onClick={onRotateCcw} type="button">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          -90°
        </button>
        <button className={toolButton} disabled={editDisabled} onClick={onRotate180} type="button">
          <RotateCwSquare className="h-3.5 w-3.5" aria-hidden="true" />
          180°
        </button>
        <button className={toolButton} disabled={editDisabled} onClick={onHorizontal} type="button">
          <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Horizontal" : "Horizontal"}
        </button>
        <button className={toolButton} disabled={editDisabled} onClick={onVertical} type="button">
          <Square className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Vertical" : "Vertical"}
        </button>

        <div
          className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 px-1 py-0.5"
          title={
            isEs
              ? "Flechas: 1 m · o arrastra la selección sobre el mapa"
              : "Arrows: 1 m · or drag the selection on the map"
          }
        >
          <span className="px-1 text-[10px] text-slate-400">
            {isEs ? "Mover" : "Move"}
          </span>
          <button
            className={moveButton}
            disabled={editDisabled}
            onClick={onMoveUp}
            type="button"
            title={isEs ? "Mover al norte (1 m)" : "Move north (1 m)"}
            aria-label={isEs ? "Mover al norte" : "Move north"}
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            className={moveButton}
            disabled={editDisabled}
            onClick={onMoveDown}
            type="button"
            title={isEs ? "Mover al sur (1 m)" : "Move south (1 m)"}
            aria-label={isEs ? "Mover al sur" : "Move south"}
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            className={moveButton}
            disabled={editDisabled}
            onClick={onMoveLeft}
            type="button"
            title={isEs ? "Mover al oeste (1 m)" : "Move west (1 m)"}
            aria-label={isEs ? "Mover al oeste" : "Move west"}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            className={moveButton}
            disabled={editDisabled}
            onClick={onMoveRight}
            type="button"
            title={isEs ? "Mover al este (1 m)" : "Move east (1 m)"}
            aria-label={isEs ? "Mover al este" : "Move east"}
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <button
          className={toolButton}
          disabled={disabled}
          onClick={onToggleLock}
          type="button"
          title={
            allLocked
              ? isEs
                ? "Desbloquear la selección"
                : "Unlock the selection"
              : isEs
                ? "Bloquear la selección"
                : "Lock the selection"
          }
        >
          {allLocked ? (
            <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {allLocked
            ? isEs
              ? "Desbloquear"
              : "Unlock"
            : isEs
              ? "Bloquear"
              : "Lock"}
        </button>

        <button
          className={toolButton}
          disabled={editDisabled}
          onClick={onRepair}
          title={
            isEs
              ? "Ejecuta Reparación Inteligente sobre la selección respetando separaciones y bloqueos"
              : "Runs smart repair on the selection while respecting spacing and locks"
          }
          type="button"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Reparación inteligente" : "Smart repair"}
        </button>
        <button
          className={toolButton}
          disabled={editDisabled}
          onClick={onCompact}
          type="button"
          title={
            isEs
              ? "Tira la selección hacia su centro respetando separaciones y bloqueos"
              : "Pulls the selection toward its centre, respecting spacing and locks"
          }
        >
          <Shrink className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Compactar" : "Compact"}
        </button>
        <button className={toolButton} disabled={disabled} onClick={onValidate} type="button">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Validar" : "Validate"}
        </button>
        <button
          className={toolButton}
          disabled={selectionPointCount === 0 || hasDraft}
          onClick={onClearSelection}
          type="button"
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Nueva área" : "New area"}
        </button>

        <div className={`ml-auto rounded-md border px-2.5 py-1.5 ${statusTone}`}>
          {errorCount > 0
            ? isEs
              ? `${errorCount} error(es)`
              : `${errorCount} error(s)`
            : warningCount > 0
              ? isEs
                ? `${warningCount} aviso(s)`
                : `${warningCount} warning(s)`
              : isValidated
                ? isEs
                  ? "Validado"
                  : "Validated"
                : isEs
                  ? "Sin errores"
                  : "No errors"}
        </div>

        <button className={toolButton} disabled={!hasDraft} onClick={onRevert} type="button">
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Revertir" : "Revert"}
        </button>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/70 bg-emerald-500 px-3 text-[11px] font-semibold text-emerald-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!hasDraft}
          onClick={onApply}
          type="button"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {isEs ? "Aplicar" : "Apply"}
        </button>
      </div>
      {repairMessage ? (
        <div className="mt-2 truncate border-t border-slate-800 pt-2 text-[11px] text-slate-400">
          {repairMessage}
        </div>
      ) : null}
    </div>
  );
}
