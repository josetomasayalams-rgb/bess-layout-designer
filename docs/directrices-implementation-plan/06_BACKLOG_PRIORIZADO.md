# 06 — Backlog priorizado

Backlog accionable. Cada ítem tiene ID, descripción, fase, prioridad, dependencia, archivos probables, criterio de aceptación, riesgo, estado inicial.

Convenciones:
- **Prio**: P1 (crítica) · P2 (alta) · P3 (media) · P4 (baja).
- **Estado inicial**: `pending` para todo.
- **Esfuerzo**: S (≤1d) · M (1–3d) · L (≥3d).

---

## Fase 0 — Diagnóstico (esta planificación)

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-001 | Plan maestro | Producir los 13 archivos `00..12` en `docs/directrices-implementation-plan/` | 0 | P1 | — | M | `docs/` | Los 13 archivos existen | Bajo |
| T-002 | Convención IDs documentos | Definir esquema `XXX-NNNN-AAAA` para `DocumentRegistry` | 0 | P1 | — | S | `02_MAPEO_DIRECTRICES_APPB.md` | Esquema documentado | Bajo |

---

## Fase 1 — Modelo de datos + trazabilidad

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-101 | Crear tipos de evidencia | `EvidenceConfidence`, `EvidenceRef`, `EvidencedValue<T>` | 1 | P1 | T-002 | S | `src/types/evidence.ts` | Tipos exportados, typecheck OK | Bajo |
| T-102 | DocumentRegistry inicial | Cargar IDs de los ~80 documentos principales | 1 | P1 | T-101 | M | `src/data/documentRegistry.ts` | Lista de entries con `isPrimary` correcto, IDs únicos | Medio (clasificación) |
| T-103 | Tipos eléctricos extendidos | `ConversionStation`, `PCSModule`, `BlockTransformer`, `MVFeeder`, `MVBus`, `POI`, `MainTransformer`, `BESSBlock`, `AuxiliaryServices`, `PPC`, `OperationalLimits`, `LossEstimate` | 1 | P1 | T-101 | M | `src/types/electrical.ts` | Typecheck OK, todos exportados | Bajo |
| T-104 | Tipos cable + camino + safety | `CableRoute`, `AccessRoad`, `FireSafetyZone` | 1 | P1 | T-101 | S | `src/types/cable.ts`, `src/types/road.ts`, `src/types/safety.ts` | Typecheck OK | Bajo |
| T-105 | Extender EquipmentSpec | Añadir `clearances`, `compliance`, `batteryHierarchy`, `source.evidence: EvidenceRef[]` | 1 | P1 | T-101 | S | `src/types/equipment.ts`, `src/data/equipmentCatalog.ts` | Existing tests pasan, nuevos campos opcionales | Medio |
| T-106 | Extender ProjectBESS | Añadir todos los nuevos campos en `src/types/project.ts` | 1 | P1 | T-103, T-104 | M | `src/types/project.ts` | Typecheck OK, store sigue compilando | Bajo |
| T-107 | Extender ProjectStore slices | Slices nuevos para `conversionStations`, `mvFeeders`, `mvBuses`, `poi`, etc. (solo shape, sin acciones aún) | 1 | P1 | T-106 | M | `src/store/projectStore.ts` | App arranca sin crashear, equipamiento existente intacto | Medio |
| T-108 | Schema export 1.2 | Bumpear `schema_version` a `"1.2"` + lector retrocompatible para `"1.1"` | 1 | P1 | T-106 | S | `src/lib/export/exportJson.ts` | Tests fixture v1.1 pasan; export nuevo incluye campos nuevos | Medio |
| T-109 | Tests evidencia | Tests unitarios sobre serialización y carga | 1 | P1 | T-101, T-102 | S | `src/types/evidence.test.ts`, `src/data/documentRegistry.test.ts` | Tests pasan | Bajo |
| T-110 | Smoke test app | Verificar que dev server arranca y demo carga | 1 | P1 | T-107 | S | — | `npm run dev` + abrir Demo no crashea | Medio |

---

