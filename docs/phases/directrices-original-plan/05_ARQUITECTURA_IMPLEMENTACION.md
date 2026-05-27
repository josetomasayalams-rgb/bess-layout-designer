# 05 — Arquitectura de implementación por fases

Trece fases (0–12). Cada una con objetivo, justificación, inputs, archivos afectados, tareas, criterios de aceptación, riesgos, dependencias, prioridad y qué **no** debe hacerse todavía.

---

## Fase 0 — Diagnóstico y clasificación documental

**Objetivo**: dejar listo el material para que las fases 1–12 puedan citar fuentes sin reinterpretar.

**Justificación**: sin un `DocumentRegistry` con IDs estables, ninguna evidencia es trazable.

**Inputs**:
- `DIRECTRICES_APP_BESS/00_INDICE_MAESTRO_Y_TRAZABILIDAD/INDICE_MAESTRO_DIRECTRICES_APP_BESS.md`
- `DIRECTRICES_APP_BESS/00_INDICE_MAESTRO_Y_TRAZABILIDAD/inventario_reorganizacion.json`

**Tareas**:
1. Definir convención de IDs en `DocumentRegistry` (ej. `SEC-RGR-06-2024`, `SUNGROW-ST2752UX-V15`, `PROJ-BESS-DESIERTO-1129`).
2. Marcar cada documento como `isPrimary: true | false`.
3. Marcar fuentes duplicadas / reemplazadas.
4. No procesar archivos `99_PENDIENTES_*`.

**Archivos afectados**: solo `docs/` (esta planificación). Sin código aún.

**Criterios de aceptación**: archivos `01..03` de este plan completos.

**Riesgos**: tratar resúmenes internos como fuente primaria → mitigación: `isPrimary = false` para `10_RESUMENES_*`.

**Dependencias**: ninguna.

**Prioridad**: Crítica.

**No hacer todavía**: tocar código de producción, extraer reglas de los PDFs.

---

## Fase 1 — Modelo de datos extendido + trazabilidad

**Objetivo**: implementar `EvidenceRef`, `DocumentRegistry`, `EvidencedValue<T>`, y las entidades eléctricas que faltan (`MVFeeder`, `MVBus`, `POI`, `MainTransformer`, `AuxiliaryServices`, `PPC`, `BESSBlock`, `ConversionStation`, `BlockTransformer`, `PCSModule`, `CableRoute`, `AccessRoad`, `FireSafetyZone`).

**Justificación**: bloquea todas las demás fases. Sin esto, no se puede citar normativa ni reportar trazabilidad.

**Inputs**: `04_MODELO_DATOS_PROPUESTO.md` de este plan.

**Tareas**:
1. Crear `src/types/evidence.ts` con `EvidenceConfidence`, `EvidenceRef`, `EvidencedValue<T>`.
2. Crear `src/data/documentRegistry.ts` con todos los documentos clasificados como `isPrimary` y sus rutas.
3. Crear `src/types/electrical.ts` con todas las entidades eléctricas (ver `04_MODELO_DATOS_PROPUESTO.md` §5).
4. Crear `src/types/cable.ts`, `src/types/road.ts`, `src/types/safety.ts`.
5. Extender `src/types/equipment.ts` con `clearances`, `compliance`, `batteryHierarchy`.
6. Extender `src/types/project.ts` con todos los campos de capa 2 y capa 3.
7. Extender `useProjectStore` con slices nuevos (read-only por ahora — sin acciones de mutación, solo el shape).
8. Bumpear `ExportedProject.schema_version` a `"1.2"`. Mantener lector de `"1.1"`.
9. Tests unitarios:
   - `documentRegistry.test.ts`: cargar `DocumentRegistry` y validar que IDs son únicos.
   - `evidence.test.ts`: serializar/deserializar `EvidencedValue<T>`.
   - `project.test.ts`: backward compatibility (proyecto v1.1 carga sin error).

