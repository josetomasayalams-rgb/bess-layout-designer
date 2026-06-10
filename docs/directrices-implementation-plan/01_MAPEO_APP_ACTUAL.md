# 01 — Mapeo de la app actual

Estado real del código en `bess-layout-designer/` al momento de redactar este plan. Sirve de base para el análisis de brecha (`03_GAP_ANALYSIS.md`).

---

## 1. Framework y dependencias

- **Next.js 16** (App Router) + **React 19** + **TypeScript estricto**.
- **MapLibre GL** vía `react-map-gl/maplibre`.
- **Zustand** para estado global.
- **Vitest** + **jsdom** para tests.
- **Tailwind CSS** + componentes propios (`Badge`, `Button`, `CollapsibleSection`).
- **lucide-react** para iconografía.

Build, lint, typecheck y tests pasan al momento de redactar este plan.

---

## 2. Estructura de carpetas (resumen)

```
src/
├── app/           Next.js App Router (page.tsx, layout.tsx, globals.css)
├── components/
│   ├── layout/    AppShell, FlowStepper, MetricBar, Toolbar
│   ├── map/       BessMap, BaseMapSelector, CoordinateSearch,
│   │              LayerManagerPanel, LayoutEditToolbar, OrientationCube
│   ├── sidebar/   ~17 panel components (catalog, summary, warnings,
│   │              regulatory, quick sizing, case study, comparator, etc.)
│   └── ui/        Badge, Button, CollapsibleSection
├── data/
│   ├── catalogs/  bessContainer, pcs, mvSkid, transformer + adapters
│   ├── projectCaseStudies/ bessDelDesierto
│   ├── equipmentCatalog.ts  ← legacy flat + SourceReliability type
│   ├── defaultConstraints.ts
│   ├── equipment3dVisualProfiles.ts
│   ├── mapStyles.ts
│   └── unitSystem.ts
├── lib/
│   ├── geometry/  projection, area, collision, rectangles, distance
│   ├── layout/    preliminaryLayoutGenerator, caseStudyLayoutGenerator,
│   │              layoutEditing, layoutRepair, layoutComparison,
│   │              fitLayoutToTerrain, summaryCalculations, spacingRules,
│   │              projectMetrics, mapFeatures, demoProject,
│   │              equipmentSelection
│   ├── sizing/    preliminarySizing
│   ├── terrain/   parametricTerrain
│   ├── electrical/ compatibility
│   ├── map/       mapCamera
│   ├── units/     conversions, formatUnits
│   ├── export/    exportJson (schema_version "1.1")
│   ├── bessCalculations.ts
│   ├── bessArrayGenerator.ts
│   └── i18n.ts
├── rules/         bessValidationEngine.ts, bessRegulatoryProfiles.ts
├── store/         projectStore, uiStore, regulatoryStore (Zustand)
└── types/         geometry, equipment, project, bess, bessLayoutTypes, technical
```

---

## 3. Estado global (Zustand)

| Store | Archivo | Responsabilidad |
|---|---|---|
| `useProjectStore` | `src/store/projectStore.ts` | Polígono, equipo colocado, modo de interacción, draft de layoutEdit, undo/redo (5 pasos), repair zone, preview terrain, terrain fit preview |
| `useUiStore` | `src/store/uiStore.ts` | Locale (`en` / `es`), `unitSystem` (`metric_si`), `viewMode` (`top` / `iso`), `layerVisibility` |
| `useRegulatoryStore` | `src/store/regulatoryStore.ts` | `activeProfileId` |

**Modos de interacción**: `select`, `draw-site`, `place-equipment`, `draw-repair-zone`, `edit-layout`.

**Drafts**: `layoutEdit.draftPlacedEquipment` para edición no destructiva (apply / revert).

---

## 4. Tipos clave

