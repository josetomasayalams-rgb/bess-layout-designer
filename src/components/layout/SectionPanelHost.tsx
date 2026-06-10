"use client";

import { Info, MapPinned, Ruler, Settings2 } from "lucide-react";
import { BessModelLibraryPanel } from "@/components/sidebar/BessModelLibraryPanel";
import { BessParkSummaryPanel } from "@/components/sidebar/BessParkSummaryPanel";
import { CaseStudyPanel } from "@/components/sidebar/CaseStudyPanel";
import { EquipmentCatalogPanel } from "@/components/sidebar/EquipmentCatalogPanel";
import { LayoutComparisonPanel } from "@/components/sidebar/LayoutComparisonPanel";
import { MVArchitecturePanel } from "@/components/sidebar/MVArchitecturePanel";
import { ParametricTerrainPanel } from "@/components/sidebar/ParametricTerrainPanel";
import { PreliminaryDesignToolsPanel } from "@/components/sidebar/PreliminaryDesignToolsPanel";
import { RegulatoryCompliancePanel } from "@/components/sidebar/RegulatoryCompliancePanel";
import { RegulatoryConfigPanel } from "@/components/sidebar/RegulatoryConfigPanel";
import { SizingComparisonPanel } from "@/components/sidebar/SizingComparisonPanel";
import { SmartSiteFitPanel } from "@/components/sidebar/SmartSiteFitPanel";
import { TechnicalReportPanel } from "@/components/sidebar/TechnicalReportPanel";
import { WarningsPanel } from "@/components/sidebar/WarningsPanel";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { defaultConstraints } from "@/data/defaultConstraints";
import { constraintCopy, copyFor } from "@/lib/i18n";
import { getProjectMetrics } from "@/lib/layout/projectMetrics";
import { formatAreaDual, formatLength } from "@/lib/units/formatUnits";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import type { AppSectionId } from "./SectionRail";

type SectionPanelHostProps = {
  activeSection: AppSectionId;
  region: "primary" | "secondary";
};

const SECTION_COPY: Record<
  AppSectionId,
  { es: { title: string; description: string }; en: { title: string; description: string } }
> = {
  site: {
    es: {
      title: "Sitio",
      description: "Terreno, polígono, área y preconfiguraciones del proyecto.",
    },
    en: {
      title: "Site",
      description: "Terrain, polygon, area and project presets.",
    },
  },
  equipment: {
    es: {
      title: "Equipos",
      description: "Catálogos, modelos y biblioteca de equipos.",
    },
    en: {
      title: "Equipment",
      description: "Catalogs, models and equipment library.",
    },
  },
  layout: {
    es: {
      title: "Layout",
      description: "Herramientas de disposición física y arquitectura MT.",
    },
    en: {
      title: "Layout",
      description: "Physical placement tools and MV architecture.",
    },
  },
  comparison: {
    es: {
      title: "Comparador",
      description: "Predimensionamientos y alternativas A/B (tabla y mapa).",
    },
    en: {
      title: "Comparator",
      description: "Sizings and A/B alternatives (table and map).",
    },
  },
  compliance: {
    es: {
      title: "Cumplimiento",
      description: "Reglas activas, hallazgos, avisos y exclusiones.",
    },
    en: {
      title: "Compliance",
      description: "Active rules, findings, warnings and exclusions.",
    },
  },
  report: {
    es: {
      title: "Reporte",
      description: "Resumen técnico y emisión del reporte preliminar.",
    },
    en: {
      title: "Report",
      description: "Technical summary and preliminary report output.",
    },
  },
};

