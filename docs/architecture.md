# Arquitectura del Sistema - BESS Layout Designer

Este documento detalla la arquitectura de software implementada en el repositorio del predimensionador de sistemas de almacenamiento de energía en baterías (BESS) a gran escala. Su propósito es servir de guía técnica para desarrolladores, revisores y auditorías de código, garantizando la mantenibilidad y delimitación de responsabilidades en futuras expansiones del sistema.

---

## 1. Propósito del Documento (Purpose)

Este documento describe de manera fidedigna la estructura física y lógica de la aplicación. Detalla las relaciones entre la capa de interfaz de usuario (React/Next.js), el almacenamiento global de estado (Zustand), los motores computacionales puros (en `/src/lib/` y `/src/rules/`), los esquemas de datos estáticos y las especificaciones de reportabilidad y defensibilidad que rigen el sistema.

---

## 2. Visión General del Sistema

El BESS Layout Designer es una aplicación web SPA basada en Next.js App Router (React) estructurada para realizar actividades de predimensionamiento conceptual y análisis espacial inicial:
* **Entorno Geográfico y Terreno**: Permite la delimitación de un terreno a través de un polígono de referencia georreferenciado.
* **Catálogo de Equipos y Dimensionamiento**: Facilita la configuración y cálculo preliminar de la cantidad de contenedores y estaciones de conversión BESS/PCS necesarias para satisfacer metas de capacidad comercial.
* **Layout y Disposición Física**: Genera arreglos en mallas (grids) paramétricas y permite mover, rotar o regularizar físicamente los bloques de equipos sobre el terreno local.
* **Evaluación de Cumplimiento Normativo y Eléctrico**: Ejecuta de forma asíncrona chequeos de holgura física (setbacks) bajo perfiles regulatorios específicos y evalúa compatibilidades eléctricas básicas de topología MT.
* **Generación de Reporte Conceptual**: Consolida los resultados en un reporte técnico preliminar exportable a PDF para análisis internos o comerciales de prefactibilidad.

---

## 3. Capas Principales de la Arquitectura

La base de código está estrictamente dividida en capas para separar las preocupaciones de presentación, gestión de estado y motores matemáticos:

```
┌──────────────────────────────────────────────────────────┐
│              UI REACT (Presentación y Layout)             │
│   AppShell ──► SectionRail ──► SectionPanelHost          │
│   Hojas presentacionales (compliance/, design-tools/)    │
└────────────────────────────┬─────────────────────────────┘
                             │ (Eventos y Props)
                             ▼
┌──────────────────────────────────────────────────────────┐
│         STORES ZUSTAND (Estado Global - Slices)          │
│   useProjectStore ──► useRegulatoryStore ──► useUiStore  │
└────────────────────────────┬─────────────────────────────┘
                             │ (Entradas de datos)
                             ▼
┌───────────────────────────────────────────┐  ┌───────────┐
│     MOTORES PUROS (Pure Functions)        │  │ CATÁLOGOS │
│   src/lib/   (Geometría, Layout, Sizing)  │  │ src/data/ │
│   src/rules/ (Motor de Cumplimiento)      │  │ Catálogos │
└────────────────────────────┬──────────────┘  └───────────┘
                             │ (Salidas estructuradas)
                             ▼
┌──────────────────────────────────────────────────────────┐
│        REPORTABILIDAD MODULAR (Reporte Técnico PDF)       │
│   buildReportData ──► ReportDocument (Modular PDF)       │
└──────────────────────────────────────────────────────────┘
```

1. **Capa UI (React / Next.js)**: Componentes declarativos ubicados en `src/components/`. Su función es renderizar la interfaz y emitir eventos mediante callbacks.
2. **Capa de Estado (Zustand Slices)**: Stores globales ubicados en `src/store/` que actúan como la única fuente de verdad reactiva para el layout y los perfiles seleccionados. El store principal utiliza un patrón modular de slices.
3. **Capa de Negocio y Motores Puros (`src/lib/` y `src/rules/`)**: Funciones puras libres de React y de dependencias del framework que contienen la lógica de cálculo espacial, colisiones, fits de terreno, topología eléctrica y validación normativa.
4. **Capa de Catálogos y Datos Estáticos (`src/data/`)**: Constantes geométricas globales, catálogos de equipamiento real de fabricantes y registros de evidencias documentales del sistema.
5. **Capa de Reportabilidad (`src/components/report/` y `src/lib/report/`)**: Ensambladores de datos de auditoría y plantillas de renderizado de reportes PDF.