**Archivos afectados**:
- ✏️ Nuevos: `src/types/evidence.ts`, `src/types/electrical.ts`, `src/types/cable.ts`, `src/types/road.ts`, `src/types/safety.ts`, `src/data/documentRegistry.ts`.
- 🔧 Modificados: `src/types/equipment.ts`, `src/types/project.ts`, `src/store/projectStore.ts`, `src/lib/export/exportJson.ts`.

**Criterios de aceptación**:
- `npm run typecheck` pasa.
- `npm run test` pasa todos los tests existentes + los nuevos.
- `npm run build` pasa.
- La UI sigue funcionando idéntico (no se cambió comportamiento).
- Un export JSON nuevo incluye los campos nuevos vacíos sin romper.

**Riesgos**:
- Romper retrocompatibilidad de `ExportedProject` → mitigación: tests sobre fixtures v1.1.
- Sobre-modelar (entidades que nadie usa) → mitigación: dejar entidades como tipos sin UI; UI viene en fases siguientes.

**Dependencias**: Fase 0.

**Prioridad**: Crítica.

**No hacer todavía**: extraer reglas normativas. Diseñar UI para nuevas entidades. Implementar reporte. Tocar BessMap.

---

## Fase 2 — Catálogo técnico ampliado con datasheets oficiales

**Objetivo**: convertir el catálogo actual en uno con `EvidenceRef[]` por dato, basado en los datasheets oficiales presentes en `DIRECTRICES_APP_BESS/05_DATASHEETS_EQUIPOS_BESS/`.

**Inputs**:
- `SUNGROW_ST2752UX-US_Datasheet_V15_EN_OFICIAL.pdf` (DOC-0009)
- `SUNGROW_SC5000UD-MV-US_Datasheet_OFICIAL.pdf` (DOC-0013)
- `SUNGROW_PowerTitan2_Whitepaper_20240821_OFICIAL.pdf` (DOC-0032)
- `SUNGROW_ST2752UX_System_Manual_Ver12_202204_OFICIAL.pdf` (DOC-0040)

**Tareas**:
1. Revisar manualmente los datasheets PDF (lectura humana, no OCR) y registrar dato + página + valor en `src/data/catalogs/bessContainerCatalog.ts` y `mvSkidCatalog.ts`.
2. Marcar cada campo con `EvidencedValue<T>` o como `assumption` si el dato no aparece.
3. Crear catálogos nuevos: `src/data/catalogs/cables.ts` (HES, Nexans, Prysmian — 18/33 kV), `src/data/catalogs/switchgear.ts` (Siemens 8DA/8DB), `src/data/catalogs/mainTransformer.ts` (Horizon Power).
4. Reportar valores **no encontrados** como `confidence: "missing"` con item en `PendingDataItem[]`.
5. Tests: para ST2752UX-US y SC5000UD-MV-US, validar que los campos críticos (footprint, peso, energía, MVA, tensiones) tienen `EvidenceRef[]` con `confidence: "documented"`.

**Archivos afectados**:
- 🔧 Modificados: `src/data/catalogs/bessContainerCatalog.ts`, `src/data/catalogs/pcsCatalog.ts`, `src/data/catalogs/mvSkidCatalog.ts`, `src/data/catalogs/transformerCatalog.ts`, `src/data/equipmentCatalog.ts`.
- ✏️ Nuevos: `src/data/catalogs/cables.ts`, `src/data/catalogs/switchgear.ts`, `src/data/catalogs/mainTransformer.ts`, `src/data/catalogs/auxiliaryEquipment.ts`.

**Criterios de aceptación**:
- ST2752UX-US tiene `EvidenceRef[]` con `documentId: "SUNGROW-ST2752UX-V15"` para todos los campos eléctricos certificados.
- `npm run test` pasa.
- Mostrando un container BESS en la UI, al hacer click sobre un valor aparece la fuente (esto se implementa en Fase 11).

**Riesgos**:
- Confundir datasheet US con DE → mitigación: separar como variantes (`ST2752UX-US`, `ST2752UX-EU`).
- Falta de manual con clearances → mitigación: dejar `clearances` como `confidence: "missing"` o `assumption`.

**Dependencias**: Fase 1.

**Prioridad**: Crítica.