export function SectionPanelHost({
  activeSection,
  region,
}: SectionPanelHostProps) {
  const locale = useUiStore((s) => s.locale);
  const copy = SECTION_COPY[activeSection][locale];
  const isPrimary = region === "primary";
  const sectionCue = useSectionCue(activeSection, region);

  return (
    <aside
      aria-label={`${copy.title} ${isPrimary ? "primary" : "secondary"} panel`}
      className={
        isPrimary
          ? "flex w-full max-w-full min-w-0 flex-col overflow-x-hidden bg-slate-950 text-slate-100 lg:min-h-0 lg:border-r lg:border-slate-800"
          : "min-w-0 overflow-x-hidden bg-slate-950 text-slate-100 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-slate-800"
      }
    >
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {copy.title}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          {copy.description}
        </p>
        {sectionCue ? <SectionCue {...sectionCue} /> : null}
      </div>
      <div className={isPrimary ? "flex-1 lg:min-h-0 lg:overflow-y-auto" : ""}>
        {renderSectionPanels(activeSection, region)}
      </div>
    </aside>
  );
}

function useSectionCue(
  activeSection: AppSectionId,
  region: "primary" | "secondary"
): { label: string; text: string } | null {
  const locale = useUiStore((s) => s.locale);
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const isEs = locale === "es";
  const hasTerrain = polygon.length >= 3;
  const hasLayout = placed.length > 0;

  if (activeSection === "site" && region === "primary" && !hasTerrain) {
    return {
      label: isEs ? "Estado inicial" : "Initial state",
      text: isEs
        ? "Dibuja o carga un polígono para habilitar el área, las coordenadas y la disposición."
        : "Draw or load a polygon to enable area, coordinates and layout.",
    };
  }

  if (activeSection === "equipment" && region === "primary" && !hasLayout) {
    return {
      label: isEs ? "Sin equipos colocados" : "No placed equipment",
      text: isEs
        ? "Selecciona o revisa modelos del catálogo; el dimensionamiento vive ahora en la sección Layout."
        : "Select or review catalog models; sizing tools now live in the Layout section.",
    };
  }

  if (activeSection === "layout" && region === "primary" && !hasLayout) {
    return {
      label: isEs ? "Layout pendiente" : "Layout pending",
      text: isEs
        ? "Genera o coloca equipos para revisar la disposición física y la arquitectura MT."
        : "Generate or place equipment to review physical layout and MV architecture.",
    };
  }

  if (activeSection === "compliance" && region === "primary" && !hasLayout) {
    return {
      label: isEs ? "Revisión preliminar" : "Preliminary review",
      text: isEs
        ? "Los avisos se muestran sin bloquear la navegación; todavía no hay una disposición evaluable."
        : "Warnings remain visible without blocking navigation; no evaluable layout exists yet.",
    };
  }

  if (activeSection === "report" && region === "primary" && !hasLayout) {
    return {
      label: isEs ? "Reporte pendiente" : "Report pending",
      text: isEs
        ? "El reporte preliminar puede abrirse, pero la salida técnica requiere datos de sitio y layout."
        : "The preliminary report can be opened, but the technical output needs site and layout data.",
    };
  }

  return null;
}

function SectionCue({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-2 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-slate-300">{text}</p>
    </div>
  );
}

function renderSectionPanels(
  activeSection: AppSectionId,
  region: "primary" | "secondary"
) {
  if (activeSection === "site") {
    return region === "primary" ? <SiteTerrainPanel /> : <CaseStudyPanel />;
  }

  if (activeSection === "equipment") {
    return region === "primary" ? (
      <BessModelLibraryPanel />
    ) : (
      <EquipmentCatalogPanel />
    );
  }

  if (activeSection === "layout") {
    return region === "primary" ? (
      <>
        <SmartSiteFitPanel />
        <PreliminaryDesignToolsPanel />
        <MVArchitecturePanel />
      </>
    ) : null;
  }

  if (activeSection === "comparison") {
    return region === "primary" ? (
      <>
        <SizingComparisonPanel />
        <LayoutComparisonPanel />
      </>
    ) : null;
  }

  if (activeSection === "compliance") {
    return region === "primary" ? (
      <>
        <RegulatoryConfigPanel />
        <WarningsPanel />
      </>
    ) : (
      <>
        <RegulatoryCompliancePanel />
        <SpacingRulesPanel />
        <AdvancedChecksPanel />
      </>
    );
  }

  return region === "primary" ? (
    <section className="border-b border-slate-800 p-4">
      <TechnicalReportPanel />
    </section>
  ) : (
    <BessParkSummaryPanel />
  );
}

