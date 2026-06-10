"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { getProjectMetrics } from "@/lib/layout/projectMetrics";
import {
  copyFor,
  reliabilityLabel,
  severityLabel,
  warningMessage,
} from "@/lib/i18n";
import type { WarningCategory } from "@/lib/layout/spacingRules";

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  error: "border-rose-500/40 bg-rose-500/10 text-rose-100",
};

const SEVERITY_ICON = {
  info: Info,
  warn: AlertCircle,
  error: AlertCircle,
};

const CATEGORY_ORDER: WarningCategory[] = [
  "geometry",
  "collision",
  "physical",
  "assumption",
  "setup",
];

const CATEGORY_LABELS: Record<
  WarningCategory,
  { es: string; en: string }
> = {
  setup: { es: "Configuración", en: "Setup" },
  geometry: { es: "Geometría", en: "Geometry" },
  collision: { es: "Colisiones", en: "Collisions" },
  assumption: { es: "Supuestos", en: "Assumptions" },
  physical: { es: "Validación física", en: "Physical validation" },
};

export function WarningsPanel() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const locale = useUiStore((s) => s.locale);

  const { warnings, errors } = getProjectMetrics(polygon, placed, anchor);
  const t = copyFor(locale);
  const groupedWarnings = CATEGORY_ORDER.map((category) => ({
    category,
    warnings: warnings.filter(
      (warning) => (warning.category ?? "setup") === category
    ),
  })).filter((group) => group.warnings.length > 0);

  return (
    <section className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
            {t.alerts.title}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {t.alerts.description}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${
            errors.length
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {errors.length
            ? `${errors.length} ${t.results.errors}`
            : t.alerts.noErrors}
        </span>
      </div>

      {warnings.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t.alerts.noActive}
        </div>
      ) : null}

      <div className="space-y-3">
        {groupedWarnings.map((group) => (
          <div key={group.category}>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {locale === "es"
                ? CATEGORY_LABELS[group.category].es
                : CATEGORY_LABELS[group.category].en}
            </div>
            <ul className="space-y-2">
              {group.warnings.map((w) => (
                <li
                  key={w.id}
                  className={`rounded-lg border p-3 text-[11px] leading-snug ${SEVERITY_STYLES[w.severity] ?? ""}`}
                >
                  <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[9px] opacity-90">
                    {(() => {
                      const Icon = SEVERITY_ICON[w.severity];
                      return <Icon className="h-3.5 w-3.5" aria-hidden="true" />;
                    })()}
                    {severityLabel(w.severity, locale)} ·{" "}
                    {reliabilityLabel(w.reliability, locale)}
                  </div>
                  <div>{warningMessage(w, locale)}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