**No hacer todavía**: implementar UI para cables / switchgear. Conectar `mainTransformer` al layout. Implementar `BatteryHierarchy` (puede esperar).

---

## Fase 3 — Preset BESS del Desierto formalizado

**Objetivo**: convertir `src/data/projectCaseStudies/bessDelDesierto.ts` en un preset con evidencia documental completa y reproducible.

**Inputs**:
- `06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/BESS_DESIERTO_Analisis_Tecnico_App_Predimensionamiento.md` (documento ancla).
- 3 PDFs en `06_ANALISIS_TECNICO_BESS_DEL_DESIERTO/INFORMES_TECNICOS_CASO/`.
- Detalle en `07_PRESET_BESS_DEL_DESIERTO.md` de este plan.

**Tareas**:
1. Extender `bessDelDesierto.ts` con `designTargets` evidenciados (200 MW, 800 MWh comercial, 880.80384 MWh bruto, `usableFactor = 0.9083`).
2. Generar las 40 `ConversionStation`s con sus 8 containers asociados cada una.
3. Generar los 10 `MVFeeder`s con 4 estaciones cada uno (20 MVA).
4. Generar el sectioning center 33 kV y el POI BP5/BP6.
5. Generar `MainTransformer` como `scope: "external_reference"` con la inconsistencia 220/230 kV documentada.
6. Cargar `AuxiliaryServices` con valores del caso PMAX.
7. Cargar `PPC` con datos Bluence/Isotrol.
8. Generar `DocumentInconsistency[]` con: modelo container (ST2752UX vs ST2725UX), tensión BT (0.9 vs 0.69 kV), tensión AT (220 vs 230 kV).
9. Test fixture: cargar preset y validar 320 containers, 40 stations, 10 feeders, sectioning center, POI, KPIs.

**Archivos afectados**:
- 🔧 Modificado: `src/data/projectCaseStudies/bessDelDesierto.ts`.
- ✏️ Nuevo: `src/data/projectCaseStudies/bessDelDesiertoEvidence.ts` (referencias a documentos).
- ✏️ Test: `src/data/projectCaseStudies/bessDelDesierto.test.ts`.

**Criterios de aceptación**:
- Cargar preset reproduce el resumen ejecutivo del documento ancla.
- Todas las inconsistencias internas aparecen como `DocumentInconsistency`.
- Tests pasan.

**Dependencias**: Fases 1, 2.

**Prioridad**: Alta.

**No hacer todavía**: optimizar layout. Generar planos.

---

## Fase 4 — Calculadora técnica MW/MWh

**Objetivo**: implementar el sizing engine completo: dado `targetPowerMW` y/o `targetUsableEnergyMWh`, calcular cantidad de containers, stations, feeders, y MWh bruto/usable/duración.

**Inputs**:
- Reglas de dimensionamiento §8 del documento ancla.
- Reglas en `09_MATRIZ_REGLAS_CANDIDATAS.md`.

**Tareas**:
1. Ampliar `src/lib/sizing/preliminarySizing.ts` con `architectureSizing.ts`:
   - `containersForTargetEnergy(targetMWh, usableFactor, containerEnergyMWh)`.
   - `stationsForContainers(nContainers, containersPerStation = 8)`.
   - `stationsForPower(targetMW, stationMW = 5)`.
   - `feedersForStations(nStations, stationsPerFeeder = 4)`.
   - `durationFromUsableAndPower(usableMWh, powerMW)`.
2. UI: actualizar `BessQuickSizingPanel.tsx` para mostrar bruto/usable/comercial.
3. Tests: para input 200 MW/800 MWh devolver exactamente 320/40/10.

**Archivos afectados**:
- 🔧 Modificados: `src/lib/sizing/preliminarySizing.ts`, `src/components/sidebar/BessQuickSizingPanel.tsx`.
- ✏️ Nuevos: `src/lib/sizing/architectureSizing.ts`, `src/lib/sizing/architectureSizing.test.ts`.

**Criterios de aceptación**:
- Test `bess-del-desierto-sizing.test.ts` pasa con valores exactos.
- UI muestra distinción entre bruto / usable / comercial con badge de fuente.