function SiteTerrainPanel() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const locale = useUiStore((s) => s.locale);
  const metrics = getProjectMetrics(polygon, placed, anchor);
  const t = copyFor(locale);

  return (
    <CollapsibleSection
      icon={MapPinned}
      title={t.terrain.title}
      description={t.terrain.description}
    >
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-slate-500">{t.terrain.status}</dt>
            <dd className="mt-1 font-medium text-slate-100">
              {metrics.hasTerrain ? t.terrain.polygonReady : t.terrain.noTerrain}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.terrain.vertices}</dt>
            <dd className="mt-1 font-mono text-slate-100">{polygon.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.terrain.area}</dt>
            <dd className="mt-1 font-mono text-slate-100">
              {metrics.siteArea
                ? formatAreaDual(metrics.siteArea.area_m2, {
                    digits: 0,
                    locale,
                  })
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.terrain.coordinateRef}</dt>
            <dd className="mt-1 font-mono text-slate-100">
              {anchor ? t.terrain.localEnu : "-"}
            </dd>
          </div>
        </dl>
        {!metrics.hasTerrain ? (
          <p className="mt-3 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-[11px] leading-snug text-cyan-100">
            {t.terrain.empty}
          </p>
        ) : null}
      </div>
      <ParametricTerrainPanel />
    </CollapsibleSection>
  );
}

function SpacingRulesPanel() {
  const locale = useUiStore((s) => s.locale);
  const t = copyFor(locale);
  const isEs = locale === "es";

  return (
    <CollapsibleSection
      icon={Ruler}
      title={t.spacing.title}
      description={t.spacing.description}
    >
      <ScopeNote
        label={isEs ? "Vista informativa" : "Informational view"}
        text={
          isEs
            ? "Supuestos preliminares existentes desde defaultConstraints. No son una validación normativa independiente ni reemplazan fabricante, AHJ o ingeniería de detalle."
            : "Existing preliminary assumptions from defaultConstraints. This is not an independent code validation and does not replace manufacturer, AHJ or detail engineering criteria."
        }
      />
      <div className="space-y-2">
        {defaultConstraints.map((constraint) => {
          const translated = constraintCopy(constraint.id, locale);
          return (
            <div
              key={constraint.id}
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-slate-200">
                  {translated.label}
                </div>
                <div className="font-mono text-xs text-cyan-200">
                  {formatLength(constraint.value_m, {
                    digits: 1,
                    locale,
                  })}
                </div>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                {translated.notes || constraint.notes}
              </p>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

function AdvancedChecksPanel() {
  const locale = useUiStore((s) => s.locale);
  const t = copyFor(locale);
  const isEs = locale === "es";

  return (
    <CollapsibleSection
      icon={Settings2}
      title={t.advanced.title}
      description={t.advanced.description}
    >
      <ScopeNote
        label={isEs ? "Lista de verificación orientativa" : "Guidance checklist"}
        text={
          isEs
            ? "No ejecuta estudios eléctricos, civiles ni de seguridad. No cambia severidades, reglas ni exclusiones."
            : "Does not run electrical, civil or safety studies. It does not change severities, rules or exclusions."
        }
      />
      <div className="space-y-2 text-[11px] text-slate-400">
        {t.advanced.checks.map((item) => (
          <div
            key={item}
            className="flex gap-2 rounded-md border border-slate-800 bg-slate-900/50 p-2"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function ScopeNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="mb-3 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
        {label}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-cyan-50/85">{text}</p>
    </div>
  );
}
