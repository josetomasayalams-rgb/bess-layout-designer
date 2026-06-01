"use client";

/**
 * KPIBar — Fase 11A.1
 *
 * Replaces the visual slot currently occupied by `MetricBar` with an
 * expanded permanent strip of 10 chips grouped in 3 visual clusters:
 *
 *   Dimensioning  : Power · Energy · Duration
 *   Layout        : Area · Containers · PCS/MV
 *   Status        : Compliance · Warnings · Exclusions · Report
 *
 * Constraints (Fase 11A.1):
 *   - Pure read-only consumer. Does not modify any store, rule, validation,
 *     report or domain logic.
 *   - Reuses existing engines (`validateBessLayout`,
 *     `validateElectricalTopology`, `runRegulatoryEvaluation`,
 *     `getProjectMetrics`, `exclusionRegistry`) untouched.
 *   - No interactivity beyond click-to-scroll is implemented yet; the
 *     `onChipClick` prop is a placeholder so the next Fase 11A step can
 *     wire navigation without restructuring this file.
 */

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  MinusCircle,
  OctagonAlert,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import { formatNumber, getProjectMetrics } from "@/lib/layout/projectMetrics";
import { formatRatioAsPercentage } from "@/lib/units/formatUnits";
import { cn } from "@/lib/utils";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { exclusionRegistry } from "@/data/exclusionRegistry";

type ChipTone = "neutral" | "positive" | "info" | "warning" | "critical";

type ChipDef = {
  id: string;
  cluster: "dimensioning" | "layout" | "status";
  label: string;
  value: string;
  unit?: string;
  tone: ChipTone;
  Icon?: typeof CheckCircle2;
  tooltip?: string;
};

const TONE_CLASS: Record<ChipTone, { wrap: string; value: string }> = {
  neutral: {
    wrap: "",
    value: "text-slate-50",
  },
  positive: {
    wrap: "",
    value: "text-emerald-300",
  },
  info: {
    wrap: "",
    value: "text-sky-300",
  },
  warning: {
    wrap: "bg-amber-500/5",
    value: "text-amber-300",
  },
  critical: {
    wrap: "bg-rose-500/10",
    value: "text-rose-300",
  },
};

const CLUSTER_LABEL = {
  dimensioning: { es: "Dimensionamiento", en: "Dimensioning" },
  layout: { es: "Layout", en: "Layout" },
  status: { es: "Estado", en: "Status" },
} as const;