## Fase 2 — Catálogo con datasheets

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-201 | Catálogo ST2752UX evidenciado | Releer datasheet V15 + añadir EvidenceRef por campo | 2 | P1 | T-105 | M | `src/data/catalogs/bessContainerCatalog.ts` | Cada campo con evidencia o `confidence: "missing"` | Medio (lectura humana) |
| T-202 | Catálogo SC5000UD-MV evidenciado | Idem para PCS/MV skid | 2 | P1 | T-105 | M | `src/data/catalogs/mvSkidCatalog.ts`, `pcsCatalog.ts` | Idem | Medio |
| T-203 | Catálogo cables MT | HES, Nexans (2), Prysmian | 2 | P2 | T-105 | M | `src/data/catalogs/cables.ts` (nuevo) | Cables 18/33 (36) kV disponibles | Bajo |
| T-204 | Catálogo switchgear MT | Siemens 8DA/8DB | 2 | P3 | T-105 | S | `src/data/catalogs/switchgear.ts` (nuevo) | Switchgear 40,5 kV disponible | Bajo |
| T-205 | Catálogo transformador principal | Horizon Power referencia | 2 | P3 | T-105 | S | `src/data/catalogs/mainTransformer.ts` (nuevo) | Disponible como referencia | Bajo |
| T-206 | Validar tests catálogo | Confirmar que existing tests `equipmentCatalog.test.ts` pasan | 2 | P1 | T-201, T-202 | S | `src/data/equipmentCatalog.test.ts` | Tests pasan | Bajo |

---

## Fase 3 — Preset BESS del Desierto

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-301 | Preset designTargets | 200 MW, 800 MWh comercial, 880,80384 bruto, usableFactor 0.9083 | 3 | P1 | T-201, T-202 | S | `src/data/projectCaseStudies/bessDelDesierto.ts` | Reproduce KPIs documento ancla | Bajo |
| T-302 | Preset estructura 40 stations × 8 containers | Generar IDs y agrupaciones | 3 | P1 | T-301, T-103 | M | Idem | 40 stations, 320 containers, 10 feeders | Bajo |
| T-303 | Preset POI + sectioning center | BP5/BP6 33 kV, sectioning center | 3 | P1 | T-302 | S | Idem | POI y bus declarados | Bajo |
| T-304 | Preset MainTransformer externo | Como referencia, no en layout | 3 | P2 | T-302 | S | Idem | scope: "external_reference" | Bajo |
| T-305 | Preset AuxiliaryServices | SSAA PMAX carga/descarga | 3 | P2 | T-302 | S | Idem | Valores reproducen caso PMAX | Bajo |
| T-306 | Preset PPC Bluence | Modos P/Q/PF/V/freq/ramp | 3 | P2 | T-302 | S | Idem | PPC documentado | Bajo |
| T-307 | Preset DocumentInconsistencies | ST2752/ST2725, 0.9/0.69 kV, 220/230 kV | 3 | P1 | T-302 | S | Idem | Mínimo 3 inconsistencias declaradas | Bajo |
| T-308 | Test fixture preset | Cargar preset y validar | 3 | P1 | T-302 | S | `src/data/projectCaseStudies/bessDelDesierto.test.ts` | Tests pasan | Bajo |

---

## Fase 4 — Sizing engine

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-401 | architectureSizing.ts | Funciones containersForTargetEnergy, stationsForContainers, stationsForPower, feedersForStations, duration | 4 | P1 | T-103 | M | `src/lib/sizing/architectureSizing.ts` (nuevo) | Tests aritméticos pasan | Bajo |
| T-402 | UI Quick Sizing extendida | Mostrar bruto/usable/comercial con badge fuente | 4 | P1 | T-401, T-101 | M | `src/components/sidebar/BessQuickSizingPanel.tsx` | UI muestra los 3 valores con confidence | Bajo |
| T-403 | Test 200 MW / 800 MWh | Validar 320/40/10 | 4 | P1 | T-401 | S | `src/lib/sizing/architectureSizing.test.ts` | Test pasa con valores exactos | Bajo |

---

## Fase 5 — Generador bloques

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-501 | blockTemplates.ts | Plantillas H/V, separaciones parametrizadas | 5 | P2 | T-401 | M | `src/lib/layout/blockTemplates.ts` (nuevo) | Plantillas reproducen layout demo | Medio |
| T-502 | Extender preliminaryLayoutGenerator | Respetar agrupación 8:1 | 5 | P2 | T-501 | M | `src/lib/layout/preliminaryLayoutGenerator.ts` | Generador produce bloques agrupados | Medio |