**Dependencias**: Fases 1, 2, 3.

**Prioridad**: Alta.

---

## Fase 5 — Generador de bloques BESS

**Objetivo**: implementar generador automático de `BESSBlock[]` con 8 containers + 1 ConversionStation cada uno, dado un polígono y la cantidad objetivo.

**Inputs**:
- Reglas de layout §9 documento ancla.
- `LayoutZone[]` ya definidas (caminos, exclusiones).

**Tareas**:
1. Extender `src/lib/layout/preliminaryLayoutGenerator.ts` para que respete agrupación 8:1.
2. Implementar plantillas de bloque: configuración horizontal vs vertical, separaciones parametrizadas.
3. Validar dimensiones y orientación uniforme por bloque.

**Archivos afectados**:
- 🔧 Modificado: `src/lib/layout/preliminaryLayoutGenerator.ts`, `src/lib/layout/spacingRules.ts`.
- ✏️ Nuevo: `src/lib/layout/blockTemplates.ts`.

**Criterios de aceptación**:
- Para 40 bloques en un polígono adecuado se generan 40 stations + 320 containers correctamente agrupados.
- Tests pasan.

**Dependencias**: Fases 1, 4.

**Prioridad**: Alta.

---

## Fase 6 — Layout físico profesional con MVBus/POI

**Objetivo**: extender el layout con `LayoutZone(mv_yard)` para sectioning center + `LayoutZone(poi_yard)` para POI. Incluir corredores de cable (`CableRoute`) y caminos (`AccessRoad`) como capas.

**Tareas**:
1. UI: nuevo panel `MVArchitecturePanel` para ver/editar barras y POI.
2. `BessMap.tsx`: renderizar `mv_yard` y `poi_yard` como capas distintas.
3. Implementar `CableRoute` como `LineString` con ancho de corredor → renderizar como polígono parametrizado.
4. Implementar `AccessRoad` similar.
5. Validación: cables y caminos no colisionan con equipos sin clearance.

**Archivos afectados**:
- 🔧 Modificado: `src/components/map/BessMap.tsx`, `src/lib/layout/mapFeatures.ts`.
- ✏️ Nuevos: `src/components/sidebar/MVArchitecturePanel.tsx`, `src/lib/layout/cableRoutes.ts`, `src/lib/layout/accessRoads.ts`.

**Criterios de aceptación**:
- Caso BESS del Desierto se ve con sectioning center, barras BP5/BP6, POI 33 kV.
- Cables MT entre stations y sectioning aparecen como corredores.
- Camino perimetral del polígono se genera automáticamente con ancho configurable.

**Dependencias**: Fases 1, 2, 3, 5.

**Prioridad**: Alta.

---

## Fase 7 — Validaciones físicas extendidas

**Objetivo**: extender el motor de validación para incluir clearances datasheet, accesos, zonas de fire setback.

**Inputs**: `09_MATRIZ_REGLAS_CANDIDATAS.md` reglas físicas.

**Tareas**:
1. Implementar reglas en `src/rules/bessValidationEngine.ts`:
   - `RULE-PHYS-001`: separación container-container mínima.
   - `RULE-PHYS-002`: separación container-station.
   - `RULE-PHYS-003`: container debe tener acceso vehicular dentro de N metros.
   - `RULE-PHYS-004`: fire setback contra perímetro.
   - `RULE-PHYS-005`: corredor de cable sin solape con caminos.
2. UI: actualizar `WarningsPanel.tsx` para mostrar por categoría.

**Archivos afectados**: `src/rules/bessValidationEngine.ts`, `src/components/sidebar/WarningsPanel.tsx`.

**Criterios de aceptación**: layouts del preset pasan / fallan según reglas con explicación trazable.

**Dependencias**: Fases 1, 2, 5, 6.

**Prioridad**: Alta.

---

## Fase 8 — Validaciones eléctricas preliminares

**Objetivo**: implementar compatibilidad PCS↔transformador (ya existe parcial), agrupación 8:1 / 4:1 / 2x100 MVA, rangos de tensión (DC 1300-1500 V, BT 0,9 kV, MT 33 kV).