export function KPIBar({
  onChipClick,
}: {
  /**
   * Optional handler invoked when a chip is clicked. Reserved for a
   * follow-up Fase 11A step that wires panel navigation; currently
   * unused by the shell.
   */
  onChipClick?: (chipId: string) => void;
}) {
  // ── Data sources (all already in the project) ──────────────────────
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const blocks = useProjectStore((s) => s.blocks);
  const conversionStations = useProjectStore((s) => s.conversionStations);
  const mvFeeders = useProjectStore((s) => s.mvFeeders);
  const mvBuses = useProjectStore((s) => s.mvBuses);
  const poi = useProjectStore((s) => s.poi);
  const auxiliaryServices = useProjectStore((s) => s.auxiliaryServices);
  const operationalLimits = useProjectStore((s) => s.operationalLimits);
  const ppc = useProjectStore((s) => s.ppc);
  const inconsistencies = useProjectStore((s) => s.inconsistencies);
  const designTargets = useProjectStore((s) => s.designTargets);

  const activeProfileId = useRegulatoryStore((s) => s.activeProfileId);
  const activeRuleProfileId = useRegulatoryStore((s) => s.activeRuleProfileId);
  const context = useRegulatoryStore((s) => s.context);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  // ── Derived metrics (existing engines, unchanged) ──────────────────
  const metrics = useMemo(
    () => getProjectMetrics(polygon, placed, anchor),
    [polygon, placed, anchor]
  );

  const physicalValidation = useMemo(
    () =>
      validateBessLayout({
        placed,
        polygon,
        anchor,
        profile: getRegulatoryProfile(activeProfileId),
        context,
      }),
    [placed, polygon, anchor, activeProfileId, context]
  );

  const electricalValidation = useMemo(
    () =>
      validateElectricalTopology({
        blocks,
        conversionStations,
        mvFeeders,
        mvBuses,
        poi,
        auxiliaryServices,
        operationalLimits,
        ppc,
      }),
    [
      blocks,
      conversionStations,
      mvFeeders,
      mvBuses,
      poi,
      auxiliaryServices,
      operationalLimits,
      ppc,
    ]
  );

  const ruleEvaluation = useMemo(
    () =>
      runRegulatoryEvaluation({
        profileId: activeRuleProfileId,
        layoutValidation: physicalValidation,
        electricalValidation,
        blocks,
        conversionStations,
        mvFeeders,
        mvBuses,
        poi,
        inconsistencies,
      }),
    [
      activeRuleProfileId,
      physicalValidation,
      electricalValidation,
      blocks,
      conversionStations,
      mvFeeders,
      mvBuses,
      poi,
      inconsistencies,
    ]
  );

  // ── Chip values ────────────────────────────────────────────────────
  const { summary, siteArea } = metrics;
  const hasPlaced = placed.length > 0;
  const containers = summary.battery_container_count;
  const stationCount = summary.pcs_count;
  // Integrated presets (e.g. Tesla Megapack) keep the PCS/inverter inside the
  // unit, so there is no separate PCS/MV station to count. Surface "integrated"
  // instead of a misleading "0". Conceptual only.
  const isIntegrated = summary.is_integrated_architecture ?? false;
  const integratedUnitCount = summary.integrated_unit_count ?? 0;

  // Power preference: declared design target first, then the approximate
  // apparent power of the placed PCS/MV inventory (≈ MW, preliminary). This
  // keeps the chip numeric whenever there is enough information instead of a
  // bare dash.
  const targetPowerMW = designTargets?.powerMW?.value;
  const placedPowerMW =
    summary.total_apparent_power_mva > 0
      ? summary.total_apparent_power_mva
      : undefined;
  const effectivePowerMW = targetPowerMW ?? placedPowerMW;
  const powerValue =
    effectivePowerMW !== undefined && effectivePowerMW > 0
      ? formatNumber(effectivePowerMW, 1)
      : "—";

  const energyValue =
    summary.total_energy_mwh_dc_bol > 0
      ? formatNumber(summary.total_energy_mwh_dc_bol, 0)
      : designTargets?.usableEnergyCommercialMWh?.value
        ? formatNumber(designTargets.usableEnergyCommercialMWh.value, 0)
        : "—";

  const durationHours =
    summary.duration_hours_gross ?? designTargets?.durationHours;
  const durationValue =
    durationHours !== undefined && durationHours !== null
      ? formatNumber(durationHours, 1)
      : "—";

  const areaValue = siteArea ? formatNumber(siteArea.area_ha, 1) : "—";
  const occupationText =
    summary.occupation_ratio === null
      ? null
      : formatRatioAsPercentage(summary.occupation_ratio, {
          digits: 0,
          locale,
        });

  // Compliance status — uses effective severities from runRegulatoryEvaluation
  const totals = ruleEvaluation.totals;
  const blockingCount = totals.blockingViolations;
  const warningCount = hasPlaced
    ? totals.warningViolations + metrics.warnings.length
    : metrics.warnings.length;
  const complianceTone: ChipTone =
    !hasPlaced
      ? "neutral"
      : blockingCount > 0
        ? "critical"
        : warningCount > 0
          ? "warning"
          : "positive";
  const complianceValue = !hasPlaced
    ? isEs ? "No evaluado" : "Not evaluated"
    : blockingCount > 0
      ? isEs ? "No cumple" : "Non-compliant"
      : warningCount > 0
        ? isEs ? "Avisos" : "Warnings"
        : isEs ? "Cumple" : "Pass";
  const complianceIcon =
    !hasPlaced
      ? undefined
      : blockingCount > 0
        ? OctagonAlert
        : warningCount > 0
          ? AlertTriangle
          : CheckCircle2;

  const warningsTone: ChipTone = warningCount > 0 ? "warning" : "neutral";
  const exclusionsCount = exclusionRegistry.length;

  // Report chip — Fase 11A.1 only signals availability; emission state
  // can be tracked in a follow-up phase without changing this surface.
  const reportTone: ChipTone = hasPlaced ? "info" : "neutral";
  const reportValue = hasPlaced ? "PDF" : isEs ? "Pendiente" : "Pending";

  const chips: ChipDef[] = [
    {
      id: "kpi-power",
      cluster: "dimensioning",
      label: isEs ? "Potencia" : "Power",
      value: powerValue,
      unit: "MW",
      tone: "neutral",
      tooltip: isEs
        ? "Potencia activa objetivo declarada del proyecto."
        : "Declared project active power target.",
    },
    {
      id: "kpi-energy",
      cluster: "dimensioning",
      label: isEs ? "Energía" : "Energy",
      value: energyValue,
      unit: "MWh",
      tone: "neutral",
      tooltip: isEs
        ? "Energía DC BOL del inventario o energía comercial declarada."
        : "DC BOL energy from the inventory or declared commercial energy.",
    },
    {
      id: "kpi-duration",
      cluster: "dimensioning",
      label: isEs ? "Duración" : "Duration",
      value: durationValue,
      unit: "h",
      tone: "neutral",
      tooltip: isEs
        ? "Estimación preliminar de duración (energía/potencia)."
        : "Preliminary duration estimate (energy / power).",
    },
    {
      id: "kpi-area",
      cluster: "layout",
      label: isEs ? "Área" : "Area",
      value: areaValue,
      unit: "ha",
      tone: "neutral",
      tooltip: occupationText
        ? `${isEs ? "Ocupación" : "Occupation"}: ${occupationText}`
        : undefined,
    },
    {
      id: "kpi-containers",
      cluster: "layout",
      label: isEs ? "Contenedores" : "Containers",
      value: String(containers),
      tone: "neutral",
    },
    {
      id: "kpi-pcs",
      cluster: "layout",
      label: "PCS/MV",
      value: isIntegrated
        ? isEs
          ? "Integrado"
          : "Integrated"
        : String(stationCount),
      tone: isIntegrated ? "info" : "neutral",
      tooltip: isIntegrated
        ? isEs
          ? `PCS/inversor integrado en la unidad (${integratedUnitCount} u.); sin estación PCS/MV separada. Conceptual.`
          : `PCS/inverter integrated in the unit (${integratedUnitCount} u.); no separate PCS/MV station. Conceptual.`
        : undefined,
    },
    {
      id: "kpi-compliance",
      cluster: "status",
      label: isEs ? "Cumplimiento" : "Compliance",
      value: complianceValue,
      tone: complianceTone,
      Icon: complianceIcon,
      tooltip: isEs
        ? "Estado global del motor regulatorio para el perfil activo."
        : "Global regulatory engine status for the active profile.",
    },
    {
      id: "kpi-warnings",
      cluster: "status",
      label: isEs ? "Avisos" : "Warnings",
      value: String(warningCount),
      tone: warningsTone,
      Icon: warningCount > 0 ? AlertTriangle : undefined,
      tooltip: isEs
        ? "Avisos del motor físico y reglas regulatorias activas."
        : "Warnings from the physical engine and active regulatory rules.",
    },
    {
      id: "kpi-exclusions",
      cluster: "status",
      label: isEs ? "Exclusiones" : "Exclusions",
      value: String(exclusionsCount),
      tone: "info",
      Icon: MinusCircle,
      tooltip: isEs
        ? "Exclusiones declaradas del MVP (ingeniería de detalle)."
        : "Declared MVP exclusions (detail engineering).",
    },
    {
      id: "kpi-report",
      cluster: "status",
      label: isEs ? "Reporte" : "Report",
      value: reportValue,
      tone: reportTone,
      Icon: FileText,
      tooltip: isEs
        ? "Disponibilidad del reporte técnico preliminar."
        : "Preliminary technical report availability.",
    },
  ];

  return (
    <div
      role="region"
      aria-label={isEs ? "KPIs del proyecto" : "Project KPIs"}
      className="flex items-stretch overflow-x-auto border-b border-slate-800 bg-slate-950"
    >
      {(["dimensioning", "layout", "status"] as const).map((cluster, idx) => {
        const clusterChips = chips.filter((c) => c.cluster === cluster);
        return (
          <div
            key={cluster}
            className={cn(
              "flex items-stretch divide-x divide-slate-900",
              idx > 0 && "border-l-2 border-slate-800"
            )}
          >
            <div
              aria-hidden="true"
              className="hidden shrink-0 items-center px-2 text-[9px] uppercase tracking-[0.18em] text-slate-600 xl:flex"
            >
              {isEs ? CLUSTER_LABEL[cluster].es : CLUSTER_LABEL[cluster].en}
            </div>
            {clusterChips.map((chip) => {
              const tone = TONE_CLASS[chip.tone];
              const Icon = chip.Icon;
              const isClickable = !!onChipClick;
              const Tag = isClickable ? "button" : "div";
              return (
                <Tag
                  key={chip.id}
                  type={isClickable ? "button" : undefined}
                  onClick={isClickable ? () => onChipClick?.(chip.id) : undefined}
                  title={chip.tooltip}
                  className={cn(
                    "flex min-w-[112px] flex-col gap-0.5 px-3 py-2 text-left",
                    tone.wrap,
                    isClickable && "transition-colors hover:bg-slate-900/60"
                  )}
                >
                  <span className="flex items-center gap-1 truncate text-[10px] uppercase tracking-wide text-slate-500">
                    {Icon ? (
                      <Icon
                        className={cn("h-3 w-3 shrink-0", tone.value)}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="truncate">{chip.label}</span>
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      tone.value
                    )}
                  >
                    {chip.value}
                    {chip.unit ? (
                      <span className="ml-1 text-[10px] font-normal text-slate-500">
                        {chip.unit}
                      </span>
                    ) : null}
                  </span>
                </Tag>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
