import type { LayoutWarning, WarningSeverity } from "@/lib/layout/spacingRules";
import type { SourceReliability } from "@/data/equipmentCatalog";
import type { InteractionMode } from "@/store/projectStore";

export type Locale = "en" | "es";

type Copy = typeof COPY.en;

export function copyFor(locale: Locale): Copy {
  return COPY[locale];
}

export function modeLabel(mode: InteractionMode, locale: Locale): string {
  return copyFor(locale).modes[mode];
}

export function severityLabel(
  severity: WarningSeverity,
  locale: Locale
): string {
  return copyFor(locale).severity[severity];
}

export function reliabilityLabel(
  reliability: SourceReliability,
  locale: Locale
): string {
  return copyFor(locale).reliability[reliability];
}

export function scenarioStatusLabel(status: string, locale: Locale): string {
  return copyFor(locale).status[status] ?? status;
}

export function constraintCopy(id: string, locale: Locale) {
  return (
    copyFor(locale).constraints[id] ?? {
      label: id,
      notes: "",
    }
  );
}

export function warningMessage(warning: LayoutWarning, locale: Locale): string {
  const copy = copyFor(locale).warnings;
  if (warning.id === "preliminary-assumptions-in-use") {
    return copy.preliminaryAssumptions;
  }
  if (warning.id.startsWith("outside-polygon-")) {
    const id = warning.id.replace("outside-polygon-", "").slice(0, 6);
    return copy.outsidePolygon(id);
  }
  if (warning.id.startsWith("collision-")) {
    const ids = warning.id.replace("collision-", "").split("-");
    return copy.collision(ids[0]?.slice(0, 6) ?? "", ids[1]?.slice(0, 6) ?? "");
  }
  if (warning.id === "spacing-not-validated") {
    return copy.spacingNotValidated;
  }
  return warning.message;
}

const SHARED = {
  appName: "BESS Layout Designer",
  units: {
    ha: "ha",
    m2: "m²",
    mva: "MVA",
    mwh: "MWh",
  },
};

