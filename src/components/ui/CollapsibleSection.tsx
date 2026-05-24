"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Sección colapsable para el sidebar de configuración.
 * Divulgación progresiva: el header actúa como trigger; el contenido
 * se monta solo cuando está abierto.
 */
export function CollapsibleSection({
  icon: Icon,
  iconColor = "text-cyan-300",
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 p-4 text-left transition hover:bg-slate-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-400"
      >
        <div
          className={cn(
            "rounded-md border border-slate-700 bg-slate-900 p-1.5",
            iconColor
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </section>
  );
}
