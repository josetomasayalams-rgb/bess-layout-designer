# Arquitectura del Sistema - BESS Layout Designer

Este documento detalla la arquitectura real de software implementada en el repositorio del predimensionador de sistemas de almacenamiento de energía en baterías (BESS) a gran escala. Su propósito es servir de guía técnica para desarrolladores, revisores y auditorías de código, garantizando la mantenibilidad y delimitación de responsabilidades en futuras expansiones del sistema.

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
│              STORES ZUSTAND (Estado Global)              │
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
│              REPORTABILIDAD (Salida Técnica)             │
│   buildReportData.ts ──► ReportDocument.tsx (PDF)        │
└──────────────────────────────────────────────────────────┘
```

1. **Capa UI (React / Next.js)**: Componentes declarativos ubicados en `src/components/`. Su función es renderizar la interfaz y emitir eventos mediante callbacks.
2. **Capa de Estado (Zustand)**: Stores globales ubicados en `src/store/` que actúan como la única fuente de verdad reactiva para el layout y los perfiles seleccionados.
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

## 5. Arquitectura UI (Fase 11)

El shell de la interfaz de usuario ha sido rediseñado para estructurar un espacio de trabajo limpio dividido en 5 secciones de navegación:

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

## 6. Patrón de Paneles Orquestadores y Componentes Presentacionales

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

## 7. Capa de Mapa y Geometría

La representación espacial utiliza un sistema de coordenadas locales bidimensionales expresado en metros:
* **Project Anchor (Origen ENU)**: El primer vértice trazado del polígono del terreno establece el origen local (0, 0) de coordenadas en metros.
* **Proyección Bidireccional**: La biblioteca utiliza funciones de proyección cosine-corrected equirectangular para realizar la conversión bidireccional entre coordenadas geográficas `LngLat` (usadas por el motor de Mapbox/OpenStreetMap) y coordenadas planas cartesianas `LocalPoint` (usadas por los motores de colisión y espaciamiento).
* **BessMap.tsx (1827 líneas)**: Componente monolítico remanente que renderiza las capas geográficas, lee los eventos de arrastre y rotación del mouse, gestiona el estado de herramientas de dibujo de polígonos y dibuja las geometrías proyectadas de los contenedores BESS, PCS y zonas de exclusión.

---

## 8. Capa de Motores Puros (`src/lib/`)

Contiene algoritmos geométricos y aritméticos libres de efectos secundarios:
* **`/geometry/`**: Algoritmos de intersección de rectángulos orientados, detección de colisiones de footprints (`collision.ts`), y cálculo de áreas planas (`area.ts`).
* **`/layout/`**: Generador conceptual de grids paramétricos, regularizador de filas y columnas, ruteo de cables y alineación espacial (`layoutRepair.ts` y `fitLayoutToTerrain.ts`).
* **`/sizing/`**: Cálculos estáticos de dimensionamiento energético de bloques y estaciones BESS/PCS.
* **`/electrical/`**: Lógica de chequeo de capacidades de barra MT, ampacidad conceptual y consistencia de voltajes de transformadores de poder (`topologyValidation.ts`).

---

## 9. Capa Regulatoria (`src/rules/`)

El motor de reglas regulatorias evalúa las restricciones físicas del pre-diseño y ajusta su severidad basándose en la trazabilidad documental:
* **`regulatoryRulesCatalog.ts`**: Define las reglas de setbacks y seguridad de manera declarativa vinculándolas a un documento de respaldo de `documentRegistry.ts`.
* **`severityCeiling.ts`**: Módulo puro encargado de calcular el tope de severidad efectiva de una alerta basándose en el nivel del documento citado (L1 a L7) y la confianza declarada.
* **`regulatoryProfileMetadata.ts`**: Shim de compatibilidad que mapea las constantes de diseño paramétricas de `defaultConstraints.ts` hacia los perfiles Utility y PMGD.

*Para un desglose detallado de la trazabilidad regulatoria de evidencias y la lógica del ceiling, consultar [docs/regulatory-traceability.md](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/regulatory-traceability.md).*

---

## 10. Capa de Reportabilidad

La salida técnica consolidada en PDF se divide en dos fases:
1. **Ensamblado de Datos (`buildReportData.ts`)**: Recopila la información de configuración, mediciones del polígono, alertas regulatorias y la matriz de exclusiones de `exclusionRegistry.ts`, dando formato y trazabilidad documental a la salida.
2. **Renderizado (`ReportDocument.tsx`)**: Genera el documento PDF conceptual inyectando marcas de agua `"PRELIMINARY / BORRADOR CONCEPTUAL"` y disclaimers explícitos para garantizar la defensibilidad técnica y legal de la salida técnica (ver especificación completa en [docs/report-spec.md](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/report-spec.md)).

---

## 11. Defensibilidad Técnica

La arquitectura implementa de forma nativa principios defensivos para evitar que la herramienta sea clasificada como ingeniería definitiva:
* **defaultConstraints editable**: Los setbacks normativos se cargan como supuestos preliminares paramétricos editables y no como límites absolutos de código rígido.
* **Exclusiones Mandatorias**: Las disciplinas complejas no ejecutadas por la app se leen del registro estático `exclusionRegistry.ts` y se imprimen obligatoriamente en el reporte sin posibilidad de ocultamiento.
* **Citas Referenciales**: Los estándares NFPA 855 y UL 9540 son catalogados como referencias internacionales complementarias y no como leyes de cumplimiento local chileno.

*Para una descripción extendida sobre defensibilidad legal y técnica, consultar [docs/defensibility.md](file:///Users/josetomasayala/Desktop/App%20BESS/bess-layout-designer/docs/defensibility.md).*

---

## 12. Invariantes Arquitectónicas (Architectural Invariants)

Para prevenir la degradación de la arquitectura del proyecto, se deben cumplir estrictamente las siguientes reglas:
1. **Hojas sin Zustand**: Ningún componente presentacional bajo `src/components/sidebar/compliance/` o `src/components/sidebar/design-tools/` debe importar o consumir Zustand de forma directa.
2. **Motores sin React**: Ningún módulo puro dentro de `src/lib/` o `src/rules/` debe importar componentes React, JSX o hooks del framework.
3. **No rigidizar defaultConstraints**: Las holguras paramétricas de distancias de seguridad no deben insertarse directamente en el código de cálculo geométrico; deben consumirse de los stores alimentados por `defaultConstraints.ts`.
4. **Visibilidad Obligatoria de Exclusiones**: No se permite agregar interruptores de ocultamiento para el bloque de exclusiones técnicas en el reporte.
5. **Fase 12 Safe-Guard**: Antes de modificar `BessMap.tsx` o `projectStore.ts` para las capas de ruteo de cables y caminos de Fase 12, se debe realizar un snapshot completo y aislar la lógica geográfica en submódulos especializados.

---

## 13. Deuda Técnica Remanente

El repositorio arrastra los siguientes puntos de deuda técnica y áreas de mejora:
* **Monolito BessMap.tsx (1827 líneas)**: Concentra la lógica de renderizado geográfico de Mapbox, dibujo de vectores cartesianos en metros, administración de herramientas de edición de polígonos y cajas de diálogo flotantes. Debe ser refactorizado en submódulos separados antes de agregar las capas de caminos y cables de Fase 12.
* **God-Store projectStore.ts (1185 líneas)**: Controla estados mixtos de interacción de mapa, coordenadas del polígono, colocado de equipos, carga de presets, herramientas de reparación espacial y drafts temporales de previews de fit.
* **ReportDocument.tsx (1480 líneas)**: Monolito de renderizado PDF con estilos y estructuración rígida mezclada.
* **Warnings de Lint (123 warnings)**: Advertencias preexistentes concentradas en scripts heredados y lógicas de validación sin usar que deben ser resueltas.
* **Cobertura de Tests Visuales**: Falta de suites de pruebas visuales integradas para asegurar alineamiento de interfaces tras cambios de layout CSS globales.

---

## 14. Roadmap Técnico Posterior

Para abordar las siguientes fases de desarrollo se recomienda el siguiente orden de ejecución:
1. **Validación y Cierre**: Scope guard documental del commit de arquitectura.
2. **Lint Cleanup**: Sprint de limpieza dedicado para eliminar las 123 advertencias de linter y estabilizar la compilación en cero advertencias.
3. **Refactorización de BessMap y projectStore**: Extraer los manejadores de eventos geográficos de `BessMap.tsx` y subdividir el store `projectStore.ts` en slices modulares e independientes antes de iniciar el código productivo de Fase 12.
4. **Fase 12 Architect**: Definición de la especificación técnica de la arquitectura de caminos internos y ruteo de canalizaciones de cables de media tensión.