export const COPY = {
  en: {
    ...SHARED,
    topbar: {
      subtitle: "Preliminary engineering tool",
      export: "Export",
      exportTitle: "Export conceptual layout as JSON",
      demo: "Demo",
      demoTitle: "Load a deterministic demo BESS layout",
      reset: "Reset",
      resetTitle: "Reset current scenario",
      settings: "Settings",
      settingsTitle: "Advanced settings will be added in a later iteration",
      mode: "Mode",
      selected: "Selected",
      language: "Language",
      rotateCw: "Rotate +15°",
      rotateCwTitle: "Rotate selected equipment clockwise",
      rotateCcw: "Rotate −15°",
      rotateCcwTitle: "Rotate selected equipment counter-clockwise",
      delete: "Delete",
      deleteTitle: "Delete selected equipment",
      undoTitle: "Undo (Cmd/Ctrl+Z)",
      redoTitle: "Redo (Cmd/Ctrl+Shift+Z)",
    },
    status: {
      "Needs review": "Needs review",
      "Layout calculated": "Layout calculated",
      "Terrain ready": "Terrain ready",
      "Setup required": "Setup required",
    } as Record<string, string>,
    modes: {
      select: "select",
      "draw-site": "draw site",
      "place-equipment": "place equipment",
      "draw-repair-zone": "draw repair zone",
      "edit-layout": "edit layout",
    },
    steps: [
      { label: "Terrain", detail: "Draw or load site" },
      { label: "BESS", detail: "Select equipment" },
      { label: "Layout", detail: "Place assets" },
      { label: "Results", detail: "Review constraints" },
    ],
    terrain: {
      title: "Terrain",
      description:
        "Define the working polygon before evaluating equipment density.",
      status: "Status",
      polygonReady: "Polygon ready",
      noTerrain: "No terrain",
      vertices: "Vertices",
      area: "Area",
      coordinateRef: "Coordinate ref.",
      localEnu: "Local ENU",
      empty: "Draw a terrain or load the demo scenario to start.",
    },
    equipment: {
      title: "BESS equipment",
      description: "Select an asset type, then click the map to place instances.",
      batteryContainer: "Battery container",
      pcs: "PCS",
      certifiedData: "Certified data",
      mvStation: "PCS/MV station",
      integratedTransformerNote: "Integrated BT/MT transformer inside enclosure. No separate transformer unit per PCS.",
      bessRatio4h: "~8 containers/PCS · ≈4h",
      bessRatio2h: "~4 containers/PCS · ≈2h",
    },
    mvArchitecture: {
      conceptualNoteTitle: "Conceptual electrical architecture",
      pcsIntegratedTitle: "PCS/MV station (SC5000UD-MV family)",
      pcsIntegratedBody: "Integrates power conversion and BT/MT transformer in the same enclosure. No separate transformer per PCS unit.",
      bessRatioTitle: "BESS / PCS ratio (ST2752UX)",
      bessRatioBody: "~4 containers/PCS ≈ 2h config · ~8 containers/PCS ≈ 4h config. 320 BESS + 40 PCS aligns with ≈4h architecture.",
      sectioningCenterTitle: "Sectioning Center 33/34.5 kV",
      sectioningCenterBody: "Conceptual MV collection zone / switchgear area. Position is preliminary and depends on detailed electrical design.",
      poiTitle: "POI / PCC 33/34.5 kV",
      poiBody: "Conceptual connection point. Does not represent a complete HV/AT substation. HV interconnection infrastructure is outside this tool's scope.",
      mvCorridorsTitle: "MV corridors (orange lines)",
      mvCorridorsBody: "Conceptual MV collection corridors. Not calculated cabling or definitive conduit routing. Preliminary sizing only.",
    },
    spacing: {
      title: "Spacing assumptions",
      description: "Editable placeholders for conceptual screening only.",
    },
    advanced: {
      title: "Advanced checks",
      description: "Reserved for studies that need validated project data.",
      checks: [
        "Slope and geotechnical constraints not evaluated.",
        "Access road geometry not evaluated.",
        "Fire engineering and AHJ spacing must be validated.",
      ],
    },
    map: {
      drawTitle: "Draw terrain polygon",
      redrawTitle: "Redraw terrain polygon",
      finishTitle: "Finish terrain polygon",
      clearTitle: "Clear terrain polygon",
      centerTitle: "Center map on scenario",
      layerTitle: "Switch map layer",
      stopPlacementTitle: "Stop placing equipment",
      context: "Map context",
      layer: "Layer",
      technical: "technical",
      street: "street",
      baseMapStyles: {
        standard: "Standard",
        satellite: "Satellite",
        hybrid: "Hybrid",
      },
      mapTilerKeyRequired:
        "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_MAPTILER_API_KEY to enable this layer.",
      coordinateSearchPlaceholder: "-33.4569, -70.6483",
      coordinateSearchTitle: "Search coordinates",
      invalidCoordinates: "Enter valid coordinates as latitude, longitude.",
      area: "Area",
      coordinates: "Coordinates",
      mode: "Mode",
      emptyTitle: "Define a project terrain",
      emptyDescription:
        "Draw a site polygon or load the demo scenario. Metrics and constraint checks will update as the layout changes.",
      drawTerrain: "Draw terrain",
      unavailableTitle: "Map unavailable",
      webglUnavailable:
        "WebGL is unavailable in this browser session. The layout data and summary still work, but the map needs WebGL to render.",
    },
    results: {
      title: "Results",
      description:
        "Conceptual metrics update immediately from the current layout.",
      availableArea: "Available area",
      apparentPower: "Apparent power",
      energyDcBol: "Energy DC BOL",
      constraintState: "Constraint state",
      errors: "errors",
      ok: "OK",
      batteryContainers: "Battery containers",
      pcsStations: "PCS / MV stations",
      grossDuration: "Gross duration",
      occupiedArea: "Occupied area",
      occupationRatio: "Occupation ratio",
      energyDensity: "Energy density",
      powerDensity: "Power density",
      scenarioSummary: "Scenario summary",
      terrainDefined: "Terrain defined",
      terrainMissing: "Terrain missing",
      layoutCalculated: "Layout calculated",
      noLayout: "No layout",
      reviewRequired: "Review required",
      noBlockingErrors: "No blocking errors",
      note:
        "DC BOL energy is the manufacturer's beginning-of-life DC capacity. AC usable / contractual energy depends on efficiency, SoC limits and degradation and is not shown here.",
    },
    alerts: {
      title: "Constraint alerts",
      description: "Preliminary validation against geometry and assumptions.",
      noErrors: "No errors",
      noActive: "No active alerts for this scenario.",
    },
    severity: {
      info: "info",
      warn: "warn",
      error: "error",
    },
    reliability: {
      certified_data: "certified data",
      reported_project_data: "reported project data",
      calculated: "calculated",
      inferred_not_certified: "inferred, not certified",
      preliminary_assumption: "preliminary assumption",
      pending_validation: "pending validation",
      engineering_judgement: "engineering judgement",
      reference_only: "reference only",
    },
    constraints: {
      battery_container_spacing: {
        label: "Battery container spacing",
        notes:
          "Editable preliminary assumption for conceptual utility-scale layout. Validate with manufacturer installation manual, UL 9540A, NFPA 855, insurer and local AHJ.",
      },
      pcs_spacing: {
        label: "PCS spacing",
        notes:
          "Editable preliminary assumption. Validate with manufacturer requirements, thermal clearance, maintenance access and electrical safety.",
      },
      access_road_width: {
        label: "Internal access road width",
        notes:
          "Editable conceptual value for circulation. Validate with civil design, emergency access and construction logistics.",
      },
      service_corridor_width: {
        label: "Service corridor width",
        notes: "Editable conceptual value for maintenance access.",
      },
      cable_trench_width: {
        label: "Cable trench width",
        notes:
          "Editable conceptual value. Final dimensions depend on cable sizing, ampacity, thermal backfill, segregation and voltage level.",
      },
      fence_setback: {
        label: "Fence setback",
        notes:
          "Editable conceptual value. Final setback depends on security, access, drainage, fire protection and permitting.",
      },
    } as Record<string, { label: string; notes: string }>,
    warnings: {
      preliminaryAssumptions:
        "Layout uses preliminary editable assumptions for spacing, aisles and setbacks. Validate with manufacturer manuals, UL 9540A, NFPA 855, AHJ, fire engineer and insurer before committing to design.",
      outsidePolygon: (id: string) =>
        `Equipment ${id} is outside the site polygon.`,
      collision: (a: string, b: string) =>
        `Collision detected between equipment ${a} and ${b}.`,
      spacingNotValidated:
        "Default container spacing of 3 m is an editable preliminary assumption and not a normative requirement. Validate with manufacturer installation manual, UL 9540A, NFPA 855, fire protection engineer, insurer and local AHJ.",
    },
  },
  es: {
    ...SHARED,
    topbar: {
      subtitle: "Herramienta preliminar de ingeniería",
      export: "Exportar",
      exportTitle: "Exportar layout conceptual como JSON",
      demo: "Demo",
      demoTitle: "Cargar un layout BESS demo determinístico",
      reset: "Reiniciar",
      resetTitle: "Reiniciar escenario actual",
      settings: "Ajustes",
      settingsTitle: "Los ajustes avanzados se agregarán en otra iteración",
      mode: "Modo",
      selected: "Seleccionado",
      language: "Idioma",
      rotateCw: "Rotar +15°",
      rotateCwTitle: "Rotar equipo seleccionado en sentido horario",
      rotateCcw: "Rotar −15°",
      rotateCcwTitle: "Rotar equipo seleccionado en sentido antihorario",
      delete: "Eliminar",
      deleteTitle: "Eliminar equipo seleccionado",
      undoTitle: "Deshacer (Cmd/Ctrl+Z)",
      redoTitle: "Rehacer (Cmd/Ctrl+Shift+Z)",
    },
    status: {
      "Needs review": "Requiere revisión",
      "Layout calculated": "Layout calculado",
      "Terrain ready": "Terreno listo",
      "Setup required": "Configuración requerida",
    } as Record<string, string>,
    modes: {
      select: "selección",
      "draw-site": "dibujar terreno",
      "place-equipment": "ubicar equipo",
      "draw-repair-zone": "dibujar zona de reparación",
      "edit-layout": "editar layout",
    },
    steps: [
      { label: "Terreno", detail: "Dibujar o cargar sitio" },
      { label: "BESS", detail: "Seleccionar equipos" },
      { label: "Layout", detail: "Ubicar activos" },
      { label: "Resultados", detail: "Revisar restricciones" },
    ],
    terrain: {
      title: "Terreno",
      description:
        "Define el polígono de trabajo antes de evaluar densidad de equipos.",
      status: "Estado",
      polygonReady: "Polígono listo",
      noTerrain: "Sin terreno",
      vertices: "Vértices",
      area: "Área",
      coordinateRef: "Ref. coordenadas",
      localEnu: "ENU local",
      empty: "Dibuja el terreno o carga el demo para comenzar.",
    },
    equipment: {
      title: "Equipos BESS",
      description: "Selecciona un tipo de activo y luego haz clic en el mapa.",
      batteryContainer: "Contenedor batería",
      pcs: "PCS",
      certifiedData: "Datos certificados",
      mvStation: "Estación PCS/MV",
      integratedTransformerNote: "Transformador BT/MT integrado en el mismo enclosure. No requiere transformador separado por PCS.",
      bessRatio4h: "~8 contenedores/PCS · ≈4h",
      bessRatio2h: "~4 contenedores/PCS · ≈2h",
    },
    mvArchitecture: {
      conceptualNoteTitle: "Arquitectura eléctrica conceptual",
      pcsIntegratedTitle: "Estación PCS/MV (familia SC5000UD-MV)",
      pcsIntegratedBody: "Integra conversión de potencia y transformador BT/MT en el mismo enclosure. No requiere transformador separado por unidad PCS.",
      bessRatioTitle: "Relación BESS / PCS (ST2752UX)",
      bessRatioBody: "~4 contenedores/PCS ≈ config 2h · ~8 contenedores/PCS ≈ config 4h. 320 BESS + 40 PCS corresponde a arquitectura ≈4h.",
      sectioningCenterTitle: "Sectioning Center 33/34,5 kV",
      sectioningCenterBody: "Zona conceptual de colección MT / switchgear. Su posición es preliminar y depende del diseño eléctrico detallado.",
      poiTitle: "POI / PCC 33/34,5 kV",
      poiBody: "Punto conceptual de conexión. No representa una subestación AT completa. La infraestructura de interconexión AT queda fuera del alcance de esta herramienta.",
      mvCorridorsTitle: "Corredores MT (líneas naranjas)",
      mvCorridorsBody: "Corredores conceptuales de colección MT. No son cableado calculado ni canalización definitiva. Solo predimensionamiento conceptual.",
    },
    spacing: {
      title: "Supuestos de separación",
      description: "Valores editables para screening conceptual.",
    },
    advanced: {
      title: "Checks avanzados",
      description: "Reservado para estudios con datos validados del proyecto.",
      checks: [
        "Pendiente y restricciones geotécnicas no evaluadas.",
        "Geometría de caminos de acceso no evaluada.",
        "Separaciones de incendio y AHJ deben validarse.",
      ],
    },
    map: {
      drawTitle: "Dibujar polígono de terreno",
      redrawTitle: "Redibujar polígono de terreno",
      finishTitle: "Finalizar polígono de terreno",
      clearTitle: "Borrar polígono de terreno",
      centerTitle: "Centrar mapa en el escenario",
      layerTitle: "Cambiar capa del mapa",
      stopPlacementTitle: "Detener ubicación de equipos",
      context: "Contexto del mapa",
      layer: "Capa",
      technical: "técnica",
      street: "calles",
      baseMapStyles: {
        standard: "Estándar",
        satellite: "Satélite",
        hybrid: "Híbrido",
      },
      mapTilerKeyRequired:
        "Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY o NEXT_PUBLIC_MAPTILER_API_KEY para habilitar esta capa.",
      coordinateSearchPlaceholder: "-33.4569, -70.6483",
      coordinateSearchTitle: "Buscar coordenadas",
      invalidCoordinates: "Ingresa coordenadas válidas como latitud, longitud.",
      area: "Área",
      coordinates: "Coordenadas",
      mode: "Modo",
      emptyTitle: "Define un terreno de proyecto",
      emptyDescription:
        "Dibuja un polígono de sitio o carga el escenario demo. Las métricas y restricciones se actualizarán al modificar el layout.",
      drawTerrain: "Dibujar terreno",
      unavailableTitle: "Mapa no disponible",
      webglUnavailable:
        "WebGL no está disponible en esta sesión del navegador. Los datos y métricas siguen funcionando, pero el mapa necesita WebGL para renderizar.",
    },
    results: {
      title: "Resultados",
      description:
        "Las métricas conceptuales se actualizan inmediatamente con el layout actual.",
      availableArea: "Área disponible",
      apparentPower: "Potencia aparente",
      energyDcBol: "Energía DC BOL",
      constraintState: "Estado restricciones",
      errors: "errores",
      ok: "OK",
      batteryContainers: "Contenedores batería",
      pcsStations: "PCS / estaciones MV",
      grossDuration: "Duración bruta",
      occupiedArea: "Área ocupada",
      occupationRatio: "Ocupación",
      energyDensity: "Densidad energía",
      powerDensity: "Densidad potencia",
      scenarioSummary: "Resumen del escenario",
      terrainDefined: "Terreno definido",
      terrainMissing: "Terreno faltante",
      layoutCalculated: "Layout calculado",
      noLayout: "Sin layout",
      reviewRequired: "Requiere revisión",
      noBlockingErrors: "Sin errores bloqueantes",
      note:
        "La energía DC BOL corresponde a la capacidad DC inicial del fabricante. La energía AC usable o contractual depende de eficiencia, límites de SoC y degradación, y no se muestra aquí.",
    },
    alerts: {
      title: "Alertas de restricciones",
      description:
        "Validación preliminar contra geometría y supuestos del layout.",
      noErrors: "Sin errores",
      noActive: "No hay alertas activas para este escenario.",
    },
    severity: {
      info: "info",
      warn: "aviso",
      error: "error",
    },
    reliability: {
      certified_data: "datos certificados",
      reported_project_data: "dato reportado del proyecto",
      calculated: "calculado",
      inferred_not_certified: "inferido no certificado",
      preliminary_assumption: "supuesto preliminar",
      pending_validation: "validación pendiente",
      engineering_judgement: "criterio de ingeniería",
      reference_only: "solo referencia",
    },
    constraints: {
      battery_container_spacing: {
        label: "Separación entre contenedores",
        notes:
          "Supuesto editable para layout utility-scale conceptual. Validar con manual del fabricante, UL 9540A, NFPA 855, aseguradora y AHJ local.",
      },
      pcs_spacing: {
        label: "Separación PCS",
        notes:
          "Supuesto editable. Validar con requerimientos del fabricante, holgura térmica, mantenimiento y seguridad eléctrica.",
      },
      access_road_width: {
        label: "Ancho camino interno",
        notes:
          "Valor conceptual para circulación. Validar con diseño civil, acceso de emergencia y logística de construcción.",
      },
      service_corridor_width: {
        label: "Ancho corredor de servicio",
        notes: "Valor conceptual editable para acceso de mantenimiento.",
      },
      cable_trench_width: {
        label: "Ancho canalización",
        notes:
          "Valor conceptual. Dimensiones finales dependen de cables, ampacidad, relleno térmico, segregación y nivel de tensión.",
      },
      fence_setback: {
        label: "Retiro desde cerco",
        notes:
          "Valor conceptual. El retiro final depende de seguridad, acceso, drenaje, protección contra incendio y permisos.",
      },
    } as Record<string, { label: string; notes: string }>,
    warnings: {
      preliminaryAssumptions:
        "El layout usa supuestos preliminares editables para separaciones, pasillos y retiros. Validar con manuales del fabricante, UL 9540A, NFPA 855, AHJ, ingeniería de incendio y aseguradora antes de comprometer diseño.",
      outsidePolygon: (id: string) =>
        `El equipo ${id} está fuera del polígono del sitio.`,
      collision: (a: string, b: string) =>
        `Se detectó colisión entre los equipos ${a} y ${b}.`,
      spacingNotValidated:
        "La separación por defecto de 3 m entre contenedores es un supuesto preliminar editable y no un requisito normativo. Validar con manual de instalación, UL 9540A, NFPA 855, ingeniería de incendio, aseguradora y AHJ local.",
    },
  },
};