---

## 4. Flujo General de Datos

El procesamiento de datos en la aplicación opera bajo un flujo unidireccional y predecible:

1. **Interacción del Usuario**: El usuario manipula la interfaz (ej. cambia el número de contenedores BESS a dimensionar o presiona el botón de ajuste al terreno).
2. **Mutación del Store**: Los componentes UI llaman a las acciones expuestas por `useProjectStore` (o `useRegulatoryStore`).
3. **Ejecución de Motores Puros**: Las acciones del store invocan las funciones de cálculo de la biblioteca pura, tales como:
   - `validateBessLayout`: Evalúa distancias físicas contra el perfil regulatorio.
   - `validateElectricalTopology`: Analiza la topología MT del sistema.
   - `runRegulatoryEvaluation`: Consolida las alertas regulatorias y eléctricas aplicando la matriz de evidencias de `severityCeiling.ts`.
4. **Actualización de Estado**: El store actualiza sus slices locales (`polygon`, `placedEquipment`, `lastToolResult`, etc.).
5. **Re-renderizado UI y Reporte**: Los componentes UI reaccionan y actualizan sus vistas. Al presionar "Generar Reporte", `buildReportData` consolida este estado final y alimenta el componente `ReportDocument` para generar el PDF descargable.

---

## 5. Descomposición y Detalle de Módulos (Refactor Post-Fase 12)

La Fase 12 descompuso los tres grandes monolitos originales del sistema en estructuras altamente modulares y cohesivas:

### A. Capa de Estado (Zustand)

El store global `projectStore.ts` ha sido reducido a un "Composition Root" de **32 líneas de código**. Toda la lógica de negocio y acciones asociadas ha sido extraída a slices dedicadas en `src/store/slices/`, utilizando invariantes históricos y un modelo de datos estrictamente tipado:

```
[src/store/]
├── projectStore.ts           <-- Composition Root (32 LOC)
├── projectStore.types.ts     <-- Tipos compartidos e interfaces de acciones
├── projectStore.history.ts   <-- Invariantes y helpers del stack de Undo/Redo
└── slices/
    ├── polygonSlice.ts       <-- Gestión geométrica del polígono del terreno
    ├── terrainSlice.ts       <-- Gestión del preview y parametrización de terreno
    ├── repairZoneSlice.ts    <-- Herramientas de zona de reparación física
    ├── equipmentSlice.ts     <-- Catálogos activos y equipamiento colocado
    ├── layoutEditSlice.ts    <-- Herramientas de selección, drag, y preview del layout
    ├── comparisonSlice.ts    <-- Comparación de alternativas de diseño (A/B)
    └── lifecycleSlice.ts     <-- Carga y restauración de presets (BESS del Desierto)
```

### B. Capa de Mapa (Map Shell, Layers y Interaction Hooks)

El monolito geográfico `BessMap.tsx` fue reducido de ~1827 líneas a un shell limpio de **614 líneas** mediante dos estrategias de extracción:
1. **Extracción de Capas y Presentaciones (`src/components/map/layers/`)**: Las definiciones y configuraciones estéticas de las capas MapLibre se dividieron en componentes funcionales declarativos.
2. **Extracción de Comportamiento e Interacciones (`src/components/map/hooks/`)**: Se aislaron las acciones de cámara, handlers de clics y gestos de arrastre en custom hooks dedicados y sin tipos `any`.