```ts
// src/types/geometry.ts
type LngLat = { lng: number; lat: number };
type LocalPoint = { x_m: number; y_m: number };
type ProjectAnchor = { lng0: number; lat0: number };
type RotatedRectLocal = { center: LocalPoint; length_m: number; width_m: number; rotation_deg: number };
type Polygon = LngLat[];

// src/types/equipment.ts
type PlacedEquipment = {
  id: string;
  equipmentSpecId: string;
  anchor: LngLat;
  rotation_deg: number;
  groupId?: string;
  locked?: boolean;
  sourceReliability: SourceReliability;
};

// src/data/equipmentCatalog.ts
type SourceReliability = 'certified_data' | 'preliminary_assumption' | 'pending_validation';
```

Sistema de coordenadas: **local plano** anclado en el primer vértice del polígono (`ProjectAnchor`). Conversión vía `toLocal` / `toLngLat` con corrección por coseno de latitud (equirectangular). Todo cálculo geométrico y de colisión está en metros.

---

## 5. Catálogos de equipos

`src/data/catalogs/` tiene un archivo por clase con tipos propios:

| Archivo | Tipo de equipo |
|---|---|
| `bessContainerCatalog.ts` | Contenedores BESS |
| `pcsCatalog.ts` | PCS / inversores |
| `mvSkidCatalog.ts` | Skids MV (PCS + transformador integrado tipo SC5000UD-MV) |
| `transformerCatalog.ts` | Transformadores |
| `sources.ts` | Referencias de fuentes |
| `adapters.ts` | Convierten cada tipo a `EquipmentSpec` común |
| `index.ts` | Exporta `technicalEquipmentSpecs: EquipmentSpec[]` (lista unificada autoritativa) |

`src/data/equipmentCatalog.ts` (legacy) exporta el `equipmentCatalog` plano usado por los stores y mantiene el tipo `SourceReliability`. Convive con la versión moderna.

**Sungrow ST2752UX-US** y **Sungrow SC5000UD-MV-US-P3** están presentes con `source.reliability = 'certified_data'`.

---

## 6. Reglas y validaciones existentes

### Validaciones físicas (en `src/lib/layout/` + `src/lib/geometry/`)
- Colisiones entre equipos (`collision.ts`).
- Fuera de polígono.
- Separaciones mínimas configurables (`spacingRules.ts`).
- Buffers regulatorios renderizados como capas del mapa (`regulatoryBufferFeatures`).

### Validaciones eléctricas (en `src/lib/electrical/`)
- `compatibility.ts` revisa compatibilidad PCS ↔ transformador (tensión, potencia).

### Reglas normativas (en `src/rules/`)
- `bessRegulatoryProfiles.ts`: perfiles regulatorios activables (`activeProfileId`).
- `bessValidationEngine.ts`: motor que evalúa el layout contra el perfil.
- **Limitación**: los perfiles tienen valores, pero **no tienen citas formales** (archivo PDF + página + numeral) que respalden cada regla.

### Sizing
- `preliminarySizing.ts`: cálculo simplificado de cantidad de equipos para alcanzar MW/MWh objetivo.

### Generadores de layout
- `preliminaryLayoutGenerator.ts`: layout automático genérico.
- `caseStudyLayoutGenerator.ts`: layout específico del caso BESS del Desierto.
- `bessArrayGenerator.ts`: arrays de containers.

---

## 7. Exportación

`src/lib/export/exportJson.ts` produce un JSON con `schema_version: "1.1"` que incluye:

- `anchor`, `polygon`, `placed_equipment`
- `summary` (con duración bruta, ratio de ocupación)
- `summary_quantities` con `ExportedQuantity` (`value`, `unit`, `data_classification`, `source_note`)
- `placed_equipment_quantities` (footprint, mass, electrical, environmental por equipo)
- `warnings` (id, severity, message, reliability)
- `designIntent`, `caseStudy`, `selectedEquipment`, `powerEnergyBlocks`, `sizingResult`
- `electricalCompatibilityIssues`, `layoutAssumptions`, `pendingData`, `exclusions`, `requiredNextStudies`, `conceptualScopeNote`

