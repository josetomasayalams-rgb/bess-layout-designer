"use client";

import { useMemo, useState } from "react";
import { Save, Scale, Trash2 } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import {
  compareSizingSnapshots,
  rowWinner,
} from "@/lib/sizing/compareSizingSnapshots";
import type { SizingSnapshot } from "@/lib/sizing/sizingSnapshot";
import {
  formatApparentPowerMva,
  formatEnergyMWh,
  formatNumber,
} from "@/lib/units/formatUnits";

function formatMetric(
  key: string,
  value: number | null,
  locale: "en" | "es"
): string {
  if (value === null) return "—";
  if (key === "energyMWh") return formatEnergyMWh(value, { digits: 1, locale });
  if (key === "powerMW") return formatApparentPowerMva(value, { digits: 1, locale });
  if (key === "durationHours") return `${formatNumber(value, 2, locale)} h`;
  return formatNumber(value, key === "score" ? 1 : 0, locale);
}

export function SizingComparisonPanel() {
  const snapshots = useProjectStore((s) => s.sizingSnapshots);
  const compare = useProjectStore((s) => s.sizingCompare);
  const applied = useProjectStore((s) => s.smartSiteFitApplied);
  const saveSizingSnapshot = useProjectStore((s) => s.saveSizingSnapshot);
  const removeSizingSnapshot = useProjectStore((s) => s.removeSizingSnapshot);
  const clearSizingSnapshots = useProjectStore((s) => s.clearSizingSnapshots);
  const setSizingCompareSlot = useProjectStore((s) => s.setSizingCompareSlot);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const [name, setName] = useState("");

  const canSave = applied !== null;

  const snapshotA = useMemo<SizingSnapshot | null>(
    () => snapshots.find((s) => s.id === compare.A) ?? null,
    [snapshots, compare.A]
  );
  const snapshotB = useMemo<SizingSnapshot | null>(
    () => snapshots.find((s) => s.id === compare.B) ?? null,
    [snapshots, compare.B]
  );

  const rows = useMemo(
    () => (snapshotA && snapshotB ? compareSizingSnapshots(snapshotA, snapshotB) : []),
    [snapshotA, snapshotB]
  );

  const handleSave = () => {
    if (!canSave) return;
    saveSizingSnapshot(name);
    setName("");
  };

  const toggleSlot = (slot: "A" | "B", id: string) => {
    setSizingCompareSlot(slot, compare[slot] === id ? null : id);
  };

  const createdTime = (snapshot: SizingSnapshot): string =>
    new Date(snapshot.createdAt).toLocaleTimeString(isEs ? "es-CL" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <CollapsibleSection
      icon={Scale}
      iconColor="text-amber-300"
      title={isEs ? "Comparador de predimensionamiento" : "Sizing comparator"}
      description={
        isEs
          ? "Guarda predimensionamientos aplicados y compáralos entre sí."
          : "Save applied sizing results and compare them."
      }
    >
      <div className="space-y-2">
        {/* Save row */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEs ? "Nombre del predimensionamiento…" : "Sizing name…"}
              className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-amber-400/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-100 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {isEs ? "Guardar" : "Save"}
            </button>
          </div>
          {!canSave ? (
            <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
              {isEs
                ? "Aplica un resultado de Smart Sizing para poder guardar un predimensionamiento."
                : "Apply a Smart Sizing result to save a sizing snapshot."}
            </p>
          ) : (
            <p className="mt-1.5 text-[9px] leading-snug text-amber-300/80">
              {isEs ? "Valores preliminares." : "Preliminary values."}
            </p>
          )}
        </div>

        {/* Snapshot list */}
        {snapshots.length === 0 ? (
          <p className="rounded-md border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-[10px] leading-snug text-slate-500">
            {isEs
              ? "Aún no hay predimensionamientos guardados."
              : "No saved sizing snapshots yet."}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.id}
                data-testid="sizing-snapshot-row"
                className="rounded-lg border border-slate-800 bg-slate-900/70 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-semibold text-slate-200">
                    {snapshot.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    {createdTime(snapshot)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  {formatEnergyMWh(snapshot.energyMWh, { digits: 1, locale })} ·{" "}
                  {formatApparentPowerMva(snapshot.powerMW, { digits: 1, locale })} ·{" "}
                  {formatNumber(snapshot.bessCount, 0, locale)} BESS ·{" "}
                  {formatNumber(snapshot.pcsCount, 0, locale)} PCS
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {(["A", "B"] as const).map((slot) => {
                    const active = compare[slot] === snapshot.id;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot, snapshot.id)}
                        aria-pressed={active}
                        className={`inline-flex h-6 w-7 items-center justify-center rounded-md border text-[10px] font-semibold ${
                          active
                            ? "border-amber-300 bg-amber-400/20 text-amber-100"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => removeSizingSnapshot(snapshot.id)}
                    aria-label={isEs ? "Borrar predimensionamiento" : "Delete snapshot"}
                    className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-400 hover:border-rose-400 hover:text-rose-200"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {snapshots.length > 1 ? (
          <button
            type="button"
            onClick={clearSizingSnapshots}
            className="text-[10px] text-slate-500 underline-offset-2 hover:text-rose-300 hover:underline"
          >
            {isEs ? "Borrar todos" : "Clear all"}
          </button>
        ) : null}

        {/* Comparison table */}
        {snapshotA && snapshotB ? (
          <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[10px]">
              <div className="font-semibold uppercase tracking-wide text-amber-200">
                {isEs ? "Métrica" : "Metric"}
              </div>
              <div className="w-16 truncate text-right font-semibold text-amber-200">
                {snapshotA.name}
              </div>
              <div className="w-16 truncate text-right font-semibold text-amber-200">
                {snapshotB.name}
              </div>

              {rows.map((row) => {
                const winner = rowWinner(row);
                return (
                  <div key={row.key} className="contents">
                    <div className="border-t border-slate-800 py-1 text-slate-400">
                      {isEs ? row.labelEs : row.labelEn}
                      {row.pctDelta !== null && row.pctDelta !== 0 ? (
                        <span className="ml-1 text-[9px] text-slate-500">
                          ({row.pctDelta > 0 ? "+" : ""}
                          {formatNumber(row.pctDelta, 1, locale)}%)
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={`border-t border-slate-800 py-1 text-right font-mono ${
                        winner === "A"
                          ? "text-emerald-300"
                          : winner === "B"
                            ? "text-slate-500"
                            : "text-slate-200"
                      }`}
                    >
                      {formatMetric(row.key, row.valueA, locale)}
                    </div>
                    <div
                      className={`border-t border-slate-800 py-1 text-right font-mono ${
                        winner === "B"
                          ? "text-emerald-300"
                          : winner === "A"
                            ? "text-slate-500"
                            : "text-slate-200"
                      }`}
                    >
                      {formatMetric(row.key, row.valueB, locale)}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[9px] leading-snug text-slate-500">
              {isEs
                ? "Comparación preliminar. No reemplaza ingeniería de detalle."
                : "Preliminary comparison. Not a substitute for detailed engineering."}
            </p>
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}