```
[src/components/map/]
├── BessMap.tsx                   <-- Shell principal del mapa (614 LOC)
├── BessMap.constants.ts          <-- Constantes, estilos base y viewports iniciales
├── BessMap.geometry.ts           <-- Funciones geométricas locales auxiliares
├── layers/
│   ├── PolygonTerrainLayers.tsx              <-- Renderizado de polígonos, mediciones y terreno
│   └── EquipmentSelectionOverlayLayers.tsx  <-- Renderizado de BESS,PCS,caminos,cables y alertas
└── hooks/
    ├── useBaseMapStyle.ts        <-- Carga y alternancia de estilos de mapa base
    ├── useMapLifecycle.ts        <-- Controladores de montaje, carga y errores del mapa
    ├── useMapCamera.ts           <-- Encuadres y flyTo (fitToPolygon, centerMap)
    ├── useDrawModeHandlers.ts    <-- Gestión de clicks de inserción de vértices y equipos
    ├── usePreviewTerrainGestures.ts <-- Control de arrastre y rotación del terreno paramétrico
    ├── useLayoutEditGestures.ts  <-- Drag y traducción física del equipamiento colocado
    ├── useMapInteractionRouter.ts <-- Enrutador centralizado de eventos del mouse
    ├── usePolygonFeatures.ts     <-- GeoJSON preparador para el polígono de sitio
    ├── useRepairZoneFeatures.ts  <-- GeoJSON preparador para zonas de reparación
    ├── usePreviewTerrainFeatures.ts <-- GeoJSON preparador para terreno paramétrico
    ├── useEquipmentFeatures.ts   <-- GeoJSON preparador y filtros de equipos BESS
    ├── useSelectionFeatures.ts   <-- GeoJSON preparador para selección de layout
    ├── useLayoutInfrastructureFeatures.ts <-- GeoJSON preparador para caminos y cables MT
    └── useOverlayFeatures.ts     <-- GeoJSON preparador de grids y marcadores de alerta
```

### C. Capa de Reportabilidad Modular (Phase 12A)

El monolito del PDF de ~1480 líneas (`ReportDocument.tsx`) fue subdividido en componentes de sección desacoplados, facilitando el mantenimiento y las auditorías de diseño independientes:

```
[src/components/report/]
├── ReportPreview.tsx             <-- Previsualización en pantalla del reporte
└── document/
    ├── ReportDocument.tsx        <-- Composición raíz del documento PDF
    ├── ReportCoverPage.tsx       <-- Portada y metadatos generales
    ├── ReportExclusionsPage.tsx  <-- Tabla de exclusiones técnicas y disclaimers legales
    ├── ReportTraceabilityPage.tsx <-- Listado de evidencias y documentos normativos
    ├── ReportElectricalArchitecturePage.tsx <-- Resumen de Single Line Diagram y topología
    └── ReportLayoutPage.tsx      <-- Polígono de sitio, coordenadas y captura de mapa
```

---

## 6. Arquitectura UI (Fase 11)

El shell de la interfaz de usuario estructura un espacio de trabajo limpio dividido en 5 secciones de navegación:

* **`AppShell`**: Componente contenedor raíz que monta el mapa interactivo `BessMap`, la barra de herramientas `Toolbar`, el indicador `KPIBar` y la barra de navegación `SectionRail`.
* **`SectionRail`**: Menú lateral izquierdo ultra-reducido que permite conmutar la sección activa de la aplicación:
  1. *Sitio (site)*: Gestión de terreno, vértices y presets del proyecto.
  2. *Equipos (equipment)*: Catálogos de fabricantes y biblioteca de modelos BESS/PCS.
  3. *Layout (layout)*: Inserción de mallas de equipos, regularización y reparación espacial del BESS.
  4. *Cumplimiento (compliance)*: Configuración del perfil regulatorio activo y visualización detallada de issues normativos y alertas.
  5. *Reporte (report)*: Vista previa del reporte preliminar emitido y descargador PDF.
* **`SectionPanelHost`**: Panel lateral flexible que aloja las barras de herramientas primarias y secundarias específicas de la sección activa, organizándolas en contenedores colapsables (`CollapsibleSection`).

*Nota: El mapa geográfico (`BessMap`) permanece montado de forma permanente en el centro del shell de la aplicación para evitar ciclos de renderizado y pérdida del contexto WebGL/Mapbox.*

---

## 7. Patrón de Paneles Orquestadores y Componentes Presentacionales

Con el fin de evitar el acoplamiento directo de Zustand y lógica computacional en componentes UI hoja, la Fase 11B introdujo el patrón **Orquestador-Presentador**:

