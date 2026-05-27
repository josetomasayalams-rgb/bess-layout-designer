"use client";

import { ClipboardCheck } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { REGULATORY_PROFILES } from "@/rules/regulatoryProfileMetadata";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import type {
  BatteryChemistry,
  DesignLevel,
  FireBarrierType,
  FireSuppressionType,
  InstallationType,
  VentilationType,
} from "@/types/bessLayoutTypes";

const selectClass =
  "mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400";

const checkboxClass =
  "h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-cyan-400 focus:ring-cyan-400";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-[11px] text-slate-400">
      {label}
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-slate-600">{hint}</span> : null}
    </label>
  );
}

export function RegulatoryConfigPanel() {
  const activeProfileId = useRegulatoryStore((s) => s.activeProfileId);
  const context = useRegulatoryStore((s) => s.context);
  const setActiveProfileId = useRegulatoryStore((s) => s.setActiveProfileId);
  const updateContext = useRegulatoryStore((s) => s.updateContext);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const copy = {
    title: isEs ? "Configuración normativa BESS" : "BESS regulatory settings",
    description: isEs
      ? "Selecciona el perfil activo. Las reglas se evalúan contra geometría real del layout."
      : "Select the active profile. Rules are evaluated against real layout geometry.",
    profile: isEs ? "Perfil normativo" : "Regulatory profile",
    chemistry: isEs ? "Química" : "Chemistry",
    installation: isEs ? "Instalación" : "Installation",
    designLevel: isEs ? "Nivel de diseño" : "Design level",
    suppression: isEs ? "Supresión" : "Suppression",
    ventilation: isEs ? "Ventilación" : "Ventilation",
    barrier: isEs ? "Barrera cortafuego" : "Fire barrier",
  };

  return (
    <CollapsibleSection
      icon={ClipboardCheck}
      title={copy.title}
      description={copy.description}
    >
      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <Field label={copy.profile}>
          <select
            className={selectClass}
            value={activeProfileId}
            onChange={(event) =>
              setActiveProfileId(event.target.value as typeof activeProfileId)
            }
          >
            {REGULATORY_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={copy.chemistry}>
            <select
              className={selectClass}
              value={context.batteryChemistry}
              onChange={(event) =>
                updateContext({
                  batteryChemistry: event.target.value as BatteryChemistry,
                })
              }
            >
              <option value="lfp">LFP</option>
              <option value="nmc">NMC</option>
              <option value="sodium_ion">{isEs ? "Sodio-ion" : "Sodium-ion"}</option>
              <option value="other">{isEs ? "Otra" : "Other"}</option>
            </select>
          </Field>

          <Field label={copy.installation}>
            <select
              className={selectClass}
              value={context.installationType}
              onChange={(event) =>
                updateContext({
                  installationType: event.target.value as InstallationType,
                })
              }
            >
              <option value="outdoor">{isEs ? "Exterior" : "Outdoor"}</option>
              <option value="indoor">{isEs ? "Interior" : "Indoor"}</option>
              <option value="cabinet">{isEs ? "Caseta" : "Cabinet"}</option>
              <option value="integrated_container">
                {isEs ? "Contenedor integrado" : "Integrated container"}
              </option>
            </select>
          </Field>
        </div>

        <Field label={copy.designLevel}>
          <select
            className={selectClass}
            value={context.designLevel}
            onChange={(event) =>
              updateContext({ designLevel: event.target.value as DesignLevel })
            }
          >
            <option value="predesign">
              {isEs ? "Prediseño conservador" : "Conservative predesign"}
            </option>
            <option value="basic_engineering">
              {isEs ? "Ingeniería básica" : "Basic engineering"}
            </option>
            <option value="detailed_engineering">
              {isEs ? "Ingeniería de detalle" : "Detailed engineering"}
            </option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={copy.suppression}>
            <select
              className={selectClass}
              value={context.fireSuppression}
              onChange={(event) =>
                updateContext({
                  fireSuppression: event.target.value as FireSuppressionType,
                })
              }
            >
              <option value="undefined">{isEs ? "No definido" : "Undefined"}</option>
              <option value="water_mist">{isEs ? "Agua nebulizada" : "Water mist"}</option>
              <option value="clean_agent">{isEs ? "Agente limpio" : "Clean agent"}</option>
              <option value="aerosol">Aerosol</option>
              <option value="inert_gas">{isEs ? "Gas inerte" : "Inert gas"}</option>
              <option value="other">{isEs ? "Otro" : "Other"}</option>
            </select>
          </Field>

          <Field label={copy.ventilation}>
            <select
              className={selectClass}
              value={context.ventilation}
              onChange={(event) =>
                updateContext({
                  ventilation: event.target.value as VentilationType,
                })
              }
            >
              <option value="undefined">{isEs ? "No definido" : "Undefined"}</option>
              <option value="natural">{isEs ? "Natural" : "Natural"}</option>
              <option value="forced">{isEs ? "Forzada" : "Forced"}</option>
              <option value="hvac">HVAC</option>
              <option value="liquid_cooling">
                {isEs ? "Refrigeración líquida" : "Liquid cooling"}
              </option>
            </select>
          </Field>
        </div>

        <Field label={copy.barrier}>
          <select
            className={selectClass}
            value={context.fireBarrier}
            onChange={(event) =>
              updateContext({ fireBarrier: event.target.value as FireBarrierType })
            }
          >
            <option value="none">{isEs ? "Ninguna" : "None"}</option>
            <option value="rf60">RF60</option>
            <option value="rf120">RF120</option>
            <option value="two_hour">{isEs ? "2 horas" : "2 hours"}</option>
            <option value="custom">{isEs ? "Personalizada" : "Custom"}</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-300">
          {[
            ["hasUl9540a", "UL 9540A"],
            ["hasHma", "HMA"],
            ["hasLsft", "LSFT"],
            ["hasAhjApproval", isEs ? "Aprobación AHJ" : "AHJ approval"],
            ["hasManufacturerManual", isEs ? "Manual fabricante" : "Manufacturer manual"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={Boolean(context[key as keyof typeof context])}
                onChange={(event) =>
                  updateContext({ [key]: event.target.checked })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}