---

## Fase 6 — Layout MV/POI

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-601 | LayoutZone mv_yard / poi_yard | Capas nuevas en map renderer | 6 | P2 | T-103 | M | `src/lib/layout/mapFeatures.ts`, `src/components/map/BessMap.tsx` | Capas se renderizan | Medio |
| T-602 | CableRoute renderer | Corredor parametrizado en mapa | 6 | P2 | T-104, T-601 | M | `src/lib/layout/cableRoutes.ts` (nuevo), `BessMap.tsx` | Cables MT visibles entre stations y sectioning | Medio |
| T-603 | AccessRoad renderer | Camino perimetral + internos | 6 | P2 | T-104, T-601 | M | `src/lib/layout/accessRoads.ts` (nuevo), `BessMap.tsx` | Caminos visibles, ancho configurable | Medio |
| T-604 | MVArchitecturePanel | Panel sidebar para arquitectura MV | 6 | P3 | T-103 | M | `src/components/sidebar/MVArchitecturePanel.tsx` (nuevo) | Panel muestra feeders / buses / POI | Bajo |

---

## Fase 7 — Validaciones físicas

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-701 | RULE-PHYS-001..005 | Separaciones, accesos, fire setback, corredor sin solape | 7 | P2 | T-103, T-602, T-603 | M | `src/rules/bessValidationEngine.ts` | Tests pasan | Bajo |
| T-702 | WarningsPanel por categoría | Mostrar warnings por categoría con cite | 7 | P3 | T-701 | S | `src/components/sidebar/WarningsPanel.tsx` | UI muestra agrupado | Bajo |

---

## Fase 8 — Validaciones eléctricas

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-801 | topologyValidation.ts | 8:1, 4:1, tensiones | 8 | P3 | T-103 | M | `src/lib/electrical/topologyValidation.ts` (nuevo) | Tests pasan | Bajo |
| T-802 | Extender compatibility.ts | Cobertura PCS-trafo más estricta | 8 | P3 | T-103 | S | `src/lib/electrical/compatibility.ts` | Tests pasan | Bajo |

---

## Fase 9 — Matriz normativa (lectura humana)

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-901 | Lectura SEC RGR 06/2024 BESS | Extraer reglas BESS con página + numeral | 9 | P2 | T-102 | M | `src/rules/regulatoryRulesCatalog.ts` | ≥ 10 reglas extraídas | Alto (lectura humana) |
| T-902 | Lectura SEC RPTD 08 Incendios | Distancias, separaciones | 9 | P2 | T-102 | M | Idem | ≥ 5 reglas | Alto |
| T-903 | Lectura SEC RPTD 07 Franja Seguridad | Distancias seguridad eléctrica | 9 | P3 | T-102 | M | Idem | ≥ 5 reglas | Alto |
| T-904 | Lectura CNE NTSyCS | Calidad servicio, requisitos técnicos | 9 | P3 | T-102 | L | Idem | ≥ 15 reglas | Alto |
| T-905 | Lectura CEN Anexo 2 NI/MR/MNR | Interconexión | 9 | P3 | T-102 | M | Idem | ≥ 8 reglas | Alto |
| T-906 | Lectura SEA Criterio DS17/2026 | Ambiental almacenamiento | 9 | P2 | T-102 | M | Idem | ≥ 5 reglas | Alto |
| T-907 | Lectura MINVU DDU 522 BESS | Territorial / urbanismo | 9 | P2 | T-102 | M | Idem | ≥ 5 reglas | Alto |
| T-908 | Lectura DS 38 Ruido | Niveles permitidos | 9 | P3 | T-102 | S | Idem | ≥ 3 reglas | Medio |
| T-909 | Perfiles regulatorios | Combinar reglas en perfiles `chile-utility`, `chile-pmgd` | 9 | P3 | T-901..T-908 | M | `src/rules/profiles/*.ts` | Perfiles seleccionables | Medio |

---

## Fase 10 — Motor validaciones normativas

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-1001 | evaluateRules() | Motor que evalúa reglas vs proyecto | 10 | P3 | T-901..T-909 | M | `src/rules/bessValidationEngine.ts` | Tests con preset reproducen violaciones | Medio |
| T-1002 | RegulatoryCompliancePanel mejorado | Vista dedicada | 10 | P3 | T-1001 | M | `src/components/sidebar/RegulatoryCompliancePanel.tsx` | UI muestra compliance | Bajo |

