"use client";

import { useState } from "react";
import { 
  Zap, 
  Layers, 
  Activity, 
  Cpu, 
  Settings, 
  Database,
  Shield,
  Gauge
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { Badge } from "@/components/ui/Badge";
import type { EvidencedValue } from "@/types/evidence";

type SelectedStage = "bess" | "pcs" | "transformer" | "feeders" | "busbar" | "poi";

export function SingleLineDiagram() {
  const blocks = useProjectStore((s) => s.blocks);
  const conversionStations = useProjectStore((s) => s.conversionStations);
  const mvFeeders = useProjectStore((s) => s.mvFeeders);
  const mvBuses = useProjectStore((s) => s.mvBuses);
  const poi = useProjectStore((s) => s.poi);
  const mainTransformer = useProjectStore((s) => s.mainTransformer);
  const placedEquipment = useProjectStore((s) => s.placedEquipment);
  const loadPreset = useProjectStore((s) => s.loadBessDelDesiertoPresetV12);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const [selectedStage, setSelectedStage] = useState<SelectedStage>("bess");

  // Determine active counts based on preset slices or placed equipment
  const containerCount = blocks.length > 0 
    ? blocks.reduce((acc, b) => acc + (b.containerIds?.length || 0), 0)
    : placedEquipment.filter((e) => {
        const spec = equipmentCatalog.find((s) => s.id === e.equipmentSpecId);
        return spec?.type === "battery_container";
      }).length;

  const stationCount = conversionStations.length > 0
    ? conversionStations.length
    : placedEquipment.filter((e) => {
        const spec = equipmentCatalog.find((s) => s.id === e.equipmentSpecId);
        return spec?.type === "pcs_mv_station";
      }).length;

  const isPresetLoaded = blocks.length > 0;
  const hasEquipment = containerCount > 0 || stationCount > 0;

  // Find sample specifications from placed equipment or catalogs
  const placedContainers = placedEquipment.filter((e) => {
    const spec = equipmentCatalog.find((s) => s.id === e.equipmentSpecId);
    return spec?.type === "battery_container";
  });
  const firstContainerSpec = placedContainers[0] 
    ? equipmentCatalog.find((s) => s.id === placedContainers[0].equipmentSpecId)
    : equipmentCatalog.find((s) => s.type === "battery_container");

  const placedStations = placedEquipment.filter((e) => {
    const spec = equipmentCatalog.find((s) => s.id === e.equipmentSpecId);
    return spec?.type === "pcs_mv_station";
  });
  const firstStationSpec = placedStations[0]
    ? equipmentCatalog.find((s) => s.id === placedStations[0].equipmentSpecId)
    : equipmentCatalog.find((s) => s.type === "pcs_mv_station");

  // Dynamic values or presets
  const activeBessSpec = isPresetLoaded && conversionStations[0]
    ? {
        manufacturer: "Sungrow",
        model: "ST2752UX",
        energyMWh: 2.752512,
        chemistry: "LFP",
        racks: 8,
      }
    : {
        manufacturer: firstContainerSpec?.manufacturer || "Generic BESS",
        model: firstContainerSpec?.model || "Conceptual model",
        energyMWh: firstContainerSpec?.electrical?.energy_mwh_dc_bol || 3.06,
        chemistry: firstContainerSpec?.batteryHierarchy?.cellChemistry || "LFP",
        racks: firstContainerSpec?.batteryHierarchy?.racksPerContainer || 8,
      };

  const activePcsSpec = isPresetLoaded && conversionStations[0]
    ? {
        manufacturer: conversionStations[0].manufacturer,
        model: conversionStations[0].model,
        powerMva: conversionStations[0].ratedPowerMVA,
        modulesCount: conversionStations[0].pcsModules.length,
        modulePowerMva: conversionStations[0].pcsModules[0]?.apparentPowerMVA || 2.5,
        acVoltageV: conversionStations[0].pcsModules[0]?.nominalAcVoltageV || 900,
      }
    : {
        manufacturer: firstStationSpec?.manufacturer || "Generic PCS",
        model: firstStationSpec?.model || "Conceptual Station",
        powerMva: { value: firstStationSpec?.electrical?.apparent_power_mva || 5.0, evidence: [] },
        modulesCount: 2,
        modulePowerMva: (firstStationSpec?.electrical?.apparent_power_mva || 5.0) / 2,
        acVoltageV: 900,
      };

  const activeTransformerSpec = isPresetLoaded && conversionStations[0]?.blockTransformer
    ? conversionStations[0].blockTransformer
    : {
        ratedPowerMVA: { value: activePcsSpec.powerMva.value, evidence: [] },
        hvVoltageKv: { value: 33.0, evidence: [] },
        lvVoltageKv: { value: 0.9, evidence: [] },
        vectorGroup: "Dy11",
        cooling: "ONAN",
      };

  const feederCount = mvFeeders.length > 0
    ? mvFeeders.length
    : Math.max(1, Math.ceil(stationCount / 4));

  const activeFeederSpec = isPresetLoaded && mvFeeders[0]
    ? mvFeeders[0]
    : {
        nominalVoltageKv: 33.0,
        ratedPowerMVA: 20.0,
      };

  const activeBusesSpec = isPresetLoaded && mvBuses.length > 0
    ? mvBuses
    : [
        {
          name: "BP5 / BP6",
          nominalVoltageKv: 33.0,
          switchgear: {
            manufacturer: "Siemens (ref)",
            model: "8DA GIS",
            hasBusCoupler: true,
          },
        },
      ];

  const activePoiSpec = isPresetLoaded && poi
    ? poi
    : {
        busName: "BP5/BP6 33 kV",
        voltageKv: 33.0,
        boundary: "mv_33kv" as const,
      };

  const activeMainTxSpec = isPresetLoaded && mainTransformer
    ? mainTransformer
    : {
        manufacturer: "Conceptual",
        model: "Power Transformer",
        ratedPowerMVA: { value: 250, evidence: [] },
        windings: { hvKv: 220, mv1Kv: 33, mv2Kv: 33 },
      };

  // Helper for evidence tags
  const renderEvidence = (val: EvidencedValue<unknown> | undefined | null) => {
    if (!val || !val.evidence || val.evidence.length === 0) {
      return <Badge variant="preliminary">{isEs ? "PRELIMINAR" : "PRELIMINARY"}</Badge>;
    }
    const mainEvidence = val.evidence[0];
    if (mainEvidence.confidence === "documented") {
      return <Badge variant="certified">{isEs ? "CERTIFICADO" : "CERTIFIED"}</Badge>;
    } else if (mainEvidence.confidence === "missing") {
      return <Badge variant="pending">{isEs ? "PENDIENTE" : "PENDING"}</Badge>;
    }
    return <Badge variant="neutral">{isEs ? "DERIVADO" : "DERIVED"}</Badge>;
  };

  // Stage content translations
  const getStageDetails = () => {
    switch (selectedStage) {
      case "bess":
        return {
          title: isEs ? "Banco de Baterías BESS" : "BESS Battery Bank",
          color: "border-amber-500/30 bg-amber-500/5",
          items: [
            {
              icon: Layers,
              label: isEs ? "Contenedores totales" : "Total containers",
              value: `${containerCount} x BESS`,
              badge: null,
            },
            {
              icon: Zap,
              label: isEs ? "Energía total conceptual" : "Total conceptual energy",
              value: `${(containerCount * (activeBessSpec.energyMWh as number)).toFixed(1)} MWh`,
              badge: isPresetLoaded ? renderEvidence({ value: containerCount * 2.752512, evidence: [{ documentId: "derived", confidence: "derived" }] }) : null,
            },
            {
              icon: Database,
              label: isEs ? "Modelo de contenedor" : "Container model",
              value: `${activeBessSpec.manufacturer} ${activeBessSpec.model}`,
              badge: isPresetLoaded ? <Badge variant="certified">DOC</Badge> : null,
            },
            {
              icon: Cpu,
              label: isEs ? "Química & Estructura" : "Chemistry & Structure",
              value: `${activeBessSpec.chemistry} · ${activeBessSpec.racks} Racks`,
              badge: null,
            },
          ],
        };
      case "pcs":
        return {
          title: isEs ? "Sistema de Conversión (PCS)" : "Power Conversion System",
          color: "border-cyan-500/30 bg-cyan-500/5",
          items: [
            {
              icon: Layers,
              label: isEs ? "Estaciones totales" : "Total stations",
              value: `${stationCount} PCS`,
              badge: null,
            },
            {
              icon: Zap,
              label: isEs ? "Potencia nominal estación" : "Station rated power",
              value: `${activePcsSpec.powerMva.value} MVA`,
              badge: renderEvidence(activePcsSpec.powerMva),
            },
            {
              icon: Database,
              label: isEs ? "Fabricante / Modelo" : "Manufacturer / Model",
              value: `${activePcsSpec.manufacturer} ${activePcsSpec.model}`,
              badge: isPresetLoaded ? <Badge variant="certified">DOC</Badge> : null,
            },
            {
              icon: Cpu,
              label: isEs ? "Módulos internos" : "Internal modules",
              value: `${activePcsSpec.modulesCount} x ${activePcsSpec.modulePowerMva.toFixed(1)} MVA @ ${activePcsSpec.acVoltageV} V`,
              badge: null,
            },
          ],
        };
      case "transformer":
        return {
          title: isEs ? "Transformador de Bloque" : "Block Transformer",
          color: "border-violet-500/30 bg-violet-500/5",
          items: [
            {
              icon: Layers,
              label: isEs ? "Cantidad total" : "Total quantity",
              value: `${stationCount} Tx`,
              badge: null,
            },
            {
              icon: Zap,
              label: isEs ? "Potencia de diseño" : "Design rating",
              value: `${activeTransformerSpec.ratedPowerMVA.value} MVA`,
              badge: renderEvidence(activeTransformerSpec.ratedPowerMVA),
            },
            {
              icon: Gauge,
              label: isEs ? "Relación de tensión" : "Voltage ratio",
              value: `${activeTransformerSpec.lvVoltageKv.value} kV / ${activeTransformerSpec.hvVoltageKv.value} kV`,
              badge: renderEvidence(activeTransformerSpec.lvVoltageKv),
            },
            {
              icon: Settings,
              label: isEs ? "Grupo de vector & Refrig." : "Vector group & Cooling",
              value: `${activeTransformerSpec.vectorGroup} · ${activeTransformerSpec.cooling}`,
              badge: null,
            },
          ],
        };
      case "feeders":
        return {
          title: isEs ? "Alimentadores de MT" : "MV Collector Feeders",
          color: "border-emerald-500/30 bg-emerald-500/5",
          items: [
            {
              icon: Layers,
              label: isEs ? "Circuitos de colección" : "Collector circuits",
              value: `${feederCount} x MT Feeders`,
              badge: null,
            },
            {
              icon: Gauge,
              label: isEs ? "Tensión nominal" : "Nominal voltage",
              value: `${activeFeederSpec.nominalVoltageKv} kV`,
              badge: isPresetLoaded ? <Badge variant="certified">DOC</Badge> : null,
            },
            {
              icon: Zap,
              label: isEs ? "Potencia por alimentador" : "Power per feeder",
              value: `${activeFeederSpec.ratedPowerMVA} MVA`,
              badge: isPresetLoaded ? <Badge variant="neutral">INFERRED</Badge> : null,
            },
            {
              icon: Activity,
              label: isEs ? "Carga por circuito" : "Circuit loading",
              value: `${Math.round(stationCount / feederCount)} PCS / ${isEs ? "circuito" : "circuit"}`,
              badge: null,
            },
          ],
        };
      case "busbar":
        return {
          title: isEs ? "Celdas y Barra MT" : "MV Switchgear & Busbar",
          color: "border-blue-500/30 bg-blue-500/5",
          items: [
            {
              icon: Layers,
              label: isEs ? "Secciones de barra" : "Busbar sections",
              value: isPresetLoaded ? activeBusesSpec.map(b => b.name).join(" & ") : "BP5 / BP6",
              badge: null,
            },
            {
              icon: Gauge,
              label: isEs ? "Tensión de barra" : "Bus voltage",
              value: `${activeBusesSpec[0]?.nominalVoltageKv || 33} kV`,
              badge: isPresetLoaded ? <Badge variant="certified">DOC</Badge> : null,
            },
            {
              icon: Settings,
              label: isEs ? "Celdas (Switchgear)" : "Switchgear model",
              value: activeBusesSpec[0]?.switchgear?.model || "GIS Siemens 8DA",
              badge: isPresetLoaded ? <Badge variant="certified">DOC</Badge> : null,
            },
            {
              icon: Shield,
              label: isEs ? "Acoplador de barras" : "Bus tie coupler",
              value: activeBusesSpec[0]?.switchgear?.hasBusCoupler 
                ? (isEs ? "Sí (Celda de acoplamiento)" : "Yes (Coupler cell)")
                : (isEs ? "No" : "No"),
              badge: null,
            },
          ],
        };
      case "poi":
        return {
          title: isEs ? "Punto de Interconexión" : "Point of Interconnection",
          color: "border-pink-500/30 bg-pink-500/5",
          items: [
            {
              icon: Gauge,
              label: isEs ? "Nombre y Tensión POI" : "POI Bus & Voltage",
              value: `${activePoiSpec.busName} · ${activePoiSpec.voltageKv} kV`,
              badge: isPresetLoaded ? <Badge variant="certified">DOC</Badge> : null,
            },
            {
              icon: Zap,
              label: isEs ? "Transformador Principal" : "Main Transformer",
              value: `${activeMainTxSpec.ratedPowerMVA.value} MVA`,
              badge: renderEvidence(activeMainTxSpec.ratedPowerMVA),
            },
            {
              icon: Settings,
              label: isEs ? "Devanados Transf. Principal" : "Main Transformer Windings",
              value: `${activeMainTxSpec.windings.hvKv} kV / ${activeMainTxSpec.windings.mv1Kv} kV ${activeMainTxSpec.windings.mv2Kv ? ` / ${activeMainTxSpec.windings.mv2Kv} kV` : ""}`,
              badge: null,
            },
            {
              icon: Shield,
              label: isEs ? "Frontera de medición" : "Metering boundary",
              value: activePoiSpec.boundary === "mv_33kv" 
                ? (isEs ? "Media Tensión 33 kV" : "Medium Voltage 33 kV")
                : (isEs ? "Alta Tensión (Subestación)" : "High Voltage Substation"),
              badge: null,
            },
          ],
        };
    }
  };

  const details = getStageDetails();

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          {isEs ? "Diagrama Unifilar Eléctrico" : "Electrical Single-Line Diagram"}
        </h3>
        <span className="text-[9px] text-slate-500 font-mono">
          {isPresetLoaded ? "V1.2 Active" : "Conceptual"}
        </span>
      </div>

      {/* SVG Diagram Canvas */}
      <div className="relative flex justify-center rounded border border-slate-950 bg-slate-950/80 p-2">
        <svg
          viewBox="0 0 320 420"
          className="h-auto w-full max-w-[280px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for gradients, filters, markers */}
          <defs>
            <filter id="glow-violet" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.7" />
            </filter>
            <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.7" />
            </filter>
            <filter id="glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.7" />
            </filter>
            <filter id="glow-blue" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.7" />
            </filter>
            <filter id="glow-pink" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ec4899" floodOpacity="0.7" />
            </filter>
            
            {/* Arrow marker */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ec4899" />
            </marker>
          </defs>

          {/* BACKGROUND ACTIVE SECTION DASHED RECTANGLES */}
          {selectedStage === "bess" && (
            <rect x="75" y="10" width="170" height="75" rx="8" fill="rgba(245, 158, 11, 0.03)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" filter="url(#glow-amber)" className="transition-all duration-300" />
          )}
          {selectedStage === "pcs" && (
            <rect x="75" y="90" width="170" height="72" rx="8" fill="rgba(6, 182, 212, 0.03)" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3,3" filter="url(#glow-cyan)" className="transition-all duration-300" />
          )}
          {selectedStage === "transformer" && (
            <rect x="75" y="167" width="170" height="58" rx="8" fill="rgba(139, 92, 246, 0.03)" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3,3" filter="url(#glow-violet)" className="transition-all duration-300" />
          )}
          {selectedStage === "feeders" && (
            <rect x="75" y="230" width="170" height="30" rx="8" fill="rgba(16, 185, 129, 0.03)" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" filter="url(#glow-emerald)" className="transition-all duration-300" />
          )}
          {selectedStage === "busbar" && (
            <rect x="25" y="261" width="270" height="34" rx="8" fill="rgba(59, 130, 246, 0.03)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" filter="url(#glow-blue)" className="transition-all duration-300" />
          )}
          {selectedStage === "poi" && (
            <rect x="75" y="300" width="170" height="110" rx="8" fill="rgba(236, 72, 153, 0.03)" stroke="#ec4899" strokeWidth="1" strokeDasharray="3,3" filter="url(#glow-pink)" className="transition-all duration-300" />
          )}

          {/* POWER CHAIN PATH LINES */}
          {/* DC Battery connection: Orange/Amber dotted */}
          <line x1="160" y1="59" x2="160" y2="100" stroke={hasEquipment ? "#f59e0b" : "#475569"} strokeWidth="2.5" strokeDasharray="3.5,3.5" className="transition-colors" />
          
          {/* PCS connection: Cyan */}
          <line x1="160" y1="134" x2="160" y2="175" stroke={hasEquipment ? "#06b6d4" : "#475569"} strokeWidth="2" className="transition-colors" />
          
          {/* Block Tx connection: Violet */}
          <line x1="160" y1="220" x2="160" y2="250" stroke={hasEquipment ? "#8b5cf6" : "#475569"} strokeWidth="2" className="transition-colors" />
          {/* Multi feeder slash symbol */}
          {hasEquipment && (
            <>
              <line x1="156" y1="239" x2="164" y2="231" stroke="#10b981" strokeWidth="1.5" />
              <text x="168" y="238" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                x{feederCount}
              </text>
            </>
          )}

          {/* Feeder to Main Busbar connecting lines */}
          <line x1="160" y1="250" x2="160" y2="278" stroke={hasEquipment ? "#10b981" : "#475569"} strokeWidth="2" className="transition-colors" />
          
          {/* MV Busbar to Main Tx connection */}
          <line x1="160" y1="278" x2="160" y2="310" stroke={hasEquipment ? "#3b82f6" : "#475569"} strokeWidth="2" className="transition-colors" />
          
          {/* Main Tx connection to Grid terminal */}
          <line x1="160" y1="354" x2="160" y2="394" stroke={hasEquipment ? "#ec4899" : "#475569"} strokeWidth="2" className="transition-colors" />

          {/* COMPONENT VECTOR SYMBOLS */}
          
          {/* 1. BESS DC Bank node */}
          <g className="transition-transform hover:scale-105 origin-center cursor-pointer" onClick={() => setSelectedStage("bess")}>
            {/* Battery outer cap */}
            <rect x="156" y="21" width="8" height="4" rx="1" fill={selectedStage === "bess" ? "#f59e0b" : hasEquipment ? "#d97706" : "#475569"} />
            {/* Battery body */}
            <rect x="146" y="25" width="28" height="34" rx="4" fill="#020617" stroke={selectedStage === "bess" ? "#f59e0b" : hasEquipment ? "#f59e0b" : "#475569"} strokeWidth="2" />
            {/* Battery inner chemical stacks */}
            <line x1="151" y1="33" x2="169" y2="33" stroke={hasEquipment ? "#f59e0b" : "#475569"} strokeWidth="2" strokeLinecap="round" />
            <line x1="151" y1="41" x2="169" y2="41" stroke={hasEquipment ? "#f59e0b" : "#475569"} strokeWidth="2" strokeLinecap="round" />
            <line x1="151" y1="49" x2="169" y2="49" stroke={hasEquipment ? "#f59e0b" : "#475569"} strokeWidth="2" strokeLinecap="round" />
            {/* Text badge */}
            <text x="160" y="15" fill={hasEquipment ? "#e2e8f0" : "#64748b"} fontSize="8.5" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">
              {containerCount} BESS
            </text>
          </g>

          {/* 2. PCS Converter node */}
          <g className="transition-transform hover:scale-105 origin-center cursor-pointer" onClick={() => setSelectedStage("pcs")}>
            <rect x="143" y="100" width="34" height="34" rx="4" fill="#020617" stroke={selectedStage === "pcs" ? "#06b6d4" : hasEquipment ? "#06b6d4" : "#475569"} strokeWidth="2" />
            {/* Diagonal division */}
            <line x1="143" y1="134" x2="177" y2="100" stroke={hasEquipment ? "#06b6d4" : "#475569"} strokeWidth="1.5" />
            {/* DC Side = */}
            <text x="151" y="115" fill={hasEquipment ? "#06b6d4" : "#64748b"} fontSize="10" fontWeight="bold" fontFamily="sans-serif">=</text>
            {/* AC Side ~ */}
            <text x="162" y="128" fill={hasEquipment ? "#06b6d4" : "#64748b"} fontSize="12" fontWeight="bold" fontFamily="sans-serif">~</text>
            {/* Label text */}
            <text x="182" y="120" fill={hasEquipment ? "#e2e8f0" : "#64748b"} fontSize="8.5" textAnchor="start" fontFamily="sans-serif" fontWeight="bold">
              {stationCount} PCS
            </text>
          </g>

          {/* 3. Block Transformer node */}
          <g className="transition-transform hover:scale-105 origin-center cursor-pointer" onClick={() => setSelectedStage("transformer")}>
            {/* Overlapping circle 1 */}
            <circle cx="160" cy="189" r="13" fill="none" stroke={selectedStage === "transformer" ? "#8b5cf6" : hasEquipment ? "#8b5cf6" : "#475569"} strokeWidth="2" />
            {/* Overlapping circle 2 */}
            <circle cx="160" cy="204" r="13" fill="none" stroke={selectedStage === "transformer" ? "#8b5cf6" : hasEquipment ? "#8b5cf6" : "#475569"} strokeWidth="2" />
            {/* Vector group labels */}
            {hasEquipment && (
              <text x="180" y="200" fill="#cbd5e1" fontSize="7.5" fontFamily="monospace">
                {activeTransformerSpec.vectorGroup}
              </text>
            )}
          </g>

          {/* 4. Medium Voltage Feeders area trigger */}
          <rect x="110" y="222" width="100" height="28" fill="transparent" className="cursor-pointer" onClick={() => setSelectedStage("feeders")} />

          {/* 5. Medium Voltage Busbar line (BP5 / BP6) */}
          <g className="cursor-pointer" onClick={() => setSelectedStage("busbar")}>
            <line x1="30" y1="278" x2="290" y2="278" stroke={selectedStage === "busbar" ? "#3b82f6" : hasEquipment ? "#3b82f6" : "#475569"} strokeWidth="4.5" strokeLinecap="square" filter={selectedStage === "busbar" ? "url(#glow-blue)" : ""} />
            {/* Bus bar text labels */}
            <text x="35" y="271" fill={hasEquipment ? "#93c5fd" : "#64748b"} fontSize="8" fontFamily="monospace" fontWeight="bold">
              BP5 {activeFeederSpec.nominalVoltageKv}kV
            </text>
            <text x="285" y="271" fill={hasEquipment ? "#93c5fd" : "#64748b"} fontSize="8" textAnchor="end" fontFamily="monospace" fontWeight="bold">
              BP6 {activeFeederSpec.nominalVoltageKv}kV
            </text>
          </g>

          {/* 6. Main AT Transformer node */}
          <g className="transition-transform hover:scale-105 origin-center cursor-pointer" onClick={() => setSelectedStage("poi")}>
            {/* Overlapping circle 1 */}
            <circle cx="160" cy="322" r="13" fill="none" stroke={selectedStage === "poi" ? "#ec4899" : hasEquipment ? "#ec4899" : "#475569"} strokeWidth="2.5" />
            {/* Overlapping circle 2 */}
            <circle cx="160" cy="337" r="13" fill="none" stroke={selectedStage === "poi" ? "#ec4899" : hasEquipment ? "#ec4899" : "#475569"} strokeWidth="2.5" />
            {/* Connection text */}
            <text x="180" y="333" fill="#cbd5e1" fontSize="7.5" fontFamily="monospace">
              {activeMainTxSpec.ratedPowerMVA.value} MVA
            </text>
            <text x="180" y="342" fill="#94a3b8" fontSize="7" fontFamily="monospace">
              {activeMainTxSpec.windings.hvKv} / {activeMainTxSpec.windings.mv1Kv} kV
            </text>

            {/* Grid node / terminal */}
            <line x1="130" y1="394" x2="190" y2="394" stroke={hasEquipment ? "#ec4899" : "#475569"} strokeWidth="3" />
            {/* Arrow end */}
            <path d="M156,382 L160,392 L164,382 Z" fill={hasEquipment ? "#ec4899" : "#475569"} />
            <text x="160" y="407" fill={hasEquipment ? "#f472b6" : "#64748b"} fontSize="9.5" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">
              POI / GRID
            </text>
          </g>

          {/* DETAILED INTERACTIVE INVISIBLE TARGET BOXES FOR EASY CLICKING */}
          <rect x="80" y="15" width="160" height="70" fill="transparent" className="cursor-pointer" onClick={() => setSelectedStage("bess")} />
          <rect x="80" y="90" width="160" height="65" fill="transparent" className="cursor-pointer" onClick={() => setSelectedStage("pcs")} />
          <rect x="80" y="158" width="160" height="64" fill="transparent" className="cursor-pointer" onClick={() => setSelectedStage("transformer")} />
          <rect x="80" y="224" width="160" height="42" fill="transparent" className="cursor-pointer" onClick={() => setSelectedStage("feeders")} />
          <rect x="25" y="267" width="270" height="30" fill="transparent" className="cursor-pointer" onClick={() => setSelectedStage("busbar")} />
          <rect x="80" y="300" width="160" height="110" fill="transparent" className="cursor-pointer" onClick={() => setSelectedStage("poi")} />

          {/* EMPTY STATE WATERMARK OVERLAY */}
          {!hasEquipment && (
            <rect x="15" y="15" width="290" height="390" rx="10" fill="rgba(15, 23, 42, 0.85)" stroke="#1e293b" strokeWidth="1.5" />
          )}
        </svg>

        {/* Empty State overlay message and action button */}
        {!hasEquipment && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <Activity className="mb-2 h-8 w-8 text-slate-500 animate-pulse" />
            <p className="text-[11px] leading-snug text-slate-400 font-medium">
              {isEs 
                ? "Carga el preset 'BESS del Desierto' o inserta equipos en el mapa para activar el unifilar."
                : "Load the 'BESS del Desierto' preset or insert equipment on the map to activate the diagram."}
            </p>
            <button
              onClick={loadPreset}
              className="mt-3.5 rounded-md border border-violet-500 bg-violet-600/90 hover:bg-violet-600 px-3 py-1.5 text-[10px] font-medium tracking-wide text-white shadow-md active:scale-95 transition-all"
            >
              {isEs ? "Cargar Preset BESS del Desierto" : "Load BESS del Desierto Preset"}
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Detail Card Box based on selected SVG node */}
      {hasEquipment && details && (
        <div className={`mt-3 rounded-md border p-2.5 transition-all duration-300 ${details.color}`}>
          <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10.5px] font-semibold text-slate-200 uppercase tracking-wide">
              {details.title}
            </span>
            <span className="text-[9px] text-slate-500 italic">
              {isEs ? "Haz clic en el diagrama para explorar" : "Click diagram to explore"}
            </span>
          </div>

          <dl className="space-y-2 text-[10.5px]">
            {details.items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center justify-between gap-2 border-b border-slate-800/40 pb-1.5 last:border-b-0 last:pb-0">
                  <dt className="flex items-center gap-1.5 text-slate-400">
                    <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{item.label}</span>
                  </dt>
                  <dd className="flex items-center gap-1.5 font-mono text-slate-100">
                    <span>{item.value}</span>
                    {item.badge}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}