**Ya hay infraestructura para `pendingData`, `exclusions`, `requiredNextStudies` y `conceptualScopeNote`** — pero está poco explotada y no fuerza al usuario a confirmarlas.

---

## 8. Internacionalización

`src/lib/i18n.ts` carga cadenas `en` / `es` desde objetos literales. La app por defecto opera en `es`.

---

## 9. Sistema de unidades

`metric_si` por defecto. `src/lib/units/conversions.ts` y `formatUnits.ts` formatean longitud, masa (kg / t), potencia (MW / MVA), energía (MWh), tensión (V / kV), frecuencia (Hz), temperatura (°C), porcentajes.

---

## 10. Mapa

`src/components/map/BessMap.tsx` (~1620 líneas) concentra:

- Renderizado del polígono de sitio, equipo colocado, buffers regulatorios, grid, marcadores de warnings, mediciones, vista isométrica (extrusion).
- 5 estilos de fondo (`standard` CARTO sin credenciales + `satellite` / `hybrid` con Google Maps API o MapTiler).
- Interacciones por modo (`draw-site`, `place-equipment`, `edit-layout`).
- Cubo de orientación, búsqueda por coordenadas, control de capas.

Los modos de edición ya soportan: rotación, movimiento, lazo de selección, lock, respace, compact, apply/revert/validate.

---

## 11. Documentación interna existente

- `CLAUDE.md` (raíz `App BESS/`) — guía de arquitectura para Claude Code.
- `bess-layout-designer/CLAUDE.md` — domain rules, equipos certificados (ST2752UX-US, SC5000UD-MV-US-P3), supuestos iniciales, MVP por fases.
- `bess-layout-designer/AGENTS.md` — guidelines para PR / commits / testing.
- `docs/unit-system.md` y `docs/map-providers.md`.
- `.claude/agents/`: `bess-technical-reviewer.md`, `frontend-architect.md`, `qa-tester.md`.

Hay coherencia: la documentación interna ya menciona que la app está en **Fase 2** (collision/clearance/out-of-bound/warnings) y reconoce que Fase 3 (auto-layout) y Fase 4 (cable/road/PDF) están planificadas. Este plan toma esa secuencia y la amplía con la integración documental de `DIRECTRICES_APP_BESS/`.

---

## 12. Qué falta categóricamente en el código (no en la doc)

| Falta | Impacto |
|---|---|
| Entidad `MVFeeder` como objeto del modelo | Colector eléctrico no es una entidad de primera clase |
| Entidad `MVBus` / `SectioningCenter` | Punto de coleccion 33 kV no se modela explícitamente |
| Entidad `POI` con `boundary: "mv_33kv" \| "hv_220kv" \| "external"` | No hay frontera de medición |
| Entidad `MainTransformer` como nodo externo | Subestación AT no modelada |
| Entidad `AuxiliaryServices` (HVAC, control, bombeo, incendio) | Potencia neta mal estimada |
| Entidad `PPC` como metadato | Control no documentado en export |
| Entidad `CableRoute` como corredor parametrizado | Sin reserva espacial real |
| Entidad `AccessRoad` | Equipos pueden quedar inaccesibles |
| Entidad `FireSafetyZone` | Sin separaciones HSE explícitas |
| Sistema `EvidenceRef` (archivo + página + nivel de confianza) | No se puede trazar de dónde sale cada dato |
| Sistema `InconsistencyDetector` | Inconsistencias en el caso (ST2752/ST2725, 0,9/0,69 kV, 220/230 kV) no se reportan |
| Reporte técnico profesional (HTML/PDF) | Solo hay export JSON |
| `BatteryCell`, `BatteryModule`, `BatteryRack` como niveles | Hoy solo `BatteryContainer` |
| Distinción `targetGrossEnergyMWh` vs `targetUsableEnergyMWh` vs `usableFactor` | Solo se modela uno (DC BOL) |
| Modelo de pérdidas (perStation, perPlant, MT) | No hay |
| Modelo de rampas (planta / inversor) | No hay |
| Modelo de mínimo técnico (carga / descarga) | No hay |