**Tareas**:
1. Extender `src/lib/electrical/compatibility.ts`.
2. Crear `src/lib/electrical/topologyValidation.ts`.
3. Reglas:
   - `RULE-ELEC-001`: containers/station ≤ 8 (default).
   - `RULE-ELEC-002`: stations/feeder ≤ 4 (default editable).
   - `RULE-ELEC-003`: tensión PCS DC dentro del rango del container.
   - `RULE-ELEC-004`: tensión LV PCS = tensión LV transformador bloque.

**Archivos afectados**: `src/lib/electrical/*.ts`, `src/rules/bessValidationEngine.ts`.

**Criterios de aceptación**: validaciones detectan inconsistencias de topología en preset modificado.

**Dependencias**: Fase 1, 7.

**Prioridad**: Media-alta.

---

## Fase 9 — Matriz normativa candidata con citas

**Objetivo**: construir la matriz formal de reglas normativas, una por una, con cita a página + numeral del PDF original.

**Inputs**: detalle de cada documento normativo en `02_MAPEO_DIRECTRICES_APPB.md` §3.2 a §3.5.

**Tareas**:
1. **Lectura humana** de cada PDF normativo prioritario:
   - `SEC_RGR_06_2024_BESS.pdf`
   - `SEC_RPTD_08_Proteccion_Incendios_2020.pdf`
   - `SEC_RPTD_07_Franja_Distancias_Seguridad_2022.pdf`
   - `CNE_NTSyCS_RES45_2026.pdf`
   - `CEN_Anexo_2_Requerimientos_Interconexion_NI_MR_MNR_2024.pdf`
   - `SEA_Criterio_Almacenamiento_Energia_DS17_2026.pdf`
   - `MINVU_DDU_522_BESS.pdf`
   - `DS_38_2011_MMA_Ruido.pdf`
2. Para cada artículo relevante, crear `RuleDefinition` con `evidence: [{ documentId, page, section, confidence: "documented" }]`.
3. Implementar `src/rules/regulatoryRulesCatalog.ts` con todas las reglas extraídas.
4. Cada regla declara `severity: blocking | warning | info | checklist | out_of_scope`.

**Archivos afectados**:
- ✏️ Nuevos: `src/rules/regulatoryRulesCatalog.ts`, `src/rules/profiles/chileGeneral.ts`, `src/rules/profiles/chileUtility.ts`.
- 🔧 Modificado: `src/rules/bessRegulatoryProfiles.ts`.

**Criterios de aceptación**:
- Cada regla tiene cita formal (documento + página).
- `09_MATRIZ_REGLAS_CANDIDATAS.md` actualizado con IDs reales.

**Dependencias**: Fases 0, 1.

**Prioridad**: Media (porque requiere lectura humana de muchos PDFs; se puede iterar).

---

## Fase 10 — Motor de validaciones normativas

**Objetivo**: ejecutar las reglas de Fase 9 sobre el proyecto y reportar violaciones.

**Tareas**:
1. Implementar `src/rules/bessValidationEngine.ts` con `evaluateRules(project, profile): RuleViolation[]`.
2. UI: extender `WarningsPanel` para mostrar `category` y `evidence` por regla.
3. Implementar `RegulatoryCompliancePanel.tsx` para vista normativa dedicada.

**Archivos afectados**: `src/rules/bessValidationEngine.ts`, `src/components/sidebar/WarningsPanel.tsx`, `src/components/sidebar/RegulatoryCompliancePanel.tsx`.

**Criterios de aceptación**: con preset BESS del Desierto, el motor reporta violaciones esperadas (ej. falta separación, falta camino, fire setback insuficiente).

**Dependencias**: Fases 1, 7, 9.

**Prioridad**: Media.

---

## Fase 11 — Reporte técnico exportable

**Objetivo**: producir reporte HTML+PDF profesional con todas las secciones (`04_MODELO_DATOS_PROPUESTO.md` §7).