---

## Fase 11 — Reporte técnico

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-1101 | buildReport() | Construir `TechnicalReport` desde el store | 11 | P1 | T-1001 + todos | L | `src/lib/report/buildReport.ts` (nuevo) | Reporte completo con todas las secciones | Alto |
| T-1102 | ReportPreview UI | Vista previa antes de exportar | 11 | P2 | T-1101 | M | `src/components/report/ReportPreview.tsx` (nuevo) | Vista renderiza | Medio |
| T-1103 | Export PDF | Client-side print-to-PDF o `react-pdf` | 11 | P1 | T-1101 | L | `src/lib/report/exportPdf.ts` (nuevo) | PDF se descarga con secciones | Alto |
| T-1104 | Export HTML | Opción HTML para inspección | 11 | P3 | T-1101 | S | `src/lib/report/exportHtml.ts` (nuevo) | HTML válido | Bajo |
| T-1105 | Single-line diagram | Componente simple unifilar | 11 | P2 | T-103 | M | `src/components/electrical/SingleLineDiagram.tsx` (nuevo) | Unifilar BESS del Desierto se renderiza | Medio |
| T-1106 | Engineering checklist data | Cargar checklist (12+ ítems) | 11 | P2 | T-101 | S | `src/data/engineeringChecklist.ts` (nuevo) | Lista cargada | Bajo |
| T-1107 | Disclaimer obligatorio | Portada y pie | 11 | P1 | T-1101 | S | `src/lib/report/buildReport.ts` | Disclaimer literal aparece | Bajo |

---

## Fase 12 — QA y docs

| ID | Nombre | Descripción | Fase | Prio | Dep. | Esf. | Archivos | Criterio aceptación | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| T-1201 | E2E preset BESS del Desierto | Test end-to-end | 12 | P2 | todos | M | `tests/e2e/bess-del-desierto.test.ts` | Caso completo se reproduce | Medio |
| T-1202 | Cobertura ≥ 70% | `src/lib/`, `src/rules/` | 12 | P3 | todos | M | — | Cobertura medida | Bajo |
| T-1203 | docs/onboarding.md | Guía para nuevos devs | 12 | P3 | todos | S | `docs/onboarding.md` (nuevo) | Existe | Bajo |
| T-1204 | docs/data-model.md | Documentar modelo en `docs/` (no en `directrices-implementation-plan/`) | 12 | P3 | T-106 | M | `docs/data-model.md` (nuevo) | Existe | Bajo |
| T-1205 | Seguridad documental | No exponer rutas DIRECTRICES en producción | 12 | P2 | — | S | `next.config.ts`, `.gitignore` | DIRECTRICES_APP_BESS no se sirve | Medio |

---

## Resumen por prioridad

| Prio | Cantidad | Comentario |
|---|---|---|
| P1 | 16 | Críticas — bloqueantes para v1 |
| P2 | 19 | Altas — completan v1 |
| P3 | 17 | Medias — v1.1 / v1.2 |
| P4 | 0 | — |
| **Total** | **52 ítems** | |

---

## Orden recomendado de ejecución

1. Fase 0 (este plan) → Fase 1 (modelo + trazabilidad) **EN PARALELO** con preparación de DocumentRegistry.
2. Fase 2 (catálogos evidenciados) → Fase 3 (preset).
3. Fase 4 (sizing) en paralelo con Fase 5 (bloques).
4. Fase 6 (layout MV/POI) abre camino para Fase 7+8 (validaciones físicas + eléctricas).
5. Fase 9 (lectura humana de normativa) se puede iniciar después de Fase 1 y avanzar en paralelo con Fases 2–8.
6. Fase 10 espera Fase 9.
7. Fase 11 (reporte) espera 1, 2, 3, 4, 7, 8, 10.
8. Fase 12 (QA) al cierre.

---

## Métrica de progreso

Después de cada fase:
- `npm run build` pasa.
- `npm run lint` pasa.
- `npm run typecheck` pasa.
- `npm run test` pasa.
- App arranca sin errores en consola.
- Preset BESS del Desierto sigue funcionando.
