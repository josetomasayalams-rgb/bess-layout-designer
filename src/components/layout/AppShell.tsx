"use client";

import { useEffect, useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelTopClose,
  PanelTopOpen,
} from "lucide-react";
import { BessMap } from "@/components/map/BessMap";
import { Toolbar } from "./Toolbar";
import { MetricBar } from "./MetricBar";
import { FlowStepper } from "./FlowStepper";
import { SectionRail, type AppSectionId } from "./SectionRail";
import { SectionPanelHost } from "./SectionPanelHost";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

// Las 4 combinaciones se escriben literales para que el JIT de Tailwind las detecte.
const GRID_COLS: Record<string, string> = {
  "open-open":
    "lg:grid-cols-[360px_minmax(0,1fr)_380px] xl:grid-cols-[380px_minmax(0,1fr)_400px]",
  "closed-open":
    "lg:grid-cols-[0px_minmax(0,1fr)_380px] xl:grid-cols-[0px_minmax(0,1fr)_400px]",
  "open-closed":
    "lg:grid-cols-[360px_minmax(0,1fr)_0px] xl:grid-cols-[380px_minmax(0,1fr)_0px]",
  "closed-closed":
    "lg:grid-cols-[0px_minmax(0,1fr)_0px] xl:grid-cols-[0px_minmax(0,1fr)_0px]",
};

const TAB_BUTTON =
  "absolute top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center border border-slate-700 bg-slate-950/90 px-1 py-3 text-slate-300 shadow-lg backdrop-blur transition hover:border-cyan-400 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 lg:flex";

export function AppShell() {
  const [activeSection, setActiveSection] = useState<AppSectionId>("site");
  const [topCollapsed, setTopCollapsed] = useState(false);
  const hydrateLocale = useUiStore((s) => s.hydrateLocale);
  const hydrateTheme = useUiStore((s) => s.hydrateTheme);
  const hydrateLayerVisibility = useUiStore((s) => s.hydrateLayerVisibility);
  const locale = useUiStore((s) => s.locale);
  const leftCollapsed = useUiStore((s) => s.leftSidebarCollapsed);
  const rightCollapsed = useUiStore((s) => s.rightSidebarCollapsed);
  const toggleLeft = useUiStore((s) => s.toggleLeftSidebar);
  const toggleRight = useUiStore((s) => s.toggleRightSidebar);
  const isEs = locale === "es";

  useEffect(() => {
    hydrateLocale();
    hydrateTheme();
    hydrateLayerVisibility();
  }, [hydrateLocale, hydrateTheme, hydrateLayerVisibility]);

  const gridCols =
    GRID_COLS[
      `${leftCollapsed ? "closed" : "open"}-${
        rightCollapsed ? "closed" : "open"
      }`
    ];

  const leftLabel = leftCollapsed
    ? isEs
      ? "Mostrar panel de configuración"
      : "Show configuration panel"
    : isEs
      ? "Ocultar panel de configuración"
      : "Hide configuration panel";
  const rightLabel = rightCollapsed
    ? isEs
      ? "Mostrar panel de resultados"
      : "Show results panel"
    : isEs
      ? "Ocultar panel de resultados"
      : "Hide results panel";

  const topLabel = topCollapsed
    ? isEs
      ? "Mostrar panel superior"
      : "Show top panel"
    : isEs
      ? "Ocultar panel superior"
      : "Hide top panel";

  return (
    <div className="flex min-h-dvh w-full flex-col bg-slate-950 text-slate-100 lg:h-screen">
      <Toolbar />
      <MetricBar />
      <div
        className={cn(
          "transition-[max-height] duration-300 ease-in-out overflow-hidden flex flex-col shrink-0",
          topCollapsed ? "max-h-0" : "max-h-[200px]"
        )}
      >
        <div className="border-b border-slate-800 bg-slate-950 px-2 py-2 sm:px-3">
          <FlowStepper />
        </div>
      </div>
      <div className="flex w-full max-w-full min-w-0 flex-1 overflow-hidden bg-slate-950">
        <SectionRail
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div
          className={`grid w-full max-w-full min-w-0 flex-1 grid-cols-1 overflow-x-hidden bg-slate-950 lg:min-h-0 lg:overflow-hidden lg:transition-[grid-template-columns] lg:duration-300 lg:ease-in-out ${gridCols}`}
        >
          <SectionPanelHost activeSection={activeSection} region="primary" />
          <main className="relative h-[560px] min-h-[460px] min-w-0 border-y border-slate-800 lg:h-auto lg:min-h-0 lg:border-y-0">
            <BessMap />
            <button
              type="button"
              onClick={() => setTopCollapsed(!topCollapsed)}
              className={cn(
                TAB_BUTTON,
                "top-0 right-[140px] -translate-y-4 rounded-b-md border-t-0"
              )}
              title={topLabel}
              aria-label={topLabel}
              aria-expanded={!topCollapsed}
            >
              {topCollapsed ? (
                <PanelTopOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelTopClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleLeft}
              className={`${TAB_BUTTON} left-0 rounded-r-md border-l-0`}
              title={leftLabel}
              aria-label={leftLabel}
            >
              {leftCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleRight}
              className={`${TAB_BUTTON} right-0 rounded-l-md border-r-0`}
              title={rightLabel}
              aria-label={rightLabel}
            >
              {rightCollapsed ? (
                <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelRightClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </main>
          <SectionPanelHost activeSection={activeSection} region="secondary" />
        </div>
      </div>
    </div>
  );
}