### Padres Orquestadores (Smart Components)
* **`RegulatoryCompliancePanel.tsx` (174 líneas)** e **`PreliminaryDesignToolsPanel.tsx` (162 líneas)**:
  - Suscriben directamente a los Zustand stores (`useProjectStore`, `useRegulatoryStore`, `useUiStore`).
  - Invocan las funciones computacionales puras (`validateBessLayout`, `validateElectricalTopology`, `runRegulatoryEvaluation`).
  - Pasan los datos procesados y constantes a los componentes hijos a través de props limpias.
  - Exponen callbacks tipados para interceptar interacciones del usuario y transmitirlas como mutaciones de estado al store.

### Hijos Presentacionales (Dumb Components)
* **Carpeta `src/components/sidebar/compliance/`** (e.g. `ComplianceSummary`, `ComplianceIssuesList`, `CandidateRuleMatrix`):
* **Carpeta `src/components/sidebar/design-tools/`** (e.g. `SizingContainerSection`, `LayoutRepairSection`, `GridPreview`, `GridShapePicker`):
  - No importan `src/store/` ni leen Zustand de manera directa.
  - No invocan ni importan motores geométricos ni de validación.
  - Son 100% testeables en aislamiento mediante mocks simples de datos y espías de llamadas (`vi.fn()`).

---

## 8. Where to Put New Code (Dónde agregar nuevo código)

| Tipo de Lógica / Preocupación | Ubicación en el Repositorio | Directrices de Diseño |
|---|---|---|
| **Constantes de Ingeniería / Fórmulas** | `src/data/` (o un perfil regulatorio en `src/rules/profiles/`) | Deben estar tipadas y etiquetadas según su clasificación de evidencia. |
| **Geometría, Colisiones, Áreas** | `src/lib/geometry/` | Funciones puras e independientes de React. Testeables con Vitest. |
| **Cables, Caminos, Generación de Layouts** | `src/lib/layout/` | Estructuras de layout abstractas. Sin dependencias geográficas del mapa. |
| **Cálculos de Dimensionamiento Eléctrico** | `src/lib/sizing/` | Operaciones matemáticas puras de conversión kVA/MWh. |
| **Consistencia Eléctrica de Red / Feeders** | `src/lib/electrical/` | Funciones puras de compatibilidad de voltajes e impedancias. |
| **Acciones y Mutaciones de Estado** | `src/store/slices/` | Slices cohesivos. No sobrepasar ~150-200 líneas por slice. |
| **Componentes Visuales del Mapa** | `src/components/map/layers/` | Capas declarativas MapLibre reactivas a props. Sin lógica de estado. |
| **Controladores e Interacciones de Mapa** | `src/components/map/hooks/` | Custom hooks especializados. Mantener firmas y retornos estrictamente tipados. |
| **Bloques de Reportabilidad (PDF)** | `src/components/report/document/` | Un componente de React-PDF por sección del documento. |

---

## 9. Invariantes Arquitectónicas (Architectural Invariants)

Para prevenir la degradación de la arquitectura del proyecto, se deben cumplir estrictamente las siguientes reglas:
1. **Hojas sin Zustand**: Ningún componente presentacional bajo `src/components/sidebar/compliance/` o `src/components/sidebar/design-tools/` debe importar o consumir Zustand de forma directa.
2. **Motores sin React**: Ningún módulo puro dentro de `src/lib/` o `src/rules/` debe importar componentes React, JSX o hooks del framework.
3. **No rigidizar defaultConstraints**: Las holguras paramétricas de distancias de seguridad no deben insertarse directamente en el código de cálculo geométrico; deben consumirse de los stores alimentados por `defaultConstraints.ts`.
4. **Visibilidad Obligatoria de Exclusiones**: No se permite agregar interruptores de ocultamiento para el bloque de exclusiones técnicas en el reporte.
5. **No imports circulares desde el Mapa**: Ningún hook, capa o utilitario ubicado en `src/components/map/hooks/` o `src/components/map/layers/` debe importar símbolos del archivo visual `BessMap.tsx`.
6. **Reporte Dividido**: Las modificaciones al formato PDF de reporte deben realizarse en los componentes modulares de sección bajo `src/components/report/document/`, manteniendo `ReportDocument.tsx` únicamente como ensamblador raíz.

---

## 10. Deuda Técnica Remanente

* **warnings de lint transitorios:** Mantener el objetivo de cero advertencias ESLint en el código nuevo.
* **Cobertura de Tests Visuales / UI:** Falta de suites de pruebas visuales integradas para asegurar alineamiento de interfaces tras cambios de layout CSS globales.
