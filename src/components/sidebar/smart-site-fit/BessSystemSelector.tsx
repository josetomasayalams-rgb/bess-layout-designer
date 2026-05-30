import React from "react";
import { SMART_SITE_FIT_PRESETS } from "@/lib/layout/smartSiteFit/smartSiteFitPresets";

interface BessSystemSelectorProps {
  presetId: string;
  onChange: (presetId: string) => void;
  locale: "es" | "en";
}

/**
 * "Sistema BESS" selector: lets the user pick the BESS-system preset (e.g.
 * Sungrow separate BESS+PCS vs. an integrated Tesla Megapack block). Changing
 * the system re-drives the SmartSiteFit engine; integrated systems have no
 * separate PCS and no BESS/PCS ratio.
 */
export function BessSystemSelector({ presetId, onChange, locale }: BessSystemSelectorProps) {
  const isEs = locale === "es";
  return (
    <div className="space-y-1">
      <label htmlFor="bess-system" className="block text-[11px] text-slate-400">
        {isEs ? "Sistema BESS" : "BESS system"}
      </label>
      <select
        id="bess-system"
        value={presetId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
      >
        {SMART_SITE_FIT_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
