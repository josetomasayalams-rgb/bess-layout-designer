"use client";

import {
  FileText,
  GitCompare,
  LayoutGrid,
  type LucideIcon,
  MapPinned,
  Package,
  ShieldCheck,
} from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export type AppSectionId =
  | "site"
  | "equipment"
  | "layout"
  | "comparison"
  | "compliance"
  | "report";

export type SectionRailId = AppSectionId;

type SectionDef = {
  id: AppSectionId;
  icon: LucideIcon;
  labelEs: string;
  labelEn: string;
  hintEs: string;
  hintEn: string;
};

const SECTIONS: readonly SectionDef[] = [
  {
    id: "site",
    icon: MapPinned,
    labelEs: "Sitio",
    labelEn: "Site",
    hintEs: "Define el polígono del terreno y los supuestos del proyecto.",
    hintEn: "Define the site polygon and project assumptions.",
  },
  {
    id: "equipment",
    icon: Package,
    labelEs: "Equipos",
    labelEn: "Equipment",
    hintEs: "Selecciona modelos BESS/PCS y dimensiona el parque.",
    hintEn: "Pick BESS/PCS models and size the park.",
  },
  {
    id: "layout",
    icon: LayoutGrid,
    labelEs: "Layout",
    labelEn: "Layout",
    hintEs: "Genera la disposición física y la arquitectura MT preliminar.",
    hintEn: "Generate the physical layout and preliminary MV architecture.",
  },
  {
    id: "comparison",
    icon: GitCompare,
    labelEs: "Comparar",
    labelEn: "Compare",
    hintEs: "Compara predimensionamientos y alternativas A/B (tabla y mapa).",
    hintEn: "Compare sizings and A/B alternatives (table and map).",
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    labelEs: "Reglas",
    labelEn: "Compliance",
    hintEs: "Revisa validaciones regulatorias, físicas y eléctricas preliminares.",
    hintEn: "Review regulatory, physical and preliminary electrical checks.",
  },
  {
    id: "report",
    icon: FileText,
    labelEs: "Reporte",
    labelEn: "Report",
    hintEs: "Genera el reporte técnico preliminar en PDF.",
    hintEn: "Generate the preliminary technical PDF report.",
  },
] as const;

export function SectionRail({
  activeSection,
  onSectionChange,
  className,
}: {
  activeSection: AppSectionId;
  onSectionChange: (id: AppSectionId) => void;
  className?: string;
}) {
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  return (
    <nav
      aria-label={isEs ? "Secciones del flujo" : "Workflow sections"}
      className={cn(
        "flex w-14 shrink-0 flex-col items-stretch gap-1 border-r border-slate-800 bg-slate-950 py-3",
        className
      )}
    >
      {SECTIONS.map((sec, index) => {
        const Icon = sec.icon;
        const isActive = activeSection === sec.id;
        const label = isEs ? sec.labelEs : sec.labelEn;
        const hint = isEs ? sec.hintEs : sec.hintEn;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => onSectionChange(sec.id)}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${index + 1}. ${label}`}
            title={`${index + 1}. ${label} - ${hint}`}
            className={cn(
              "group relative mx-1.5 flex flex-col items-center gap-0.5 rounded-md px-1 py-2 text-[9px] uppercase tracking-wide transition-colors",
              isActive
                ? "bg-cyan-400/10 text-cyan-100 ring-1 ring-inset ring-cyan-400/40"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="leading-tight">{label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-l-sm",
                isActive ? "bg-cyan-300" : "bg-transparent"
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}

/** Exported for tests and downstream wiring. */
export const SECTION_RAIL_IDS = SECTIONS.map((s) => s.id);
