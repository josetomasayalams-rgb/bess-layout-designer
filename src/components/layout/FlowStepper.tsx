"use client";

import { Check, Circle, CircleDot } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { getProjectMetrics } from "@/lib/layout/projectMetrics";
import { copyFor } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function FlowStepper() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";
  const metrics = getProjectMetrics(polygon, placed, anchor);
  const t = copyFor(locale);

  const hasEquipment = placed.length > 0;
  const hasErrors = metrics.errors.length > 0;

  // Fase actual derivada del estado real del proyecto.
  const activeIndex = !metrics.hasTerrain
    ? 0
    : !hasEquipment
      ? 1
      : hasErrors
        ? 2
        : 3;

  const completed = [
    metrics.hasTerrain,
    hasEquipment,
    hasEquipment && !hasErrors,
    hasEquipment && !hasErrors,
  ];

  const hints = isEs
    ? [
        "Dibuja o carga el polígono del terreno para comenzar.",
        "Selecciona un equipo del catálogo y haz clic en el mapa para ubicarlo.",
        "Resuelve las colisiones y avisos detectados en el layout.",
        "Revisa métricas, densidades y cumplimiento normativo.",
      ]
    : [
        "Draw or load the site polygon to start.",
        "Select equipment from the catalog and click the map to place it.",
        "Resolve the collisions and warnings detected in the layout.",
        "Review metrics, densities and regulatory compliance.",
      ];

  return (
    <ol className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-1 2xl:grid-cols-4">
      {t.steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isComplete = completed[index];
        const isUpcoming = index > activeIndex && !isComplete;

        return (
          <li
            key={step.label}
            title={hints[index]}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "min-w-0 rounded-md px-2 py-2 transition-colors",
              isActive && "bg-cyan-400/10 ring-1 ring-inset ring-cyan-400/30",
              isComplete && !isActive && "bg-emerald-400/5"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
                isActive
                  ? "text-cyan-100"
                  : isComplete
                    ? "text-slate-300"
                    : isUpcoming
                      ? "text-slate-600"
                      : "text-slate-400"
              )}
            >
              {isComplete ? (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-emerald-300"
                  aria-hidden="true"
                />
              ) : isActive ? (
                <CircleDot
                  className="h-3.5 w-3.5 shrink-0 text-cyan-300"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="h-3.5 w-3.5 shrink-0 text-slate-700"
                  aria-hidden="true"
                />
              )}
              <span className="truncate">
                {index + 1}. {step.label}
              </span>
            </div>
            <div
              className={cn(
                "mt-0.5 truncate text-[10px]",
                isUpcoming ? "text-slate-700" : "text-slate-500"
              )}
            >
              {step.detail}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