**Tareas**:
1. Crear `src/lib/report/buildReport.ts` que produce `TechnicalReport`.
2. Crear `src/components/report/ReportPreview.tsx` y `src/components/report/ReportExportButton.tsx`.
3. Implementar generador HTML → PDF (vía `react-pdf` o `puppeteer` server-side; recomendado client-side print-to-PDF).
4. Plantilla con secciones:
   - Resumen ejecutivo (KPIs principales con `confidence`).
   - Intent del diseño.
   - Inventario de equipos con evidencia.
   - Layout físico (snapshot del mapa).
   - Arquitectura eléctrica (unifilar simplificado).
   - SSAA y pérdidas.
   - Resultados de validación.
   - Supuestos (lista con risk + fuente).
   - Exclusiones (12+ items).
   - Checklist de ingeniería de detalle.
   - Pendientes documentales.
   - Inconsistencias documentales del caso.
   - Referencias documentales (toda evidencia citada).
5. Disclaimer obligatorio en portada y pie.

**Archivos afectados**:
- ✏️ Nuevos: `src/lib/report/buildReport.ts`, `src/components/report/`, `src/data/engineeringChecklist.ts`.

**Criterios de aceptación**:
- Reporte exportado del preset BESS del Desierto incluye todos los KPIs y todas las secciones.
- Disclaimer aparece en portada y pie.
- Locale respetado.

**Dependencias**: Fases 1, 3, 4, 7, 8, 10.

**Prioridad**: Alta.

---

## Fase 12 — QA, pruebas y documentación

**Objetivo**: estabilizar y documentar.

**Tareas**:
1. Tests E2E con fixture BESS del Desierto.
2. Documentar uso en `docs/`.
3. Onboarding para nuevos contribuidores (`docs/onboarding.md`).
4. Revisión de seguridad documental (no exponer rutas a PDFs internos en producción).

**Archivos afectados**: `tests/`, `docs/`.

**Criterios de aceptación**: cobertura ≥ 70% en `src/lib/` y `src/rules/`.

**Dependencias**: todas las anteriores.

**Prioridad**: Alta al cierre.

---

## Diagrama de dependencias

```
Fase 0  (planificación)
   │
   ▼
Fase 1  Modelo de datos + EvidenceRef
   │
   ├──▶ Fase 2  Catálogo con datasheets
   │      │
   │      ├──▶ Fase 3  Preset BESS del Desierto
   │      │      │
   │      │      ├──▶ Fase 4  Sizing engine
   │      │      │      │
   │      │      │      ├──▶ Fase 5  Generador bloques
   │      │      │      │      │
   │      │      │      │      ▼
   │      │      │      │   Fase 6  Layout MV/POI
   │      │      │      │      │
   │      │      │      │      ▼
   │      │      │      │   Fase 7  Validaciones físicas
   │      │      │      │      │
   │      │      │      │      ▼
   │      │      │      │   Fase 8  Validaciones eléctricas
   │      │      │      │
   │      ▼      ▼      ▼
   │   Fase 9  Matriz normativa (lectura humana de PDFs)
   │      │
   │      ▼
   │   Fase 10  Motor validaciones normativas
   │
   └──▶ Fase 11  Reporte técnico  ←─── (todas las anteriores)
              │
              ▼
        Fase 12  QA + docs
```

---

## Resumen ejecutivo de fases

| Fase | Esfuerzo (S/M/L) | Riesgo | Bloqueante para |
|---|---|---|---|
| 0 | S | Bajo | Todas |
| 1 | M | Medio | 2..11 |
| 2 | M | Medio (lectura humana de PDFs) | 4..11 |
| 3 | M | Bajo | 4, 11 |
| 4 | M | Bajo | 5..11 |
| 5 | M | Medio (algoritmo de packing) | 6, 7 |
| 6 | L | Medio | 7, 11 |
| 7 | M | Bajo | 11 |
| 8 | M | Bajo | 11 |
| 9 | L | Alto (depende de lectura humana de muchos PDFs) | 10 |
| 10 | M | Bajo | 11 |
| 11 | L | Alto (reporte profesional complejo) | — |
| 12 | M | Bajo | — |
